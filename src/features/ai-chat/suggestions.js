import {
  AlertTriangle, BarChart3, CalendarDays, CheckCircle2, MapPin, Package, PackageCheck, PackagePlus, PenLine,
  Route, Search, Sunrise, TrendingUp, Truck, Warehouse,
} from 'lucide-react';

/** Preguntas sugeridas según el rol: qué se le puede preguntar al asistente. `icon` es un componente de lucide. */
const CLIENT = [
  { icon: CalendarDays, label: '¿Qué viajes hay esta semana?', value: '¿Qué viajes hay esta semana y cuánto espacio queda?' },
  { icon: Package, label: '¿Qué paquetes tengo?', value: '¿Qué paquetes tengo?' },
  { icon: MapPin, label: '¿Dónde está mi último paquete?', value: '¿Dónde está mi último paquete?' },
  { icon: Truck, label: '¿Cuáles están en tránsito?', value: '¿Cuáles de mis paquetes están en tránsito?' },
  { icon: CheckCircle2, label: '¿Ya se entregó algo?', value: '¿Ya se entregó alguno de mis paquetes?' },
];

const DRIVER = [
  { icon: CalendarDays, label: '¿Qué entregas tengo hoy?', value: '¿Qué entregas tengo hoy?' },
  { icon: Route, label: '¿Cuál es mi próxima ruta?', value: '¿Cuál es mi próxima ruta y qué paquetes llevo?' },
  { icon: CheckCircle2, label: 'Entregar un paquete', value: 'Entrega el paquete TRK-', prefill: true },
  { icon: Package, label: 'Paquetes de mis rutas', value: '¿Qué paquetes están en mis rutas?' },
];

const OPERATIONS = [
  { icon: Sunrise, label: 'Resumen del día', value: 'Dame el resumen del día: ¿por dónde empiezo?' },
  { icon: BarChart3, label: '¿Cómo va la operación hoy?', value: '¿Cómo va la operación hoy?' },
  { icon: TrendingUp, label: 'Balance del mes', value: '¿Cómo fue el último mes? ¿Quién entrega mejor?' },
  { icon: AlertTriangle, label: '¿Qué tengo que atender?', value: '¿Qué paquetes tengo que atender? ¿Hay siniestros o retrasos?' },
  { icon: MapPin, label: 'Ubicar un paquete', value: '¿Dónde está el paquete TRK-', prefill: true },
  { icon: Search, label: 'Buscar por nombre', value: 'Busca el paquete a nombre de ', prefill: true },
  { icon: Route, label: 'Rutas en tránsito', value: '¿Qué rutas están en tránsito ahora?' },
  { icon: CalendarDays, label: 'Viajes con espacio', value: '¿Qué viajes hay el viernes de 3 a 5 de la tarde y cuánto espacio tienen?' },
  { icon: PackagePlus, label: 'Crear un paquete', value: 'Crea un paquete de ', prefill: true },
  { icon: PackageCheck, label: 'Entregar varios', value: 'Entrega los paquetes TRK-', prefill: true },
  { icon: PenLine, label: 'Registrar un evento', value: 'Registra que el paquete TRK-', prefill: true },
];

const ADMIN_EXTRA = [{ icon: Warehouse, label: '¿Qué vehículos hay disponibles?', value: '¿Qué vehículos tengo disponibles y cuántos conductores?' }];

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
    return 'Pregúntame por cualquier paquete, el resumen del día o qué hay que atender. También puedo preparar acciones (crear, asignar a un viaje, registrar un evento, entregar; incluso varios paquetes a la vez) que tú confirmas antes de ejecutarlas.';
  }
  return 'Pregúntame dónde está tu paquete, en qué estado está, quién lo lleva y cuándo llega.';
};
