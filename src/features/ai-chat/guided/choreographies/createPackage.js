import { emitGuided, GUIDED_EVENTS, StopError } from '../guidedForms';

const LIST_PATH = '/logistics/packages';

/**
 * Qué campos llena Logi y en qué orden, a partir de los datos de la propuesta (los mismos que muestra el resumen).
 * Es una función pura para poder probarla sin pantalla.
 */
export const fieldPlan = (v) => {
  const plan = [
    { field: 'origen', kind: 'select', value: v.origen, say: `Origen: ${v.origen}` },
    { field: 'destino', kind: 'select', value: v.destino, say: `Destino: ${v.destino}` },
  ];
  if (v.route_id) plan.push({ field: 'route_id', kind: 'select', value: v.route_id, say: 'Lo agendo en el viaje que elegiste' });
  if (v.sender_name) {
    plan.push({ field: 'is_guest', kind: 'toggle', value: true, say: 'El remitente no está registrado' });
    plan.push({ field: 'sender_name', kind: 'text', value: v.sender_name, say: `Remitente: ${v.sender_name}` });
    if (v.sender_phone) plan.push({ field: 'sender_phone', kind: 'text', value: v.sender_phone, say: 'Su teléfono' });
  }
  plan.push({ field: 'recipient_name', kind: 'text', value: v.recipient_name, say: `Quien recibe: ${v.recipient_name}` });
  if (v.recipient_phone) plan.push({ field: 'recipient_phone', kind: 'text', value: v.recipient_phone, say: 'Su teléfono' });
  plan.push({ field: 'peso', kind: 'text', value: String(v.peso), say: `Peso: ${v.peso} kilos` });
  if (v.description) plan.push({ field: 'description', kind: 'text', value: v.description, say: `Contenido: ${v.description}` });
  return plan.filter((s) => s.value !== undefined && s.value !== null && s.value !== '');
};

/**
 * Registrar un paquete como lo haría una persona: va a Paquetes, abre el formulario, lo llena campo por campo y «pulsa»
 * Registrar. Lo único que cambia la base de datos es el último paso (confirmar la propuesta en el servidor), así que si
 * la persona detiene a Logi o algo falla antes, no queda nada creado ni a medias. Si la pantalla no responde, se
 * registra directamente (con aviso) en vez de dejar la tarea sin hacer.
 */
export default async function createPackage(ctx, action) {
  const values = action.ui.fill.values;
  try {
    await ctx.say(`Voy a registrar un paquete de ${values.origen} a ${values.destino}. Mira cómo lo hago.`, { wait: true });

    if (!ctx.getForm('package')) {
      if (window.location.pathname !== LIST_PATH) {
        await ctx.say('Primero voy a Paquetes.');
        ctx.navigate(LIST_PATH);
      }
      const open = await ctx.waitFor(() => ctx.findVisible('[data-logi="nuevo-paquete"]'), 10000);
      await ctx.pointAt(open);
      await ctx.say('Abro el formulario.');
      await ctx.press(open);
    }
    const form = await ctx.waitFor(() => ctx.getForm('package'), 8000);

    for (const step of fieldPlan(values)) {
      if (step.kind === 'toggle') {
        form.setValue(step.field, step.value);
        await ctx.sleep(350); // el formulario dibuja los campos nuevos
      }
      const el = await ctx.waitFor(() => form.getElement(step.field), 2500);
      await ctx.pointAt(el);
      await ctx.say(step.say);
      if (step.kind === 'text') await ctx.typeInto(form, step.field, step.value);
      else if (step.kind === 'select') { form.setValue(step.field, step.value); await ctx.sleep(550); }
    }

    const submit = ctx.findVisible('form button[type="submit"]');
    if (submit) {
      await ctx.pointAt(submit);
      await ctx.say('Todo listo. Lo registro.');
      await ctx.press(submit, { click: false }); // solo se ve la pulsación; el envío real es la confirmación del servidor
    }
  } catch (e) {
    if (e instanceof StopError) throw e;
    await ctx.say('No pude seguir en pantalla; lo registro directamente.', { wait: true });
    emitGuided(GUIDED_EVENTS.cancelForm);
  }

  const res = await ctx.confirm(action);
  emitGuided(GUIDED_EVENTS.packageCreated);
  await ctx.say(`¡Listo! ${res?.result?.message ?? 'Paquete registrado.'}`, { wait: true });
  return res;
}
