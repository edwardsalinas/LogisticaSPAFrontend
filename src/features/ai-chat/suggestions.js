/** Preguntas sugeridas según el rol: qué se le puede preguntar al asistente. */
const CLIENT = [
  { icon: '🗓️', label: '¿Qué viajes hay esta semana?', value: '¿Qué viajes hay esta semana y cuánto espacio queda?' },
  { icon: '📦', label: '¿Qué paquetes tengo?', value: '¿Qué paquetes tengo?' },
  { icon: '📍', label: '¿Dónde está mi último paquete?', value: '¿Dónde está mi último paquete?' },
  { icon: '🚚', label: '¿Cuáles están en tránsito?', value: '¿Cuáles de mis paquetes están en tránsito?' },
  { icon: '✅', label: '¿Ya se entregó algo?', value: '¿Ya se entregó alguno de mis paquetes?' },
];

const DRIVER = [
  { icon: '🗓️', label: '¿Qué entregas tengo hoy?', value: '¿Qué entregas tengo hoy?' },
  { icon: '🛣️', label: '¿Cuál es mi próxima ruta?', value: '¿Cuál es mi próxima ruta y qué paquetes llevo?' },
  { icon: '✅', label: 'Entregar un paquete', value: 'Entrega el paquete TRK-', prefill: true },
  { icon: '📦', label: 'Paquetes de mis rutas', value: '¿Qué paquetes están en mis rutas?' },
];

const OPERATIONS = [
  { icon: '📊', label: '¿Cómo va la operación hoy?', value: '¿Cómo va la operación hoy?' },
  { icon: '⚠️', label: '¿Qué tengo que atender?', value: '¿Qué paquetes tengo que atender? ¿Hay siniestros o retrasos?' },
  { icon: '📍', label: 'Ubicar un paquete', value: '¿Dónde está el paquete TRK-', prefill: true },
  { icon: '🔎', label: 'Buscar por nombre', value: 'Busca el paquete a nombre de ', prefill: true },
  { icon: '🛣️', label: 'Rutas en tránsito', value: '¿Qué rutas están en tránsito ahora?' },
  { icon: '🗓️', label: 'Viajes con espacio', value: '¿Qué viajes hay el viernes de 3 a 5 de la tarde y cuánto espacio tienen?' },
  { icon: '➕', label: 'Crear un paquete', value: 'Crea un paquete de ', prefill: true },
  { icon: '📝', label: 'Registrar un evento', value: 'Registra que el paquete TRK-', prefill: true },
];

const ADMIN_EXTRA = [{ icon: '🚛', label: '¿Qué vehículos hay disponibles?', value: '¿Qué vehículos tengo disponibles y cuántos conductores?' }];

export const suggestionsForRole = (role) => {
  if (role === 'driver') return DRIVER;
  if (role === 'admin') return [...OPERATIONS, ...ADMIN_EXTRA];
  if (role === 'logistics_operator') return OPERATIONS;
  return CLIENT;
};

/** Mensaje de entrada de la conversación, según el rol. */
export const introForRole = (role) => {
  if (role === 'driver') return 'Pregúntame por tus entregas de hoy, tu próxima ruta o el estado de los paquetes que llevas.';
  if (role === 'admin' || role === 'logistics_operator') {
    return 'Pregúntame por cualquier paquete, cómo va la operación o qué hay que atender. También puedo preparar acciones (crear un paquete, registrar un evento, entregar) que tú confirmas antes de ejecutarlas.';
  }
  return 'Pregúntame dónde está tu paquete, en qué estado está, quién lo lleva y cuándo llega.';
};
