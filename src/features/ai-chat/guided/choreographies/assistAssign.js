import { parseVoiceConfirmation } from '../voiceConfirm';
import { isCancel, normalize, parseSpokenNumber } from '../speechParse';
import { localHour, tripText } from '../tripText';
import { soundMatches } from '../contactMatch';

const MAX_TRIES = 3;
const ORDINALS = [['primero', 'primer', 'uno', '1'], ['segundo', 'dos', '2'], ['tercero', 'tercer', 'tres', '3'], ['cuarto', 'cuatro', '4']];

/** Qué paquete pendiente es: por los últimos dígitos del código («cuarenta y cinco treinta y uno») o por el nombre. */
export const findPackages = (heard, packages) => {
  const text = normalize(heard);
  const digits = text.replace(/[^0-9]/g, '');
  if (digits.length >= 3) {
    const byCode = packages.filter((p) => String(p.tracking_code ?? '').replace(/[^0-9a-z]/gi, '').toLowerCase().endsWith(digits) || String(p.tracking_code ?? '').toLowerCase().includes(digits));
    if (byCode.length) return byCode;
  }
  const tokens = text.split(' ').filter((t) => t.length >= 3 && !['paquete', 'para', 'del', 'los', 'las', 'que', 'con', 'nombre', 'recibe', 'envia', 'senor', 'senora'].includes(t));
  if (!tokens.length) return [];
  const exact = packages.filter((p) => {
    const hay = normalize(`${p.recipient_name ?? ''} ${p.sender_name ?? ''}`);
    return tokens.every((t) => hay.includes(t));
  });
  if (exact.length) return exact;
  // el micrófono suele entender mal los nombres propios («kispe» por «Quispe»): segunda pasada comparando cómo SUENAN
  return packages.filter((p) => soundMatches(tokens, `${p.recipient_name ?? ''} ${p.sender_name ?? ''}`));
};

/** «el primero», «el segundo», «el de las ocho»: el índice elegido entre n opciones, o -1. */
export const pickIndex = (heard, options, hourOf) => {
  const t = normalize(heard);
  for (const [i, words] of ORDINALS.entries()) {
    if (i < options.length && words.some((w) => new RegExp(`(^| )${w}( |$)`).test(t))) return i;
  }
  if (hourOf) {
    const n = parseSpokenNumber(t.replace(/\b(el|la|de|las|a)\b/g, ' '));
    if (n != null) {
      const hits = options.map((o, i) => [i, hourOf(o)]).filter(([, h]) => h === n || h % 12 === n % 12);
      if (hits.length === 1) return hits[0][0];
    }
  }
  return -1;
};

const pkgText = (p) => `${p.tracking_code}, de ${p.origen} a ${p.destino}, de ${p.peso} kilos, para ${p.recipient_name}`;

/**
 * Ayuda por voz para asignar un paquete a un viaje, sin que la persona tenga que dar códigos: Logi pregunta qué paquete
 * (por nombre o por los últimos números del código), busca entre los pendientes y propone los viajes planeados de ese mismo
 * trayecto, que se eligen con «el primero» o «el de las ocho». Solo CONVERSA y prepara la propuesta en el servidor (que
 * vuelve a comprobar espacio y estado); después el chat de voz la hace a la vista de todos con «Que Logi lo haga», que es
 * quien confirma. Devuelve { proposal } o nada si la persona cancela o no hay forma.
 *
 * io.listen(signal) escucha una respuesta; io.api = { getPackages, getRoutes, prepareAssignment }.
 */
