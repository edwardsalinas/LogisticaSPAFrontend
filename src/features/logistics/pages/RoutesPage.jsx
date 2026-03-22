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
import VehicleMarker from '../../../components/molecules/VehicleMarker';
import OriginDestMarker from '../../../components/molecules/OriginDestMarker';
import Skeleton from '../../../components/atoms/Skeleton';
import { heroImages } from '../../../constants/heroImages';
import apiService from '../../../services/apiService';
import RoutesHero from '../components/RoutesHero';
import RouteCard from '../components/RouteCard';
import RouteForm from '../components/RouteForm';
import RouteInfoPanel from '../components/RouteInfoPanel';
import PackageAssignmentForm from '../components/PackageAssignmentForm';
import useRole from '../../../app/useRole';
import StatCard from '../../../components/molecules/StatCard';
const MOCK_ROUTES = [
  { id: 'route-001', route_code: 'RT-001', origin: 'La Paz', destination: 'Oruro', driver_name: 'Juan Perez', vehicle_brand: 'Volvo', plate_number: 'INT-1234', status: 'active', progress: 65, next_checkpoint: 'Centro Logistico El Alto', eta: '14:30', eta_minutes: 25, remaining_distance: 45.2, driver_phone: '+591 70012345', checkpoints: [{ id: 'cp-001', name: 'Terminal La Paz', lat: -16.5, lng: -68.1193, sequence_order: 1 }, { id: 'cp-002', name: 'Checkpoint El Alto', lat: -16.51, lng: -68.15, sequence_order: 2 }, { id: 'cp-003', name: 'Puesto Viacha', lat: -16.65, lng: -68.31, sequence_order: 3 }, { id: 'cp-004', name: 'Terminal Oruro', lat: -17.9833, lng: -67.15, sequence_order: 4 }], vehicle_position: { lat: -16.58, lng: -68.25 } },
  { id: 'route-002', route_code: 'RT-002', origin: 'Santa Cruz', destination: 'Cochabamba', driver_name: 'Maria Lopez', vehicle_brand: 'Mercedes', plate_number: 'ABC-5678', status: 'delayed', progress: 45, next_checkpoint: 'Sacaba', eta: '16:00', eta_minutes: 90, remaining_distance: 78.5, driver_phone: '+591 70054321', checkpoints: [{ id: 'cp-005', name: 'Terminal Santa Cruz', lat: -17.7833, lng: -63.1821, sequence_order: 1 }, { id: 'cp-006', name: 'Colomi', lat: -17.4167, lng: -66.2833, sequence_order: 2 }, { id: 'cp-007', name: 'Terminal Cochabamba', lat: -17.3895, lng: -66.1568, sequence_order: 3 }], vehicle_position: { lat: -17.55, lng: -65.8 } },
  { id: 'route-003', route_code: 'RT-003', origin: 'Sucre', destination: 'Potosi', driver_name: 'Carlos Ruiz', vehicle_brand: 'Ford', plate_number: 'XYW-9012', status: 'pending', progress: 0, next_checkpoint: 'Por asignar', eta: '--', eta_minutes: 0, remaining_distance: 0, driver_phone: '+591 70098765', checkpoints: [], vehicle_position: null },
];

