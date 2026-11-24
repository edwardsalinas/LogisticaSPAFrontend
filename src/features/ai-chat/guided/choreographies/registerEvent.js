import { emitGuided, GUIDED_EVENTS, StopError } from '../guidedForms';

const TRACKING_PATH = '/tracking';

/** Un solo paquete por evento: con varios, la animación se haría muy larga (se confirman con el botón de siempre). */
export const MAX_GUIDED_EVENT_ITEMS = 1;

const STATUS_LABEL = {
  pendiente: 'Pendiente',
  asignado: 'Asignado',
  en_transito: 'En tránsito',
  en_agencia: 'En agencia',
  entregado: 'Entregado',
  siniestro: 'Siniestro',
};

/**
 * Registrar un evento de seguimiento como lo haría una persona: en Tracking pulsa «Registrar Evento», elige el paquete y
 * el estado, indica la ubicación y «pulsa» Guardar. Solo el último paso (confirmar la propuesta en el servidor) cambia
 * datos: si detienen a Logi o algo falla antes, no queda nada a medias.
 */
export default async function registerEvent(ctx, action) {
  const { status, observations, items } = action.ui.fill.values;
  const item = items[0];
  const label = STATUS_LABEL[status] ?? status;
  try {
    await ctx.say(`Voy a registrar un evento: el paquete ${item.tracking_code} pasa a ${label}. Mira cómo lo hago.`, { wait: true });

    if (!ctx.getForm('event')) {
      if (window.location.pathname !== TRACKING_PATH) {
        await ctx.say('Primero voy a Tracking.');
        ctx.navigate(TRACKING_PATH);
      }
      const open = await ctx.waitFor(() => ctx.findVisible('[data-logi="nuevo-evento"]'), 10000);
      await ctx.pointAt(open);
      await ctx.say('Abro el formulario de eventos.');
      await ctx.press(open);
    }
    const form = await ctx.waitFor(() => ctx.getForm('event'), 8000);

    const packageSelect = await ctx.waitFor(() => form.getElement('package_id'), 3000);
    await ctx.pointAt(packageSelect);
    await ctx.say(`Paquete: ${item.tracking_code}`);
    form.setValue('package_id', item.package_id);
    await ctx.sleep(550);

    const statusSelect = await ctx.waitFor(() => form.getElement('status'), 3000);
    await ctx.pointAt(statusSelect);
    await ctx.say(`Estado: ${label}`);
    form.setValue('status', status);
    await ctx.sleep(550);

    const where = await ctx.waitFor(() => form.getElement('location'), 3000);
    await ctx.pointAt(where);
    await ctx.say('Ubicación: la última conocida del paquete');
    form.setValue('lat', String(item.lat));
    form.setValue('lng', String(item.lng));
    await ctx.sleep(700);

    if (observations) await ctx.say(`Nota: ${observations}`, { wait: true }); // el formulario no tiene campo de nota: solo se cuenta

    const submit = ctx.findVisible('form button[type="submit"]');
    if (submit) {
      await ctx.pointAt(submit);
      await ctx.say('Todo listo. Guardo el evento.');
      await ctx.press(submit, { click: false }); // solo se ve la pulsación; el registro real es la confirmación del servidor
    }
  } catch (e) {
    if (e instanceof StopError) throw e;
    await ctx.say('No pude seguir en pantalla; lo registro directamente.', { wait: true });
    emitGuided(GUIDED_EVENTS.cancelForm);
  }

  const res = await ctx.confirm(action);
  emitGuided(GUIDED_EVENTS.changed);
  await ctx.say(`¡Listo! ${res?.result?.message ?? 'Evento registrado.'}`, { wait: true });
  return res;
}
