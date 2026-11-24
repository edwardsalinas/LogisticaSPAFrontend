import { parseVoiceConfirmation } from '../voiceConfirm';
import { StopError } from '../guidedForms';
import { cleanName, cleanText, isCancel, isSkip, matchOption, parseSpokenNumber, parseSpokenPhone } from '../speechParse';

const LIST_PATH = '/logistics/packages';
const MAX_TRIES = 3;

const listOf = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`);

/**
 * Los campos que Logi pregunta, en orden. Cada paso sabe qué pregunta, cómo entender la respuesta (parse devuelve el valor
 * o null si no la entendió) y cómo confirmarla en voz alta. `options` solo en los campos de lista (ciudades).
 */
export const STEPS = [
  {
    field: 'origen', kind: 'select', required: true,
    ask: (_, form) => { const o = form.getOptions?.('origen') ?? []; return o.length ? `¿De dónde sale? Tengo viajes desde ${listOf(o)}.` : '¿De dónde sale?'; },
    retry: (_, form) => { const o = form.getOptions?.('origen') ?? []; return o.length ? `No encontré esa ciudad. Dime una de estas: ${listOf(o)}.` : 'No te entendí. ¿De dónde sale?'; },
    parse: (heard, form) => matchOption(heard, form.getOptions?.('origen') ?? []),
    echo: (v) => `Origen: ${v}.`,
  },
  {
    field: 'destino', kind: 'select', required: true,
    ask: (_, form) => { const o = form.getOptions?.('destino') ?? []; return o.length ? `¿A dónde va? Desde ahí tengo viajes a ${listOf(o)}.` : '¿A dónde va?'; },
    retry: (_, form) => { const o = form.getOptions?.('destino') ?? []; return o.length ? `No encontré ese destino. Dime uno de estos: ${listOf(o)}.` : 'No te entendí. ¿A dónde va?'; },
    parse: (heard, form) => matchOption(heard, form.getOptions?.('destino') ?? []),
    echo: (v) => `Destino: ${v}.`,
  },
  {
    // el formulario exige remitente: Logi lo toma como remitente sin cuenta (solo su nombre), igual que «Que Logi lo haga»
    field: 'sender_name', kind: 'text', required: true,
    prepare: (form) => form.setValue('is_guest', true),
    ask: () => '¿Quién lo envía? Dime el nombre del remitente.',
    retry: () => 'No te entendí el nombre del remitente. Dímelo otra vez, por favor.',
    parse: (heard) => cleanName(heard),
    echo: (v) => `Lo envía ${v}.`,
  },
  {
    field: 'peso', kind: 'text', required: true,
    ask: () => '¿Cuántos kilos pesa?',
    retry: () => 'No te entendí el peso. Dime solo el número de kilos, por ejemplo: tres y medio.',
    parse: (heard) => { const n = parseSpokenNumber(heard); return n && n <= 5000 ? String(n) : null; },
    echo: (v) => `${v} kilos.`,
  },
  {
    field: 'recipient_name', kind: 'text', required: true,
    ask: () => '¿A nombre de quién va? Dime el nombre de quien recibe.',
    retry: () => 'No te entendí el nombre. Dímelo otra vez, por favor.',
    parse: (heard) => cleanName(heard),
    echo: (v) => `Para ${v}.`,
  },
  {
    field: 'recipient_phone', kind: 'text', required: false,
    ask: () => '¿Tiene teléfono? Dímelo, o di «ninguno».',
    retry: () => 'No pude entender el número. Dímelo dígito por dígito, o di «ninguno».',
    parse: (heard) => parseSpokenPhone(heard),
    echo: (v) => `Teléfono ${v}.`,
  },
  {
    field: 'description', kind: 'text', required: false,
    ask: () => '¿Qué contiene? Dímelo, o di «ninguno».',
    retry: () => 'No te entendí. ¿Qué contiene? O di «ninguno».',
    parse: (heard) => cleanText(heard),
    echo: (v) => `Contenido: ${v}.`,
  },
];

/** El resumen que Logi lee antes de preguntar «¿lo registro?». Función pura para probarla. */
export const summarize = (v) => {
  const parts = [`Paquete de ${v.origen} a ${v.destino}, de ${v.peso} kilos, de parte de ${v.sender_name}, para ${v.recipient_name}`];
  if (v.recipient_phone) parts.push(`teléfono ${v.recipient_phone}`);
  if (v.description) parts.push(`contenido: ${v.description}`);
  return `${parts.join(', ')}.`;
};

/**
 * Ayuda guiada por voz para registrar un paquete. A diferencia de «Que Logi lo haga» (que ya trae todos los datos), aquí
 * Logi va a Paquetes, abre el formulario y PREGUNTA campo por campo, escribiendo cada respuesta a la vista de todos.
 * La persona puede corregir escribiendo en cualquier momento (la pantalla no se bloquea). Al final lee el resumen y pregunta
 * «¿lo registro?»: solo con un «sí» claro (o con el botón) se envía el formulario normal, el mismo que usaría la persona,
 * con los mismos permisos y validaciones del servidor. Con «cancela» o tras varios silencios, el formulario queda abierto.
 *
 * io.listen(signal): escucha UNA respuesta y devuelve el texto, o null si hubo silencio.
 */
export default async function assistPackage(ctx, io) {
  const say = (text, opts) => ctx.say(text, { untilSpoken: true, ...opts });
  try {
    await say('Claro, te ayudo a registrar un paquete. Voy a Paquetes y te voy preguntando los datos.');

    if (!ctx.getForm('package')) {
      if (window.location.pathname !== LIST_PATH) ctx.navigate(LIST_PATH);
      const open = await ctx.waitFor(() => ctx.findVisible('[data-logi="nuevo-paquete"]'), 10000);
      await ctx.pointAt(open);
      await ctx.press(open);
    }
    const form = await ctx.waitFor(() => ctx.getForm('package'), 8000);

    const values = {};
    for (const step of STEPS) {
      if (step.prepare) { step.prepare(form); await ctx.sleep(400); } // el formulario dibuja los campos nuevos
      const el = await ctx.waitFor(() => form.getElement(step.field), 4000);
      let outcome = 'retry';
      for (let attempt = 0; attempt < MAX_TRIES && outcome === 'retry'; attempt += 1) {
        await ctx.pointAt(el);
        await say(attempt === 0 ? step.ask(values, form) : step.retry(values, form));
        const heard = await io.listen(ctx.signal);
        if (heard == null) continue; // silencio: se vuelve a preguntar
        if (isCancel(heard)) { await say('Está bien, lo dejo aquí. El formulario queda abierto por si quieres seguir tú.'); return { assisted: true, done: false }; }
        if (!step.required && isSkip(heard)) { outcome = 'skip'; break; }
        const value = step.parse(heard, form);
        if (value == null) continue;
        values[step.field] = value;
        if (step.kind === 'select') { form.setValue(step.field, value); await ctx.sleep(600); } else await ctx.typeInto(form, step.field, value);
        await say(step.echo(value), { wait: false });
        outcome = 'ok';
      }
      if (outcome === 'retry') { // no hubo forma de entender: no se insiste más
        await say('No logro entender. Dejo el formulario abierto para que lo completes tú, y cuando termines pulsa Registrar.', { mood: 'worried' });
        return { assisted: true, done: false };
      }
    }

    const submit = ctx.findVisible('form button[type="submit"]');
    if (submit) await ctx.pointAt(submit);
    await say(`${summarize(values)} ¿Lo registro?`);
    const heard = await io.listen(ctx.signal);
    const answer = heard == null ? null : parseVoiceConfirmation(heard);
    if (answer !== 'yes') {
      await say(answer === 'no'
        ? 'Listo, no lo registro. Puedes corregir lo que quieras en pantalla.'
        : 'Lo dejo listo en pantalla: cuando quieras, pulsa Registrar.');
      return { assisted: true, done: false };
    }

    const button = ctx.findVisible('form button[type="submit"]');
    if (!button) { await say('No encuentro el botón Registrar. Pulsa el botón del formulario.', { mood: 'worried' }); return { assisted: true, done: false }; }
    await ctx.press(button); // el envío es el del formulario normal, con las mismas validaciones y permisos
    try {
      await ctx.waitFor(() => !ctx.getForm('package'), 9000); // el formulario se cierra cuando se registró
    } catch {
      await say('Falta algo para poder registrarlo. Revisa lo que quedó marcado en la pantalla.', { mood: 'worried' });
      return { assisted: true, done: false };
    }
    await say('¡Listo! Registré el paquete.', { mood: 'happy' });
    return { assisted: true, done: true, values };
  } catch (e) {
    if (e instanceof StopError) throw e;
    await ctx.say('Algo falló en la pantalla. Puedes seguir tú con el formulario.', { mood: 'worried' }).catch(() => {});
    return { assisted: true, done: false, error: e };
  }
}
