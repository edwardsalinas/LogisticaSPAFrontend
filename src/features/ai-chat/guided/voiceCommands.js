import { normalize } from './speechParse';

/**
 * Mando por voz de la aplicación: «llévame a Viajes», «muéstrame los paquetes entregados», «abre la flota», «quédate quieto»,
 * «cierra». Se interpreta en el navegador, sin gastar una consulta al asistente.
 *
 * Es PRUDENTE a propósito: una frase solo es una orden si TODAS sus palabras son de navegación (el verbo, la pantalla y relleno como
 * «la», «a», «por favor»). Cualquier palabra de más —«muéstrame los paquetes pendientes de María»— la deja pasar al asistente, que
 * contesta preguntas. Es preferible no entender una orden y que la atienda el asistente que navegar por una frase mal interpretada.
 */
const STAFF = ['admin', 'logistics_operator'];

// Las pantallas y cómo se les llama. `roles` repite el menú de la aplicación: ningún rol navega a lo que no ve.
const PAGES = [
  { key: 'dashboard', to: '/dashboard', label: 'el panel principal', roles: STAFF, names: ['dashboard', 'panel principal', 'pagina principal', 'inicio', 'resumen', 'principal'] },
  { key: 'driver', to: '/driver', label: 'tu viaje', roles: ['driver'], names: ['mi viaje', 'mis entregas', 'entregas', 'panel del conductor', 'mi panel', 'inicio', 'principal'] },
  { key: 'packages', to: '/logistics/packages', label: 'Paquetes', roles: [...STAFF, 'client'], names: ['paquetes', 'envios', 'encomiendas', 'despachos'] },
  { key: 'routes', to: '/logistics/routes', label: 'Viajes', roles: STAFF, names: ['viajes', 'rutas'] },
  { key: 'tracking', to: '/tracking', label: 'Tracking', roles: [...STAFF, 'client'], names: ['tracking', 'seguimiento', 'rastreo'] },
  { key: 'fleet', to: '/fleet', label: 'la Flota', roles: ['admin'], names: ['flota', 'vehiculos', 'camiones', 'unidades', 'conductores'] },
  { key: 'analytics', to: '/analytics', label: 'Reportes', roles: ['admin'], names: ['reportes', 'analitica', 'analiticas', 'metricas', 'estadisticas'] },
  { key: 'usage', to: '/assistant/usage', label: 'el uso de la IA', roles: ['admin'], names: ['uso de la ia', 'uso del asistente', 'consumo de la ia'] },
  { key: 'assistant', to: '/assistant', label: 'el asistente', roles: [...STAFF, 'client', 'driver'], names: ['asistente', 'modo ia', 'chat'] },
];

// pestañas de algunas pantallas (el valor es el que guarda la pantalla)
const TABS = [
  { page: 'packages', value: 'delivered', label: 'el histórico de entregados', names: ['historico', 'historial', 'entregados', 'entregas hechas'] },
  { page: 'packages', value: 'all', label: 'los despachos en operación', names: ['operativos', 'operativo', 'en operacion', 'activos'] },
  { page: 'fleet', value: 'vehicles', label: 'los vehículos', names: ['vehiculos', 'camiones', 'unidades'] },
  { page: 'fleet', value: 'drivers', label: 'los conductores', names: ['conductores'] },
];

const VERB = /^(?:(?:por favor|oye|ok|logi|bueno|y|ahora|entonces)\s+)*(?:llevame|llevarme|me llevas|ve|vete|ir|vamos|abre|abrir|abreme|muestrame|mostrar|mostrarme|ensename|quiero ver|necesito ver|quiero ir|puedes abrir|puedes mostrarme|podrias abrir|podrias mostrarme|dame)\b\s*(.*)$/;
const FILLER = new Set(['a', 'al', 'la', 'las', 'el', 'lo', 'los', 'del', 'de', 'en', 'un', 'una', 'mi', 'mis', 'tu', 'pantalla', 'seccion', 'pagina', 'modulo', 'vista', 'pestana', 'apartado', 'lista', 'por', 'favor', 'ahora', 'otra', 'vez', 'logi', 'ya', 'te', 'me', 'ver', 'ir', 'hacia', 'para', 'quiero', 'necesito']);

