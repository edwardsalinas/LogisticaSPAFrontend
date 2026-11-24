import { emitGuided, GUIDED_EVENTS, StopError } from '../guidedForms';

const LIST_PATH = '/logistics/packages';

/**
 * Cuántos paquetes se muestran uno a uno. Si la acción trae más, los primeros se animan y Logi avisa que hace lo mismo con el
 * resto de una vez (serían minutos de animación); la confirmación en el servidor es una sola para todos.
 */
export const MAX_GUIDED_ITEMS = 3;

/**
 * Asignar paquetes a un viaje como lo haría una persona: en Paquetes, por cada uno pulsa «Vincular» (en Carga suelta),
 * elige el despacho en la lista y «pulsa» Confirmar Asignación. Solo el último paso (confirmar la propuesta en el
 * servidor, que asigna todos juntos) cambia datos: si detienen a Logi o algo falla antes, no queda nada a medias.
 */
export default async function assignPackages(ctx, action) {
  const { route_id: routeId, route_text: routeText, items } = action.ui.fill.values;
  const shown = items.slice(0, MAX_GUIDED_ITEMS);
  const rest = items.length - shown.length;
  try {
    const que = items.length === 1 ? `el paquete ${items[0].tracking_code}` : `${items.length} paquetes`;
    await ctx.say(`Voy a asignar ${que} al viaje ${routeText}. ${rest > 0 ? `Te muestro ${shown.length === 1 ? 'el primero' : `los primeros ${shown.length}`}.` : 'Mira cómo lo hago.'}`, { wait: true });

    if (window.location.pathname !== LIST_PATH) {
      await ctx.say('Primero voy a Paquetes.');
      ctx.navigate(LIST_PATH);
    }

    for (const [i, item] of shown.entries()) {
      const link = await ctx.waitFor(() => ctx.findVisible(`[data-logi-vincular="${item.tracking_code}"]`), 10000);
      await ctx.pointAt(link);
      await ctx.say(`Vinculo ${item.tracking_code}`);
      await ctx.press(link);

      const form = await ctx.waitFor(() => ctx.getForm('assignment'), 8000);
      const select = await ctx.waitFor(() => form.getElement('routeId'), 4000);
      await ctx.pointAt(select);
      if ([...select.options].some((o) => o.value === routeId)) {
        await ctx.say(`Elijo el viaje ${routeText}`);
        form.setValue('routeId', routeId);
        await ctx.sleep(600);
      } else {
        // el formulario solo lista viajes del mismo trayecto; la propuesta ya avisó de la diferencia
        await ctx.say('Ese viaje no está en la lista de este paquete (otro trayecto), pero es el que pediste.', { wait: true });
      }

      const submit = ctx.findVisible('form button[type="submit"]');
      if (submit) {
        await ctx.pointAt(submit);
        await ctx.say('Confirmo la asignación.');
        await ctx.press(submit, { click: false }); // solo se ve la pulsación; la asignación real es la confirmación del servidor
      }
      if (i < shown.length - 1) {
        emitGuided(GUIDED_EVENTS.cancelForm); // cierra este formulario para seguir con el siguiente paquete
        await ctx.waitFor(() => !ctx.getForm('assignment'), 4000);
      }
    }
    if (rest > 0) await ctx.say(`Los otros ${rest} paquetes los asigno igual, de una vez.`, { wait: true });
  } catch (e) {
    if (e instanceof StopError) throw e;
    await ctx.say('No pude seguir en pantalla; lo asigno directamente.', { wait: true, mood: 'worried' });
    ctx.fallback();
    emitGuided(GUIDED_EVENTS.cancelForm);
  }

  if (ctx.demo) return ctx.finishDemo(); // «Enséñame»: no se confirma nada

  const res = await ctx.confirm(action);
  emitGuided(GUIDED_EVENTS.changed);
  await ctx.say(`¡Listo! ${res?.result?.message ?? 'Paquetes asignados.'}`, { wait: true, mood: 'happy' });
  return res;
}