export default async function assistAssign(ctx, io) {
  const say = (text, opts) => ctx.say(text, { untilSpoken: true, ...opts });
  const ask = async (question, retry, parse) => {
    for (let attempt = 0; attempt < MAX_TRIES; attempt += 1) {
      await say(attempt === 0 ? question : retry);
      const heard = await io.listen(ctx.signal);
      if (heard == null) continue;
      if (isCancel(heard)) return { cancel: true };
      const value = await parse(heard);
      if (value != null) return { value };
    }
    return { giveUp: true };
  };
  const bail = async (text) => { await say(text); return { assisted: true, done: false }; };

  const [pkgRes, routeRes] = await Promise.all([io.api.getPackages(), io.api.getRoutes()]);
  const loose = (pkgRes?.data ?? []).filter((p) => p.status === 'pendiente' && !p.route_id);
  if (!loose.length) return bail('No tienes paquetes pendientes de asignar.');

  // 1) ¿qué paquete?
  const chosen = await ask(
    'Claro. ¿Qué paquete quieres asignar? Dime el nombre de quien recibe o los últimos números del código.',
    'No encontré ese paquete entre los pendientes. Dímelo otra vez: el nombre o los últimos números del código.',
    async (heard) => {
      const found = findPackages(heard, loose);
      if (found.length === 0) return null;
      if (found.length === 1) {
        await say(`Encontré el paquete ${pkgText(found[0])}. ¿Es ese?`);
        const yes = await io.listen(ctx.signal);
        return yes != null && parseVoiceConfirmation(yes) === 'yes' ? found[0] : null;
      }
      const top = found.slice(0, 3);
      await say(`Encontré ${found.length}: ${top.map((p, i) => `${['el primero', 'el segundo', 'el tercero'][i]}, ${pkgText(p)}`).join('. ')}. ¿Cuál?`);
      const pick = await io.listen(ctx.signal);
      const i = pick == null ? -1 : pickIndex(pick, top);
      return i >= 0 ? top[i] : null;
    },
  );
  if (chosen.cancel) return bail('Está bien, lo dejo aquí.');
  if (chosen.giveUp) return bail('No logro encontrar el paquete. Búscalo en Paquetes y asígnalo desde ahí.');
  const pkg = chosen.value;

  // 2) ¿a qué viaje? Solo los planeados del mismo trayecto que aún no salieron
  const now = Date.now();
  const trips = (routeRes?.data ?? [])
    .filter((r) => r.status === 'planeada' && r.origin === pkg.origen && r.destination === pkg.destino && Date.parse(r.departure_time) > now)
    .sort((a, b) => Date.parse(a.departure_time) - Date.parse(b.departure_time))
    .slice(0, 4);
  if (!trips.length) return bail(`No hay viajes planeados de ${pkg.origen} a ${pkg.destino}. Primero hay que agendar uno en Viajes.`);

  let trip;
  if (trips.length === 1) {
    await say(`Hay un viaje: ${tripText(trips[0])}. ¿Lo asigno ahí?`);
    const yes = await io.listen(ctx.signal);
    if (yes == null || parseVoiceConfirmation(yes) !== 'yes') return bail('Está bien, no lo asigno.');
    [trip] = trips;
  } else {
    const names = trips.map((t, i) => `${['el primero', 'el segundo', 'el tercero', 'el cuarto'][i]}, ${tripText(t)}`);
    const picked = await ask(
      `Hay ${trips.length} viajes: ${names.join('. ')}. ¿A cuál lo asigno?`,
      `No te entendí. Dime «el primero», «el segundo» o la hora de salida.`,
      (heard) => { const i = pickIndex(heard, trips, (t) => localHour(t.departure_time)); return i >= 0 ? trips[i] : null; },
    );
    if (picked.cancel) return bail('Está bien, lo dejo aquí.');
    if (picked.giveUp) return bail('No logré entender el viaje. Puedes asignarlo desde Paquetes.');
    trip = picked.value;
  }

  // 3) el servidor comprueba espacio y estado y prepara la propuesta; si no cabe, lo dice
  try {
    const res = await io.api.prepareAssignment({ route_ref: trip.route_code || trip.id, codes: [pkg.tracking_code] });
    const proposal = res?.data?.action;
    if (!proposal) return bail('No pude preparar esa asignación.');
    await say('Perfecto, lo hago ahora.', { wait: false });
    return { assisted: true, done: true, proposal };
  } catch (e) {
    return bail(e?.message ? `No pude asignarlo: ${e.message}` : 'No pude preparar esa asignación.');
  }
}