const wordsOf = (page) => [...page.names, ...TABS.filter((t) => t.page === page.key).flatMap((t) => t.names)].flatMap((n) => n.split(' '));
const KNOWN = new Set([...FILLER, ...PAGES.flatMap(wordsOf), ...TABS.flatMap((t) => t.names.flatMap((n) => n.split(' ')))]);

const has = (text, phrase) => new RegExp(`(^| )${phrase}( |$)`).test(text);

/** Interpreta una frase de navegación. Devuelve { kind: 'navigate' | 'denied', ... } o null si no es una orden de navegación. */
export const parseNavigation = (text, role) => {
  const t = normalize(text).replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();
  const m = VERB.exec(t);
  if (!m) return null;
  const rest = m[1].trim();
  if (!rest) return null; // «llévame» sin decir a dónde
  const tokens = rest.split(' ');
  if (tokens.length > 8 || tokens.some((w) => !KNOWN.has(w))) return null; // una palabra que no es de navegación: es una pregunta, no una orden

  // 1) pestaña concreta («los paquetes entregados», «el histórico», «los conductores»)
  for (const tab of TABS) {
    if (!tab.names.some((n) => has(rest, n))) continue;
    // «unidades»/«vehículos» sin más son la flota; «entregas» del conductor son su panel: solo cuenta la pestaña dentro de su pantalla
    const page = PAGES.find((p) => p.key === tab.page);
    const mentionsPage = page.names.some((n) => has(rest, n)) || tab.names.some((n) => has(rest, n));
    if (!mentionsPage) continue;
    if (!page.roles.includes(role)) return { kind: 'denied', label: page.label };
    return { kind: 'navigate', to: page.to, tab: { page: page.key, value: tab.value }, say: `Voy a ${tab.label}.` };
  }
  // 2) pantalla (los nombres largos primero: «uso de la ia» antes que «ia»)
  const candidates = PAGES.flatMap((p) => p.names.map((n) => ({ p, n }))).sort((a, b) => b.n.length - a.n.length);
  const hit = candidates.filter(({ p, n }) => has(rest, n) && p.roles.includes(role))[0] ?? candidates.find(({ n }) => has(rest, n));
  if (!hit) return null;
  if (!hit.p.roles.includes(role)) return { kind: 'denied', label: hit.p.label };
  return { kind: 'navigate', to: hit.p.to, ...(hit.p.key === 'packages' ? { tab: { page: 'packages', value: 'all' } } : {}), say: `Voy a ${hit.p.label}.` };
};

// ---- filtrar la tabla de Paquetes: «filtra por Oruro», «busca el paquete de María», «muéstrame los paquetes pendientes», «quita el filtro»
const STATUS_WORDS = { pendientes: 'pendiente', pendiente: 'pendiente', asignados: 'asignado', asignado: 'asignado', 'en transito': 'en transito' };
const NOT_A_FILTER = /\b(cuantos|cuantas|cual|cuales|que|quien|quienes|donde|como|cuando|por que|hay|tengo|tenemos|esta|estan|llego|salio|falta|faltan)\b/;
const CLEAR_FILTER = /^(?:(?:por favor|ok|logi|ya|ahora)\s+)*(?:quita|quitar|borra|borrar|limpia|limpiar|elimina|saca|sacar)\s+(?:el |los |la )?(?:filtros?|busqueda)(?:\s+(?:por favor|logi))?$|^(?:(?:por favor|ok|logi|ahora)\s+)*(?:muestrame|mostrar|ver|quiero ver)\s+todos?\s+(?:los\s+)?paquetes$/;
const FILTER = /^(?:(?:por favor|oye|ok|logi|bueno|y|ahora|entonces)\s+)*(filtra|filtrar|filtrame|busca|buscar|buscame|encuentra|encuentrame|muestrame|mostrar|mostrarme|ensename|quiero ver|necesito ver|ver)\s+(?:(?:el|la|los|las|un|una)\s+)?(paquetes?|envios?|despachos?)?\s*(?:(?:filtrados?|filtrado)\s+)?(?:por|de|del|para|a|hacia|desde|con destino a|con origen en|que dicen|que sean|que digan)?\s*(.+)$/;

