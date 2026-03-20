import { useEffect, useState } from 'react';
import { MapPinned, Route, Search, Truck } from 'lucide-react';
import Badge from '../../../components/atoms/Badge';
import Button from '../../../components/atoms/Button';
import SearchInput from '../../../components/atoms/SearchInput';
import BaseMap from '../../../components/molecules/BaseMap';
import CheckpointMarker from '../../../components/molecules/CheckpointMarker';
import EmptyState from '../../../components/molecules/EmptyState';
import MapLegend from '../../../components/molecules/MapLegend';
import Modal from '../../../components/molecules/Modal';
import RoutePath from '../../../components/molecules/RoutePath';
import StatCard from '../../../components/molecules/StatCard';
import VehicleMarker from '../../../components/molecules/VehicleMarker';
import PageSkeleton from '../../../components/organisms/PageSkeleton';
import { heroImages } from '../../../constants/heroImages';
import apiService from '../../../services/apiService';
import RouteCard from '../components/RouteCard';
import RouteForm from '../components/RouteForm';
import RouteInfoPanel from '../components/RouteInfoPanel';

const MOCK_ROUTES = [
  { id: 'route-001', route_code: 'RT-001', origin: 'La Paz', destination: 'Oruro', driver_name: 'Juan Perez', vehicle_brand: 'Volvo', plate_number: 'INT-1234', status: 'active', progress: 65, next_checkpoint: 'Centro Logistico El Alto', eta: '14:30', eta_minutes: 25, remaining_distance: 45.2, driver_phone: '+591 70012345', checkpoints: [{ id: 'cp-001', name: 'Terminal La Paz', lat: -16.5, lng: -68.1193, sequence_order: 1 }, { id: 'cp-002', name: 'Checkpoint El Alto', lat: -16.51, lng: -68.15, sequence_order: 2 }, { id: 'cp-003', name: 'Puesto Viacha', lat: -16.65, lng: -68.31, sequence_order: 3 }, { id: 'cp-004', name: 'Terminal Oruro', lat: -17.9833, lng: -67.15, sequence_order: 4 }], vehicle_position: { lat: -16.58, lng: -68.25 } },
  { id: 'route-002', route_code: 'RT-002', origin: 'Santa Cruz', destination: 'Cochabamba', driver_name: 'Maria Lopez', vehicle_brand: 'Mercedes', plate_number: 'ABC-5678', status: 'delayed', progress: 45, next_checkpoint: 'Sacaba', eta: '16:00', eta_minutes: 90, remaining_distance: 78.5, driver_phone: '+591 70054321', checkpoints: [{ id: 'cp-005', name: 'Terminal Santa Cruz', lat: -17.7833, lng: -63.1821, sequence_order: 1 }, { id: 'cp-006', name: 'Colomi', lat: -17.4167, lng: -66.2833, sequence_order: 2 }, { id: 'cp-007', name: 'Terminal Cochabamba', lat: -17.3895, lng: -66.1568, sequence_order: 3 }], vehicle_position: { lat: -17.55, lng: -65.8 } },
  { id: 'route-003', route_code: 'RT-003', origin: 'Sucre', destination: 'Potosi', driver_name: 'Carlos Ruiz', vehicle_brand: 'Ford', plate_number: 'XYW-9012', status: 'pending', progress: 0, next_checkpoint: 'Por asignar', eta: '--', eta_minutes: 0, remaining_distance: 0, driver_phone: '+591 70098765', checkpoints: [], vehicle_position: null },
];

function RoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await apiService.getRoutes();
      const realRoutes = res.data || [];
      setRoutes(realRoutes.length > 0 ? realRoutes : MOCK_ROUTES);
      if (!selectedRoute && (realRoutes[0] || MOCK_ROUTES[0])) setSelectedRoute(realRoutes[0] || MOCK_ROUTES[0]);
    } catch (err) {
      console.error('Error cargando rutas:', err);
      setRoutes(MOCK_ROUTES);
      if (!selectedRoute) setSelectedRoute(MOCK_ROUTES[0]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const filteredRoutes = routes.filter((route) => route.route_code?.toLowerCase().includes(searchTerm.toLowerCase()) || route.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) || route.origin?.toLowerCase().includes(searchTerm.toLowerCase()) || route.destination?.toLowerCase().includes(searchTerm.toLowerCase()));
  const active = routes.filter((r) => r.status === 'active').length;
  const pending = routes.filter((r) => r.status === 'pending').length;
  const completed = routes.filter((r) => r.status === 'completed').length;

  if (loading) return <PageSkeleton stats={3} layout="split" />;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,#06111f_0%,#0b1d34_35%,#f8fbff_100%)] p-7 shadow-[0_28px_80px_-48px_rgba(2,36,72,0.7)] sm:p-8">
        <div className="absolute inset-0">
          <img src={heroImages.routes.url} alt={heroImages.routes.alt} className="h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(6,17,31,0.94)_0%,rgba(11,29,52,0.84)_38%,rgba(11,29,52,0.34)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_34%)]" />
        </div>
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.95fr)] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-sky-100/85 backdrop-blur"><Route size={14} strokeWidth={2.2} />Monitoreo de rutas</div>
            <h1 className="mt-5 max-w-3xl font-display text-[clamp(2.1rem,5vw,4rem)] font-semibold tracking-[-0.06em] text-white">Rutas, checkpoints y vehiculos en una sola superficie de control.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">El layout prioriza seleccion, contexto y mapa vivo para que cada ruta se entienda rapido sin perder detalle operativo.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col"><Button size="lg" onClick={() => setShowForm(true)}>+ Nueva ruta</Button><div className="rounded-[1.4rem] border border-white/10 bg-white/7 p-4 text-white backdrop-blur-sm"><p className="text-[0.64rem] uppercase tracking-[0.18em] text-slate-300">Cobertura activa</p><div className="mt-2 flex items-center gap-2"><span className="font-display text-3xl font-semibold tracking-[-0.05em]">{active}</span><Truck size={18} className="text-sky-300" strokeWidth={2.2} /></div></div></div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <StatCard label="Rutas activas" value={active} icon={Route} change={5.6} changeLabel="vs ayer" caption="Operaciones en movimiento con seguimiento en linea." tone="blue" />
        <StatCard label="Pendientes" value={pending} icon={Search} change={-2.4} changeLabel="vs ayer" caption="Rutas en espera de salida o confirmacion." tone="amber" />
        <StatCard label="Completadas" value={completed} icon={MapPinned} change={7.8} changeLabel="vs ayer" caption="Trayectos cerrados dentro de la jornada." tone="emerald" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(22rem,40%)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-[1.8rem] border border-white/70 bg-white/88 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
          <div className="border-b border-surface-100 p-6">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[0.64rem] uppercase tracking-[0.24em] text-surface-500">Resumen de operacion</p><h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-surface-950">Seleccion de rutas</h2></div>
              <Badge variant="info" dot>{filteredRoutes.length} visibles</Badge>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3"><div className="rounded-2xl border border-surface-100 bg-surface-50 p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-surface-500">Activas</p><p className="mt-2 text-3xl font-bold text-primary-700">{active}</p></div><div className="rounded-2xl border border-surface-100 bg-surface-50 p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-surface-500">Pendientes</p><p className="mt-2 text-3xl font-bold text-primary-700">{pending}</p></div><div className="rounded-2xl border border-surface-100 bg-surface-50 p-4"><p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-surface-500">Completadas</p><p className="mt-2 text-3xl font-bold text-primary-700">{completed}</p></div></div>
            <div className="mt-5"><SearchInput value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar ruta, conductor o destino..." /></div>
          </div>

          <div className="max-h-[calc(100vh-18rem)] space-y-3 overflow-y-auto p-4">
            {filteredRoutes.map((route) => <div key={route.id} className={`${selectedRoute?.id === route.id ? 'ring-2 ring-primary-200 ring-offset-2 ring-offset-white rounded-[1.35rem]' : ''}`}><RouteCard route={route} isSelected={selectedRoute?.id === route.id} onClick={() => setSelectedRoute(route)} /></div>)}
            {filteredRoutes.length === 0 && (
              <EmptyState
                eyebrow="Sin coincidencias"
                title="No encontramos rutas con ese criterio"
                description="Prueba ajustando conductor, codigo o destino para volver a poblar la vista."
                className="min-h-[15rem] border-surface-100 bg-surface-50/70"
              />
            )}
          </div>
        </div>

        <div className="relative min-h-[42rem] overflow-hidden rounded-[1.8rem] border border-white/60 bg-[linear-gradient(180deg,#eaf0f7_0%,#dfe8f2_100%)] shadow-[0_24px_70px_-42px_rgba(15,23,42,0.24)]">
          {selectedRoute ? (
            <>
              <div className="absolute inset-0">
                <BaseMap center={[selectedRoute.vehicle_position?.lat || -16.5, selectedRoute.vehicle_position?.lng || -68.15]} zoom={9} className="h-full w-full">
                  {selectedRoute.checkpoints && selectedRoute.checkpoints.length > 0 && (
                    <>
                      <RoutePath checkpoints={selectedRoute.checkpoints} />
                      {selectedRoute.checkpoints.map((cp) => <CheckpointMarker key={cp.id} checkpoint={cp} />)}
                    </>
                  )}
                  {selectedRoute.vehicle_position && <VehicleMarker position={[selectedRoute.vehicle_position.lat, selectedRoute.vehicle_position.lng]} title={selectedRoute.route_code} subtitle={`${selectedRoute.driver_name} - ${selectedRoute.plate_number}`} />}
                </BaseMap>
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[#0a1c34]/70 to-transparent" />
              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-start justify-between p-6 text-white">
                  <div>
                    <p className="text-[0.64rem] uppercase tracking-[0.24em] text-sky-100/70">Ruta seleccionada</p>
                    <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em]">{selectedRoute.origin} - {selectedRoute.destination}</h2>
                    <p className="mt-2 text-sm text-white/72">{selectedRoute.route_code} - {selectedRoute.driver_name} - {selectedRoute.vehicle_brand} {selectedRoute.plate_number}</p>
                  </div>
                  <Badge variant={selectedRoute.status === 'active' ? 'success' : selectedRoute.status === 'delayed' ? 'danger' : 'warning'} dot>{selectedRoute.status}</Badge>
                </div>
                <div className="pointer-events-none mt-auto flex flex-wrap items-end justify-between gap-4 p-6">
                  <div className="pointer-events-auto rounded-[1.5rem] border border-white/40 bg-white/80 p-4 shadow-xl backdrop-blur-xl">
                    <div className="flex gap-5">
                      <div className="min-w-[5rem]"><p className="text-[0.6rem] uppercase tracking-[0.18em] text-surface-500">Progreso</p><p className="mt-2 text-lg font-bold text-primary-700">{selectedRoute.progress || 0}%</p></div>
                      <div className="min-w-[5rem]"><p className="text-[0.6rem] uppercase tracking-[0.18em] text-surface-500">ETA</p><p className="mt-2 text-lg font-bold text-primary-700">{selectedRoute.eta || '--'}</p></div>
                      <div className="min-w-[5rem]"><p className="text-[0.6rem] uppercase tracking-[0.18em] text-surface-500">Distancia</p><p className="mt-2 text-lg font-bold text-primary-700">{selectedRoute.remaining_distance ? `${selectedRoute.remaining_distance} km` : '--'}</p></div>
                    </div>
                  </div>
                  <div className="pointer-events-auto"><MapLegend /></div>
                </div>
                <RouteInfoPanel route={selectedRoute} onClose={() => setSelectedRoute(null)} />
              </div>
            </>
          ) : (
            <EmptyState
              eyebrow="Mapa en espera"
              title="Selecciona una ruta para abrir el mapa"
              description="Al elegir una ruta mostraremos checkpoints, progreso, ETA y lectura espacial del recorrido."
              className="h-full min-h-[42rem] border-0 bg-transparent"
            />
          )}
        </div>
      </section>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Crear ruta de transporte"><RouteForm onSuccess={() => { setShowForm(false); fetchRoutes(); }} onCancel={() => setShowForm(false)} /></Modal>
    </div>
  );
}

export default RoutesPage;
