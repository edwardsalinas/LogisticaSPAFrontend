import { describe, expect, it } from 'vitest';
import { parseNavigation, parseVoiceCommand } from './voiceCommands';

const nav = (text, role = 'admin') => parseNavigation(text, role);

describe('parseNavigation: «llévame a…»', () => {
  it.each([
    ['llévame a Viajes', '/logistics/routes'],
    ['Abre Tracking', '/tracking'],
    ['ve a la pantalla de paquetes', '/logistics/packages'],
    ['muéstrame la flota', '/fleet'],
    ['quiero ver los reportes', '/analytics'],
    ['abre el dashboard', '/dashboard'],
    ['por favor llévame al panel principal', '/dashboard'],
    ['ve a la sección de seguimiento', '/tracking'],
    ['abre el uso de la IA', '/assistant/usage'],
    ['llévame al asistente', '/assistant'],
    ['oye logi abre las métricas', '/analytics'],
  ])('«%s» → %s', (text, to) => expect(nav(text)).toMatchObject({ kind: 'navigate', to }));

  it('los paquetes llevan a su lista operativa; «entregados» o «histórico» a su pestaña', () => {
    expect(nav('abre paquetes')).toMatchObject({ to: '/logistics/packages', tab: { page: 'packages', value: 'all' } });
    expect(nav('muéstrame los paquetes entregados')).toMatchObject({ to: '/logistics/packages', tab: { page: 'packages', value: 'delivered' } });
    expect(nav('ve al histórico')).toMatchObject({ to: '/logistics/packages', tab: { value: 'delivered' } }); // el único histórico de la aplicación es el de paquetes
    expect(nav('abre el histórico de paquetes')).toMatchObject({ tab: { value: 'delivered' } });
    expect(nav('muéstrame los despachos operativos')).toMatchObject({ tab: { page: 'packages', value: 'all' } });
  });

  it('la flota tiene pestañas de vehículos y de conductores', () => {
    expect(nav('muéstrame los conductores')).toMatchObject({ to: '/fleet', tab: { page: 'fleet', value: 'drivers' } });
    expect(nav('abre los vehículos')).toMatchObject({ to: '/fleet', tab: { page: 'fleet', value: 'vehicles' } });
    expect(nav('abre la flota')).toMatchObject({ to: '/fleet' });
  });

  it('cada rol navega solo a lo que ve: lo demás se rechaza con un motivo, no se navega', () => {
    expect(nav('llévame a la flota', 'logistics_operator')).toEqual({ kind: 'denied', label: 'la Flota' });
    expect(nav('abre los reportes', 'client')).toMatchObject({ kind: 'denied' });
    expect(nav('abre viajes', 'driver')).toMatchObject({ kind: 'denied' });
    expect(nav('abre tracking', 'client')).toMatchObject({ kind: 'navigate', to: '/tracking' });
    expect(nav('abre mis entregas', 'driver')).toMatchObject({ kind: 'navigate', to: '/driver' });
    expect(nav('llévame al inicio', 'driver')).toMatchObject({ to: '/driver' }); // «inicio» del conductor es su panel
    expect(nav('llévame al inicio', 'admin')).toMatchObject({ to: '/dashboard' });
  });

  it('PRUDENCIA: cualquier palabra que no es de navegación deja la frase para el asistente', () => {
    for (const text of [
      'muéstrame los paquetes pendientes de María',
      'abre el paquete TRK-1795',
      've a viajes de mañana a Oruro',
      'dame el resumen del día',
      'muéstrame cuántos paquetes hay',
      'quiero ver dónde está mi paquete',
      'dame los paquetes que salen hoy',
      'abre viajes y dime cuánto espacio hay',
    ]) expect(nav(text), text).toBeNull();
  });

  it('sin verbo, sin destino o con frases largas no es una orden', () => {
    for (const text of ['viajes', 'paquetes entregados', 'llévame', 'abre', '', 'hola logi', '¿qué viajes hay?']) expect(nav(text), text).toBeNull();
    expect(nav('abre ' + 'la '.repeat(9) + 'flota')).toBeNull();
  });
});

describe('parseVoiceCommand: otras órdenes', () => {
  it('cerrar el chat de voz', () => {
    for (const text of ['cierra', 'salir', 'gracias', 'hasta luego', 'listo gracias', 'eso es todo', 'adiós logi', 'ok cierra el chat de voz']) {
      expect(parseVoiceCommand(text, 'admin'), text).toEqual({ kind: 'close', say: 'Hasta luego.' });
    }
    // «gracias» dentro de una pregunta no cierra nada
    expect(parseVoiceCommand('gracias, ¿y dónde está mi paquete?', 'admin')).toBeNull();
    expect(parseVoiceCommand('cierra el viaje de mañana', 'admin')).toBeNull();
  });

  it('pausar y reanudar el paseo de Logi', () => {
    for (const text of ['quédate quieto', 'no camines', 'deja de caminar', 'para de caminar logi']) expect(parseVoiceCommand(text, 'admin')).toMatchObject({ kind: 'walk', on: false });
    for (const text of ['camina', 'ya puedes caminar', 'pasea otra vez', 'vuelve a caminar']) expect(parseVoiceCommand(text, 'admin')).toMatchObject({ kind: 'walk', on: true });
    expect(parseVoiceCommand('el camión camina por la ruta de mañana', 'admin')).toBeNull();
  });

  it('activar y apagar los avisos', () => {
    for (const text of ['no me avises', 'desactiva los avisos', 'apaga los avisos', 'silencia los avisos']) expect(parseVoiceCommand(text, 'admin')).toMatchObject({ kind: 'alerts', on: false });
    for (const text of ['avísame', 'activa los avisos', 'vuelve a avisarme']) expect(parseVoiceCommand(text, 'admin')).toMatchObject({ kind: 'alerts', on: true });
  });

  it('una pregunta normal NO es una orden', () => {
    for (const text of ['¿qué viajes hay mañana?', 'crea un paquete de La Paz a Oruro', 'dame el resumen del día', 'ayúdame a registrar un evento', 'hola']) {
      expect(parseVoiceCommand(text, 'admin'), text).toBeNull();
    }
  });

  it('la navegación también pasa por parseVoiceCommand', () => {
    expect(parseVoiceCommand('llévame a Viajes', 'admin')).toMatchObject({ kind: 'navigate', to: '/logistics/routes', say: 'Voy a Viajes.' });
  });
});