/** «Filtra Paquetes por esto»: devuelve { kind: 'filter', page, to, text, say } o { kind: 'clearFilter', ... } o null. */
export const parseFilter = (text, role) => {
  const t = normalize(text).replace(/[.,;]/g, ' ').replace(/\s+/g, ' ').trim();
  const packages = PAGES.find((p) => p.key === 'packages');
  if (CLEAR_FILTER.test(t)) {
    return packages.roles.includes(role) ? { kind: 'filter', page: 'packages', to: packages.to, text: '', say: 'Quité el filtro: ves todos los paquetes.' } : null;
  }
  const m = FILTER.exec(t);
  if (!m) return null;
  const [, verb, noun] = m;
  let term = m[3].replace(/\s+(?:por favor|logi|gracias)$/, '').trim();
  const needsNoun = /^(muestrame|mostrar|mostrarme|ensename|quiero ver|necesito ver|ver)$/.test(verb); // «muéstrame…» solo es filtro si habla de paquetes
  if ((needsNoun && !noun) || !term || term.split(' ').length > 4 || NOT_A_FILTER.test(t)) return null;
  if (/ (?:de|del|y|con|en|para|que|por) /.test(` ${term} `.replace(/^ en transito /, ' ')) && term !== 'en transito') return null; // dos criterios («pendientes de María»): eso lo resuelve el asistente, no un filtro
  term = STATUS_WORDS[term] ?? term;
  if (/^trk /.test(term)) term = term.replace(/ /g, '-'); // un código de rastreo lleva guiones (normalize los volvió espacios)
  if (!packages.roles.includes(role)) return { kind: 'denied', label: packages.label };
  return { kind: 'filter', page: 'packages', to: packages.to, text: term, say: `Listo, filtré Paquetes por «${term}».` };
};

const SHORT = (t, max) => t.split(' ').length <= max;
const CLOSE_WORDS = new Set(['ok', 'logi', 'bueno', 'muy', 'bien', 'ya', 'cierra', 'cerrar', 'salir', 'sal', 'terminar', 'termina', 'adios', 'chao', 'hasta', 'luego', 'listo', 'gracias', 'eso', 'es', 'todo', 'nada', 'mas', 'el', 'chat', 'de', 'voz', 'la', 'por', 'favor', 'ahora']);

/**
 * Cualquier orden de voz: navegación, «cierra», pausar o reanudar el paseo de Logi, y activar o apagar los avisos.
 * Devuelve { kind, ...datos } o null (entonces la frase es para el asistente).
 */
export const parseVoiceCommand = (text, role) => {
  const nav = parseNavigation(text, role);
  if (nav) return nav;
  const filter = parseFilter(text, role);
  if (filter) return filter;
  const t = normalize(text).replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;

  // «cierra», «gracias, cierra», «listo, eso es todo»: solo palabras de despedida (cualquier otra, y es para el asistente)
  if (SHORT(t, 7) && t.split(' ').every((w) => CLOSE_WORDS.has(w)) && /(cierra|cerrar|salir|sal|termina|terminar|adios|chao|luego|listo|gracias|todo|mas)/.test(t)) {
    return { kind: 'close', say: 'Hasta luego.' };
  }
  if (SHORT(t, 6) && /(quedate quiet[oa]|no camines|deja de caminar|para de caminar|ya no camines|detente|pausa el paseo|no te muevas)/.test(t)) {
    return { kind: 'walk', on: false, say: 'Me quedo quieto.' };
  }
  if (SHORT(t, 6) && /^(?:(?:ok|logi|ya|puedes)\s+)*(?:camina|pasea|vuelve a caminar|puedes caminar)(?:\s+(?:logi|otra vez|de nuevo))*$/.test(t)) {
    return { kind: 'walk', on: true, say: 'Voy a pasear.' };
  }
  if (SHORT(t, 7) && /(no me avises|desactiva los avisos|apaga los avisos|silencia los avisos|sin avisos|deja de avisarme)/.test(t)) {
    return { kind: 'alerts', on: false, say: 'Listo, no te avisaré.' };
  }
  if (SHORT(t, 7) && /(^avisame|activa los avisos|enciende los avisos|vuelve a avisarme|ya puedes avisarme)/.test(t)) {
    return { kind: 'alerts', on: true, say: 'Listo, te avisaré cuando haya algo importante.' };
  }
  return null;
};
