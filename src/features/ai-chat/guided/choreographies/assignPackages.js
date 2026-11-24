import { emitGuided, GUIDED_EVENTS, StopError } from '../guidedForms';

const LIST_PATH = '/logistics/packages';

/** Hasta cuántos paquetes se muestran uno a uno (más se confirman con el botón de siempre: serían minutos de animación). */
export const MAX_GUIDED_ITEMS = 3;

/**
 * Asignar paquetes a un viaje como lo haría una persona: en Paquetes, por cada uno pulsa «Vincular» (en Carga suelta),
 * elige el despacho en la lista y «pulsa» Confirmar Asignación. Solo el último paso (confirmar la propuesta en el
 * servidor, que asigna todos juntos) cambia datos: si detienen a Logi o algo falla antes, no queda nada a medias.
 */
export default async function assignPackages(ctx, action) {
  const { route_id: routeId, route_text: routeText, items } = action.ui.fill.values;
  try {
    const que = items.length === 1 ? `el paquete ${items[0].tracking_code}` : `${items.length} paquetes`;
    await ctx.say(`Voy a asignar ${que} al viaje ${routeText}. Mira cómo lo hago.`, { wait: true });

    if (window.location.pathname !== LIST_PATH) {
      await ctx.say('Primero voy a Paquetes.');
      ctx.navigate(LIST_PATH);
    }

    for (const [i, item] of items.entries()) {
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
      if (i < items.length - 1) {
        emitGuided(GUIDED_EVENTS.cancelForm); // cierra este formulario para seguir con el siguiente paquete
        await ctx.waitFor(() => !ctx.getForm('assignment'), 4000);
      }
    }
  } catch (e) {
    if (e instanceof StopError) throw e;
    await ctx.say('No pude seguir en pantalla; lo asigno directamente.', { wait: true });
    emitGuided(GUIDED_EVENTS.cancelForm);
  }

  const res = await ctx.confirm(action);
  emitGuided(GUIDED_EVENTS.changed);
  await ctx.say(`¡Listo! ${res?.result?.message ?? 'Paquetes asignados.'}`, { wait: true });
  return res;
}
