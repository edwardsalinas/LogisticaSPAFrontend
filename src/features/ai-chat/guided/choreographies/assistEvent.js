import { parseVoiceConfirmation } from '../voiceConfirm';
import { cleanText, isCancel, isSkip, normalize } from '../speechParse';
import { findPackages, pickIndex } from './assistAssign';

const MAX_TRIES = 3;
const FINAL = ['entregado', 'devuelto', 'cancelado'];
const STATUS_TEXT = { en_transito: 'en tránsito', en_agencia: 'en agencia', siniestro: 'siniestro' };

/** «en tránsito», «llegó a la agencia», «hubo un accidente» → el estado del evento, o null. */
export const parseEventStatus = (heard) => {
  const t = normalize(heard);
  if (/\b(siniestro|accidente|dano|danado|danada|perdido|perdida|perdio|robo|robaron|choque)\b/.test(t)) return 'siniestro';
  if (/\b(agencia|sucursal|oficina|almacen|bodega)\b/.test(t)) return 'en_agencia';
  if (/\b(transito|camino|ruta|viajando|salio|sale|en viaje)\b/.test(t)) return 'en_transito';
  return null;
};

const pkgText = (p) => `${p.tracking_code}, de ${p.origen} a ${p.destino}, para ${p.recipient_name}`;

/**
 * Ayuda por voz para registrar un evento de seguimiento. Logi pregunta qué paquete (por nombre o por los últimos números del
 * código), qué pasó (en tránsito, en agencia o siniestro) y una nota opcional; el servidor prepara la propuesta (mismos permisos y
 * comprobaciones que el asistente) y, con un «sí», el chat de voz la hace a la vista de todos. Solo CONVERSA y prepara: no
 * registra nada por sí misma. Devuelve { proposal } o nada si la persona cancela o no hay forma.
 *
 * io.listen(signal) escucha una respuesta; io.api = { getPackages, prepareEvent }.
 */
export default async function assistEvent(ctx, io) {
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

  const pkgRes = await io.api.getPackages();
  const open = (pkgRes?.data ?? []).filter((p) => !FINAL.includes(p.status));
  if (!open.length) return bail('No hay paquetes a los que se pueda registrar un evento.');

  // 1) ¿a qué paquete?
  const chosen = await ask(
    'Claro. ¿A qué paquete le registro el evento? Dime el nombre de quien recibe o los últimos números del código.',
    'No encontré ese paquete. Dímelo otra vez: el nombre o los últimos números del código.',
    async (heard) => {
      const found = findPackages(heard, open);
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
  if (chosen.giveUp) return bail('No logro encontrar el paquete. Puedes registrar el evento desde Tracking.');
  const pkg = chosen.value;

  // 2) ¿qué pasó?
  const st = await ask(
    '¿Qué pasó con el paquete? Puede estar en tránsito, en agencia, o haber tenido un siniestro.',
    'No te entendí. Dime «en tránsito», «en agencia» o «siniestro».',
    (heard) => parseEventStatus(heard),
  );
  if (st.cancel) return bail('Está bien, lo dejo aquí.');
  if (st.giveUp) return bail('No logré entender el estado. Puedes registrarlo desde Tracking.');
  const status = st.value;

  // 3) nota opcional
  let note;
  await say('¿Quieres agregar una nota? Dímela, o di «ninguna».');
  const heardNote = await io.listen(ctx.signal);
  if (heardNote != null) {
    if (isCancel(heardNote)) return bail('Está bien, lo dejo aquí.');
    if (!isSkip(heardNote)) note = cleanText(heardNote) ?? undefined;
  }

  // 4) el servidor comprueba permisos y estado y prepara la propuesta
  let proposal;
  try {
    const res = await io.api.prepareEvent({ codes: [pkg.tracking_code], status, ...(note ? { note } : {}) });
    proposal = res?.data?.action;
  } catch (e) {
    return bail(e?.message ? `No pude registrarlo: ${e.message}` : 'No pude preparar ese evento.');
  }
  if (!proposal) return bail('No pude preparar ese evento.');

  await say(`Voy a registrar que el paquete ${pkg.tracking_code} está ${STATUS_TEXT[status]}${note ? `, con la nota: ${note}` : ''}. ¿Lo hago?`);
  const yes = await io.listen(ctx.signal);
  if (yes == null || parseVoiceConfirmation(yes) !== 'yes') return bail('Está bien, no lo registro.');
  await say('Perfecto, lo hago ahora.', { wait: false });
  return { assisted: true, done: true, proposal };
}
