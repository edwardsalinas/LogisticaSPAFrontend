import { emitGuided, GUIDED_EVENTS, StopError } from '../guidedForms';

const DRIVER_PATH = '/driver';

/** Cuántos paquetes se muestran uno a uno; si hay más, Logi hace lo mismo con el resto de una vez (una sola confirmación). */
export const MAX_GUIDED_DELIVER_ITEMS = 3;

/**
 * Entregar paquetes como lo haría el conductor: en su pantalla, por cada paquete pulsa «Entregar», escribe la nota y
 * «pulsa» Confirmar entrega. Solo el último paso (confirmar la propuesta en el servidor, que entrega todos juntos) cambia
 * datos: si detienen a Logi o algo falla antes, no queda nada entregado a medias. Si el viaje no está en curso (no hay botón
 * «Entregar»), se entrega directamente con aviso.
 */
export default async function deliverPackages(ctx, action) {
  const { note, items } = action.ui.fill.values;
  const shown = items.slice(0, MAX_GUIDED_DELIVER_ITEMS);
  const rest = items.length - shown.length;
  try {
    const que = items.length === 1 ? `el paquete ${items[0].tracking_code}` : `${items.length} paquetes`;
    await ctx.say(`Voy a entregar ${que}. ${rest > 0 ? `Te muestro ${shown.length === 1 ? 'el primero' : `los primeros ${shown.length}`}.` : 'Mira cómo lo hago.'}`, { wait: true });

    if (window.location.pathname !== DRIVER_PATH) {
      await ctx.say('Primero voy a tu panel de viaje.');
      ctx.navigate(DRIVER_PATH);
    }

    for (const [i, item] of shown.entries()) {
      const deliver = await ctx.waitFor(() => ctx.findVisible(`[data-logi-entregar="${item.tracking_code}"]`), 12000);
      await ctx.pointAt(deliver);
      await ctx.say(`Entrego ${item.tracking_code}`);
      await ctx.press(deliver);

      const form = await ctx.waitFor(() => ctx.getForm('delivery'), 8000);
      if (note) {
        const noteField = await ctx.waitFor(() => form.getElement('note'), 4000);
        await ctx.pointAt(noteField);
        await ctx.say(`Nota: ${note}`);
        await ctx.typeInto(form, 'note', note);
      }
      const confirmButton = await ctx.waitFor(() => form.getElement('submit'), 4000);
      await ctx.pointAt(confirmButton);
      await ctx.say('Confirmo la entrega.');
      await ctx.press(confirmButton, { click: false }); // solo se ve la pulsación; la entrega real es la confirmación del servidor

      if (i < shown.length - 1) {
        emitGuided(GUIDED_EVENTS.cancelForm); // cierra este formulario para seguir con el siguiente paquete
        await ctx.waitFor(() => !ctx.getForm('delivery'), 4000);
      }
    }
    if (rest > 0) await ctx.say(`Los otros ${rest} paquetes los entrego igual, de una vez.`, { wait: true });
  } catch (e) {
    if (e instanceof StopError) throw e;
    await ctx.say('No pude seguir en pantalla; lo entrego directamente.', { wait: true });
    emitGuided(GUIDED_EVENTS.cancelForm);
  }

  const res = await ctx.confirm(action);
  emitGuided(GUIDED_EVENTS.changed);
  await ctx.say(`¡Listo! ${res?.result?.message ?? 'Paquetes entregados.'}`, { wait: true });
  return res;
}