function RoutesPage() {
  const { hasRole } = useRole();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningRoute, setAssigningRoute] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [extendedSelectedRoute, setExtendedSelectedRoute] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const [routesRes, schedsRes] = await Promise.allSettled([
        apiService.getRoutes(),
        apiService.getSchedules()
      ]);

      const extractData = (res) => {
        if (res.status !== 'fulfilled') return [];
        const val = res.value;
        // Si ya es un array (unwrapped por interceptor)
        if (Array.isArray(val)) return val;
        // Si es el objeto { success, data: [...] }
        if (Array.isArray(val?.data)) return val.data;
        // Fallback
        return [];
      };

      const rawSchedules = extractData(schedsRes);
      const rawRoutes = extractData(routesRes);

      const mappedSchedules = rawSchedules.map(sch => ({
        ...sch,
        type: 'schedule',
        route_code: sch.label || `SCH-${sch.id.slice(0, 5).toUpperCase()}`,
        status: sch.status || 'schedule',
        driver_name: sch.drivers?.full_name || sch.drivers?.email || 'Sin conductor',
        vehicle_brand: sch.vehicles?.brand || 'Vehículo',
        plate_number: sch.vehicles?.plate || '--',
        progress: 0,
        eta: '--',
      }));

      const mappedRoutes = rawRoutes.map(r => ({
        ...r,
        type: 'route',
        driver_name: r.driver?.full_name || 'Sin asignar',
        vehicle_brand: r.vehicles?.brand || 'Vehículo',
        plate_number: r.vehicles?.plate || '--',
      }));

      const combined = [...mappedSchedules, ...mappedRoutes];

      setRoutes(combined.length > 0 ? combined : MOCK_ROUTES);
      
      // Only set initial selectedRoute if none exists OR if the current one was deleted
      if (!selectedRoute || !combined.find(r => r.id === selectedRoute.id)) {
        setSelectedRoute(combined[0] || MOCK_ROUTES[0]);
      }
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

  useEffect(() => {
    if (!selectedRoute?.id) {
      setExtendedSelectedRoute(null);
      return;
    }
    const fetchExtended = async () => {
      try {
        if (selectedRoute.type === 'schedule') {
          // It's a schedule, grab from getSchedule endpoint
          const res = await apiService.getSchedule(selectedRoute.id);
          const schedData = res.data?.data || res.data;
          if (schedData) {
            setExtendedSelectedRoute({
              ...schedData,
              type: 'schedule',
              route_code: schedData.label || `SCH-${schedData.id.slice(0, 5).toUpperCase()}`,
              status: 'schedule',
              driver_name: schedData.drivers?.full_name || schedData.drivers?.email || 'Sin conductor',
              vehicle_brand: schedData.vehicles?.brand || 'Vehículo',
              plate_number: schedData.vehicles?.plate || '--',
              progress: 0,
              eta: '--',
            });
          }
        } else {
          const res = await apiService.getRoute(selectedRoute.id);
          const routeData = res.data?.data || res.data;
          if (routeData) setExtendedSelectedRoute(routeData);
        }
      } catch (e) {
        console.error('Failed to fetch extended data', e);
        setExtendedSelectedRoute(selectedRoute);
      }
    };
    fetchExtended();
  }, [selectedRoute?.id]);

  const handleDelete = async (route) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar ${route.type === 'schedule' ? 'el cronograma' : 'la ruta'} ${route.route_code}?`)) {
      try {
        if (route.type === 'schedule') {
          await apiService.deleteSchedule(route.id);
        } else {
          await apiService.deleteRoute(route.id);
        }
        if (selectedRoute?.id === route.id) setSelectedRoute(null);
        fetchRoutes();
      } catch (err) {
        alert(err.message || 'Error al eliminar. Verifica si hay dependencias activas.');
      }
    }
  };

  const handleEdit = async (route) => {
    try {
      if (route.type === 'schedule') {
        const res = await apiService.getSchedule(route.id);
        setEditingRoute(res.data?.data || res.data || route);
      } else {
        if (route.checkpoints) {
          setEditingRoute(route);
          setShowForm(true);
          return;
        }
        const res = await apiService.getRoute(route.id);
        const routeData = res.data?.data || res.data;
        setEditingRoute(routeData || route);
      }
    } catch (err) {
      console.error('Error fetching full data for edit:', err);
      setEditingRoute(route);
    }
    setShowForm(true);
  };

  const handleAssign = (route) => {
    setAssigningRoute(route);
    setShowAssignModal(true);
  };

  const handleGenerateRoutes = async () => {
    try {
      setLoading(true);
      const res = await apiService.generateRoutesFromSchedules(7);
      const count = res.data?.generatedCount || 0;
      alert(`Se han generado ${count} despachos para la próxima semana.`);
      fetchRoutes();
    } catch (err) {
      console.error('Error generando despachos:', err);
      alert('Error al proyectar los cronogramas.');
      setLoading(false);
    }
  };

  const filteredRoutes = routes.filter((route) => route.route_code?.toLowerCase().includes(searchTerm.toLowerCase()) || route.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) || route.origin?.toLowerCase().includes(searchTerm.toLowerCase()) || route.destination?.toLowerCase().includes(searchTerm.toLowerCase()));
  const active = routes.filter((r) => r.status === 'active' || r.status === 'en_transito').length;
  const pending = routes.filter((r) => r.status === 'pending' || r.status === 'planeada').length;
  const completed = routes.filter((r) => r.status === 'completed' || r.status === 'finalizada').length;

  return (
    <div className="space-y-8">
      {loading ? (
        <Skeleton className="h-[220px] w-full" />
      ) : (
        <RoutesHero active={active} pending={pending} completed={completed} />
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(22rem,40%)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-[1.8rem] border border-white/70 bg-white/88 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
          <div className="border-b border-surface-100 p-6">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[0.64rem] uppercase tracking-[0.24em] text-surface-500">Resumen de operacion</p><h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-surface-950">Gestión de Viajes y Cronogramas</h2></div>
              <Badge variant="info" dot>{filteredRoutes.length} elementos</Badge>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="w-full sm:max-w-md"><SearchInput value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar viaje, conductor o destino..." /></div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="secondary" className="whitespace-nowrap" onClick={handleGenerateRoutes}>Proyectar Semana</Button>
                <Button className="whitespace-nowrap" onClick={() => { setEditingRoute(null); setShowForm(true); }}>+ Nuevo</Button>
              </div>
            </div>
          </div>

          <div className="max-h-[calc(100vh-18rem)] space-y-3 overflow-y-auto p-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
            ) : (
              filteredRoutes.map((route) => <div key={route.id} className={`${selectedRoute?.id === route.id ? 'ring-2 ring-primary-200 ring-offset-2 ring-offset-white rounded-[1.35rem]' : ''}`}><RouteCard route={route} isSelected={selectedRoute?.id === route.id} onClick={() => setSelectedRoute(route)} onEdit={() => handleEdit(route)} onDelete={() => handleDelete(route)} /></div>)
            )}
            {!loading && filteredRoutes.length === 0 && (
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
          {extendedSelectedRoute ? (
            <>
              <div className="absolute inset-0">
                <BaseMap center={[extendedSelectedRoute.vehicle_position?.lat || -16.5, extendedSelectedRoute.vehicle_position?.lng || -68.15]} zoom={9} className="h-full w-full">
                  {extendedSelectedRoute && <RoutePath route={extendedSelectedRoute} />}
                  
                  {extendedSelectedRoute?.origin_lat && extendedSelectedRoute?.origin_lng && (
                    <OriginDestMarker type="origin" position={[extendedSelectedRoute.origin_lat, extendedSelectedRoute.origin_lng]} title={extendedSelectedRoute.origin} subtitle="Punto de partida" />
                  )}
                  {extendedSelectedRoute?.dest_lat && extendedSelectedRoute?.dest_lng && (
                    <OriginDestMarker type="dest" position={[extendedSelectedRoute.dest_lat, extendedSelectedRoute.dest_lng]} title={extendedSelectedRoute.destination} subtitle="Meta final" />
                  )}

                  {extendedSelectedRoute.checkpoints?.map((cp) => <CheckpointMarker key={cp.id} checkpoint={cp} />)}
                  {extendedSelectedRoute.vehicle_position && <VehicleMarker position={[extendedSelectedRoute.vehicle_position.lat, extendedSelectedRoute.vehicle_position.lng]} title={extendedSelectedRoute.route_code} subtitle={`${extendedSelectedRoute.driver_name} - ${extendedSelectedRoute.plate_number}`} />}
                </BaseMap>
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[#0a1c34]/70 to-transparent" />
              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-start justify-between p-6 text-white">
                  <div>
                    <p className="text-[0.64rem] uppercase tracking-[0.24em] text-sky-100/70">{extendedSelectedRoute.type === 'schedule' ? 'Cronograma' : 'Despacho'} seleccionado</p>
                    <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em]">{extendedSelectedRoute.origin} - {extendedSelectedRoute.destination}</h2>
                    <p className="mt-2 text-sm text-white/72">{extendedSelectedRoute.route_code} - {extendedSelectedRoute.driver_name || 'Sin conductor'} - {extendedSelectedRoute.vehicle_brand || 'Vehículo'} {extendedSelectedRoute.plate_number || ''}</p>
                  </div>
                  <Badge variant={extendedSelectedRoute.status === 'active' ? 'success' : extendedSelectedRoute.status === 'delayed' ? 'danger' : 'warning'} dot>{extendedSelectedRoute.status}</Badge>
                </div>
                <div className="pointer-events-none mt-auto flex flex-wrap items-end justify-between gap-4 p-6">
                  <div className="pointer-events-auto rounded-[1.5rem] border border-white/40 bg-white/80 p-4 shadow-xl backdrop-blur-xl">
                    <div className="flex gap-5">
                      <div className="min-w-[5rem]"><p className="text-[0.6rem] uppercase tracking-[0.18em] text-surface-500">Progreso</p><p className="mt-2 text-lg font-bold text-primary-700">{extendedSelectedRoute.progress || 0}%</p></div>
                      <div className="min-w-[5rem]"><p className="text-[0.6rem] uppercase tracking-[0.18em] text-surface-500">ETA</p><p className="mt-2 text-lg font-bold text-primary-700">{extendedSelectedRoute.eta || '--'}</p></div>
                      <div className="min-w-[5rem]"><p className="text-[0.6rem] uppercase tracking-[0.18em] text-surface-500">Distancia</p><p className="mt-2 text-lg font-bold text-primary-700">{extendedSelectedRoute.remaining_distance ? `${extendedSelectedRoute.remaining_distance} km` : '--'}</p></div>
                    </div>
                  </div>
                  <div className="pointer-events-auto"><MapLegend /></div>
                </div>
                <RouteInfoPanel 
                  route={extendedSelectedRoute} 
                  onClose={() => setSelectedRoute(null)} 
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onAssign={handleAssign}
                />
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

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditingRoute(null); }} title={editingRoute ? 'Editar Viaje / Cronograma' : 'Configurar Nuevo Viaje o Cronograma'}>
        <RouteForm 
          initialData={editingRoute}
          onSuccess={() => { setShowForm(false); setEditingRoute(null); fetchRoutes(); }} 
          onCancel={() => { setShowForm(false); setEditingRoute(null); }} 
        />
      </Modal>

      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Asignar paquetes a ruta">
        <PackageAssignmentForm
          routeId={assigningRoute?.id}
          onSuccess={() => { setShowAssignModal(false); setAssigningRoute(null); fetchRoutes(); }}
          onCancel={() => setShowAssignModal(false)}
        />
      </Modal>

    </div>
  );
}

export default RoutesPage;
