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

describe('parseFilter: filtrar la tabla de Paquetes por voz', () => {
  const f = (t, role = 'admin') => parseVoiceCommand(t, role);
  it.each([
    ['filtra por Oruro', 'oruro'],
    ['busca el paquete de María', 'maria'],
    ['busca TRK-123', 'trk-123'],
    ['muéstrame los paquetes pendientes', 'pendiente'],
    ['muéstrame los paquetes de Oruro por favor', 'oruro'],
    ['filtra los paquetes en tránsito', 'en transito'],
  ])('«%s» filtra por «%s»', (frase, texto) => {
    expect(f(frase)).toMatchObject({ kind: 'filter', page: 'packages', to: '/logistics/packages', text: texto });
  });
  it('«quita el filtro» y «muéstrame todos los paquetes» lo limpian', () => {
    expect(f('quita el filtro')).toMatchObject({ kind: 'filter', text: '' });
    expect(f('muéstrame todos los paquetes')).toMatchObject({ kind: 'filter', text: '' });
  });
  it('las preguntas NO son filtros: van al asistente', () => {
    for (const q of ['¿cuántos paquetes hay en Oruro?', 'busca qué paquetes llegaron hoy', 'muéstrame los paquetes que están atrasados hoy', 'dónde está el paquete de María', 'muéstrame algo', 'muéstrame los paquetes pendientes de María']) {
      expect(f(q), q).toBeNull();
    }
  });
  it('un conductor no tiene Paquetes: se le dice que no está disponible', () => {
    expect(f('filtra por Oruro', 'driver')).toMatchObject({ kind: 'denied' });
    expect(f('quita el filtro', 'driver')).toBeNull();
  });
});

describe('parseFilter en todas las pantallas', () => {
  const f = (t, role = 'admin') => parseVoiceCommand(t, role);
  it('«filtra los viajes por Oruro» filtra Viajes, y los conductores abren esa pestaña de Flota', () => {
    expect(f('filtra los viajes por Oruro')).toMatchObject({ kind: 'filter', page: 'routes', to: '/logistics/routes', text: 'oruro' });
    expect(f('busca los conductores Pérez')).toMatchObject({ kind: 'filter', page: 'fleet', tab: 'drivers', text: 'perez' });
    expect(f('busca los vehículos 123')).toMatchObject({ kind: 'filter', page: 'fleet', tab: 'vehicles' });
  });
  it('sin decir qué, se filtra la pantalla en la que se está', () => {
    window.history.pushState({}, '', '/logistics/routes');
    expect(f('filtra por Sucre')).toMatchObject({ page: 'routes', text: 'sucre' });
    expect(f('quita el filtro')).toMatchObject({ page: 'routes', text: '' });
    window.history.pushState({}, '', '/');
  });
  it('cada rol solo filtra lo que ve: el operador no tiene Flota; el cliente no tiene Viajes', () => {
    expect(f('filtra los conductores Pérez', 'logistics_operator')).toMatchObject({ kind: 'denied' });
    expect(f('filtra los viajes por Oruro', 'client')).toMatchObject({ kind: 'denied' });
  });
});

describe('seguridad: el filtro por voz ignora nombres heredados', () => {
  it('«busca constructor» filtra por ese texto (no por una función del lenguaje)', () => {
    const r = parseVoiceCommand('busca constructor', 'admin');
    expect(r).toMatchObject({ kind: 'filter', page: 'packages', text: 'constructor' });
    expect(typeof r.text).toBe('string');
    expect(parseVoiceCommand('filtra por tostring', 'admin').text).toBe('tostring');
  });
});
