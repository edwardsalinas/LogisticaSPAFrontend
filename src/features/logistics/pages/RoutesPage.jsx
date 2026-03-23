import { useEffect, useState, useRef, useMemo, useCallback, memo } from 'react';
import { toast } from 'sonner';
import { MapPinned, Route, Search, Truck, Calendar, List, User, MapPin, Flag, Layers, ChevronDown, Plus, Filter, X, CalendarRange } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
import HistoryPath from '../../../components/molecules/HistoryPath';
import { haversineDistance, calculateTripProgress } from '../../../utils/geoUtils';

const MOCK_ROUTES = [
  { id: 'route-001', route_code: 'RT-001', origin: 'La Paz', destination: 'Oruro', driver_name: 'Juan Perez', vehicle_brand: 'Volvo', plate_number: 'INT-1234', status: 'active', progress: 65, next_checkpoint: 'Centro Logistico El Alto', eta: '14:30', eta_minutes: 25, remaining_distance: 45.2, driver_phone: '+591 70012345', checkpoints: [{ id: 'cp-001', name: 'Terminal La Paz', lat: -16.5, lng: -68.1193, sequence_order: 1 }, { id: 'cp-002', name: 'Checkpoint El Alto', lat: -16.51, lng: -68.15, sequence_order: 2 }, { id: 'cp-003', name: 'Puesto Viacha', lat: -16.65, lng: -68.31, sequence_order: 3 }, { id: 'cp-004', name: 'Terminal Oruro', lat: -17.9833, lng: -67.15, sequence_order: 4 }], vehicle_position: { lat: -16.58, lng: -68.25 } },
];

const RoutesCalendar = memo(({ events, onEventClick, renderEventContent }) => (
  <FullCalendar
    plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
    initialView="timeGridWeek"
    headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
    events={events}
    eventClick={onEventClick}
    eventContent={renderEventContent}
    height="100%"
    slotMinTime="05:00:00"
    slotMaxTime="23:00:00"
    allDaySlot={false}
    locale="es"
    buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día' }}
  />
));

const RoutesMap = memo(({ 
  extendedSelectedRoute, 
  trackingLogs, 
  realProgress, 
  realRemainingDistance 
}) => {
  if (!extendedSelectedRoute) return null;

  return (
    <>
      <div className="absolute inset-0">
        <BaseMap center={[extendedSelectedRoute.vehicle_position?.lat || extendedSelectedRoute.origin_lat || -16.5, extendedSelectedRoute.vehicle_position?.lng || extendedSelectedRoute.origin_lng || -68.15]} zoom={9} className="h-full w-full">
          <RoutePath route={extendedSelectedRoute} isCompleted={['completed', 'finalizada', 'completada'].includes(extendedSelectedRoute.status)} />
          <HistoryPath logs={trackingLogs} />
          
          {extendedSelectedRoute?.origin_lat && extendedSelectedRoute?.origin_lng && (
            <OriginDestMarker type="origin" position={[extendedSelectedRoute.origin_lat, extendedSelectedRoute.origin_lng]} title={extendedSelectedRoute.origin} subtitle="Punto de partida" />
          )}
          {extendedSelectedRoute?.dest_lat && extendedSelectedRoute?.dest_lng && (
            <OriginDestMarker type="dest" position={[extendedSelectedRoute.dest_lat, extendedSelectedRoute.dest_lng]} title={extendedSelectedRoute.destination} subtitle="Meta final" />
          )}

          {extendedSelectedRoute.checkpoints?.map((cp) => <CheckpointMarker key={cp.id} checkpoint={cp} />)}
          
          {(() => {
            const hasLogs = trackingLogs && trackingLogs.length > 0;
            const lastLog = hasLogs ? trackingLogs[trackingLogs.length - 1] : null;
            const isFinished = ['completed', 'finalizada', 'completada'].includes(extendedSelectedRoute.status);
            
            let pos = null;
            if (hasLogs) pos = [lastLog.lat, lastLog.lng];
            else if (isFinished && extendedSelectedRoute.dest_lat) pos = [extendedSelectedRoute.dest_lat, extendedSelectedRoute.dest_lng];
            else if (extendedSelectedRoute.vehicle_position) pos = [extendedSelectedRoute.vehicle_position.lat, extendedSelectedRoute.vehicle_position.lng];

            if (!pos) return null;

            return (
              <VehicleMarker 
                position={pos} 
                title={extendedSelectedRoute.route_code} 
                subtitle={`${extendedSelectedRoute.driver_name} - ${extendedSelectedRoute.plate_number}`} 
                isFinished={isFinished}
              />
            );
          })()}
        </BaseMap>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[#0a1c34]/70 to-transparent" />
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between p-6 text-white">
          <div className="drop-shadow-sm">
            <p className="text-[0.64rem] uppercase tracking-[0.24em] text-sky-100/70">{extendedSelectedRoute.type === 'schedule' ? 'Cronograma' : 'Despacho'} seleccionado</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em]">{extendedSelectedRoute.origin} - {extendedSelectedRoute.destination}</h2>
            <p className="mt-2 text-sm text-white/72">{extendedSelectedRoute.route_code} - {extendedSelectedRoute.driver_name || 'Sin conductor'}</p>
          </div>
          <Badge variant={extendedSelectedRoute.status === 'active' || extendedSelectedRoute.status === 'en_transito' ? 'success' : extendedSelectedRoute.status === 'delayed' ? 'danger' : 'warning'} dot>{extendedSelectedRoute.status}</Badge>
        </div>
        <div className="pointer-events-none mt-auto flex flex-wrap items-end justify-between gap-4 p-6">
          <div className="pointer-events-auto rounded-[1.5rem] border border-white/40 bg-white/80 p-4 shadow-xl backdrop-blur-xl">
            <div className="flex gap-5">
              <div className="min-w-[5rem]"><p className="text-[0.6rem] uppercase tracking-[0.18em] text-surface-500">Progreso</p><p className="mt-2 text-lg font-bold text-primary-700">{realProgress}%</p></div>
              <div className="min-w-[5rem]"><p className="text-[0.6rem] uppercase tracking-[0.18em] text-surface-500">ETA</p><p className="mt-2 text-lg font-bold text-primary-700">{extendedSelectedRoute.eta || '--'}</p></div>
              <div className="min-w-[5rem]"><p className="text-[0.6rem] uppercase tracking-[0.18em] text-surface-500">Distancia</p><p className="mt-2 text-lg font-bold text-primary-700">{realRemainingDistance || '--'} km</p></div>
            </div>
          </div>
          <div className="pointer-events-auto"><MapLegend /></div>
        </div>
      </div>
    </>
  );
});

function RoutesPage() {
  const { hasRole } = useRole();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningRoute, setAssigningRoute] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('calendar');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const [selectedTripType, setSelectedTripType] = useState('');
  const [clickTimeout, setClickTimeout] = useState(null);
  const prevPackagesState = useRef({});

  // --- REACT QUERY ---
  const { data: routes = [], isLoading: loadingRoutes } = useQuery({
    queryKey: ['adminRoutes'],
    queryFn: async () => {
      const [routesRes, schedsRes] = await Promise.all([
        apiService.getRoutes(),
        apiService.getSchedules()
      ]);
      
      const extract = (res) => {
         if (!res) return [];
         if (Array.isArray(res)) return res;
         return res.data || [];
      };

      const rawSchedules = extract(schedsRes);
      const allRealRoutes = extract(routesRes);

      const mappedRoutes = allRealRoutes.map(r => ({ ...r, type: 'route', driver_name: r.driver?.full_name || 'Sin asignar', driver_id: r.driver_id || r.driver?.id || null, vehicle_brand: r.vehicles?.brand || 'Vehículo', plate_number: r.vehicles?.plate || '--', progress: r.progress || 0 }));
      const mappedSchedules = rawSchedules.map(sch => ({ ...sch, type: 'schedule', route_code: sch.label || `SCH-${sch.id.slice(0, 5).toUpperCase()}`, status: sch.status || 'schedule', driver_name: sch.drivers?.full_name || sch.drivers?.email || 'Sin conductor', driver_id: sch.driver_id || sch.drivers?.id || null, vehicle_brand: sch.vehicles?.brand || 'Vehículo', plate_number: sch.vehicles?.plate || '--', progress: 0, eta: '--' }));

      return [...mappedSchedules, ...mappedRoutes];
    },
    refetchInterval: 10000,
    staleTime: 5000
  });

  const { data: routeDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ['routeDetails', selectedRoute?.id],
    queryFn: async () => {
      if (!selectedRoute?.id) return null;
      if (selectedRoute.type === 'schedule') {
        const res = await apiService.getSchedule(selectedRoute.id);
        const schedData = res.data?.data || res.data;
        return { ...schedData, type: 'schedule', route_code: schedData.label || `SCH-${schedData.id.slice(0, 5).toUpperCase()}`, status: 'schedule', driver_name: schedData.drivers?.full_name || 'Sin conductor', progress: 0 };
      }
      const [routeRes, trackingRes] = await Promise.all([
        apiService.getRoute(selectedRoute.id),
        apiService.getRouteTracking(selectedRoute.id)
      ]);
      return { ...routeRes.data, trackingLogs: trackingRes.data || [] };
    },
    enabled: !!selectedRoute?.id,
    staleTime: 10000
  });

  const extendedSelectedRoute = useMemo(() => routeDetails || selectedRoute, [routeDetails, selectedRoute]);
  const trackingLogs = useMemo(() => extendedSelectedRoute?.trackingLogs || [], [extendedSelectedRoute]);

  // Notificaciones de entrega (Toasts)
  useEffect(() => {
    routes.forEach(route => {
      if (route.packages) {
        route.packages.forEach(pkg => {
          const prevStatus = prevPackagesState.current[pkg.id];
          if (prevStatus && prevStatus !== pkg.status && (pkg.status === 'delivered' || pkg.status === 'completada')) {
            toast.success(`¡Paquete Entregado!`, { description: `Código: ${pkg.tracking_code} en la ruta ${route.route_code}`, duration: 5000 });
          }
          prevPackagesState.current[pkg.id] = pkg.status;
        });
      }
    });
  }, [routes]);

  const loading = loadingRoutes;

  const handleDelete = useCallback(async (route) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar ${route.type === 'schedule' ? 'el cronograma' : 'la ruta'} ${route.route_code}?`)) {
      try {
        if (route.type === 'schedule') {
          await apiService.deleteSchedule(route.id);
        } else {
          await apiService.deleteRoute(route.id);
        }
        if (selectedRoute?.id === route.id) setSelectedRoute(null);
        queryClient.invalidateQueries({ queryKey: ['adminRoutes'] });
      } catch (err) {
        alert(err.message || 'Error al eliminar. Verifica si hay dependencias activas.');
      }
    }
  }, [selectedRoute, queryClient]);

  const handleEdit = useCallback(async (route) => {
    try {
      if (route.type === 'schedule') {
        const res = await apiService.getSchedule(route.id);
        setEditingRoute(res.data?.data || res.data || route);
      } else {
        // No need to check for checkpoints here, just fetch the route
        const res = await apiService.getRoute(route.id);
        const routeData = res.data?.data || res.data;
        setEditingRoute(routeData || route);
      }
    } catch (err) {
      console.error('Error fetching full data for edit:', err);
      setEditingRoute(route);
    }
    setShowForm(true);
  }, []);

  const handleAssign = useCallback((route) => {
    setAssigningRoute(route);
    setShowAssignModal(true);
  }, []);

  const uniqueDrivers = useMemo(() => Array.from(new Map(
    routes.filter(r => r.driver_id).map(r => [r.driver_id, { id: r.driver_id, name: r.driver_name }])
  ).values()), [routes]);
  const uniqueOrigins = useMemo(() => [...new Set(routes.filter(r => r.origin).map(r => r.origin))].sort(), [routes]);
  const uniqueDestinations = useMemo(() => [...new Set(routes.filter(r => r.destination).map(r => r.destination))].sort(), [routes]);

  const driverFilteredRoutes = useMemo(() => selectedDriverId 
    ? routes.filter(r => String(r.driver_id) === String(selectedDriverId))
    : routes, [routes, selectedDriverId]);

  const locationFilteredRoutes = useMemo(() => driverFilteredRoutes.filter(r => {
    if (selectedOrigin && r.origin !== selectedOrigin) return false;
    if (selectedDestination && r.destination !== selectedDestination) return false;
    return true;
  }), [driverFilteredRoutes, selectedOrigin, selectedDestination]);

  const typeFilteredRoutes = useMemo(() => locationFilteredRoutes.filter(r => {
    if (selectedTripType === 'single') return !r.schedule_id && r.type !== 'schedule';
    if (selectedTripType === 'schedule') return !!r.schedule_id || r.type === 'schedule';
    return true;
  }), [locationFilteredRoutes, selectedTripType]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  const listRoutes = useMemo(() => typeFilteredRoutes.filter(r => {
    if (r.type === 'schedule') return true;
    if (r.schedule_id && (r.status === 'planeada' || r.status === 'pending')) {
      if (!r.scheduled_date || r.scheduled_date > todayStr) return false;
    }
    return true;
  }), [typeFilteredRoutes, todayStr]);

  const filteredListRoutes = useMemo(() => listRoutes.filter((route) => {
    const s = searchTerm.toLowerCase();
    const code = (route.route_code || "").toLowerCase();
    const driver = (route.driver_name || "").toLowerCase();
    const origin = (route.origin || "").toLowerCase();
    const dest = (route.destination || "").toLowerCase();
    return code.includes(s) || driver.includes(s) || origin.includes(s) || dest.includes(s);
  }), [listRoutes, searchTerm]);

  const calendarEvents = useMemo(() => typeFilteredRoutes.filter(r => r.type === 'route' && r.departure_time).map(r => {
    const start = new Date(r.departure_time);
    const end = new Date(start.getTime() + ((r.eta_minutes || 120) * 60000));
    
    let bgColor = r.schedule_id ? '#8b5cf6' : '#3b82f6'; // Morado para recurrentes, Azul para únicos
    if (r.status === 'active' || r.status === 'en_transito') bgColor = '#059669'; // Verde
    if (r.status === 'completed' || r.status === 'finalizada' || r.status === 'completada') bgColor = '#475569'; // Gris

    return {
      id: String(r.id),
      title: `${r.route_code} | ${r.origin} - ${r.destination}`,
      start: r.departure_time,
      end: end.toISOString(),
      backgroundColor: bgColor,
      borderColor: 'transparent',
      display: 'block',
      extendedProps: { route: r }
    };
  }), [typeFilteredRoutes]);

  // --- METRICAS REALES ---
  const isFinished = useMemo(() => ['completed', 'finalizada', 'completada'].includes(extendedSelectedRoute?.status), [extendedSelectedRoute]);
  
  const realRemainingDistance = useMemo(() => (extendedSelectedRoute?.status === 'active' || extendedSelectedRoute?.status === 'en_transito') && trackingLogs.length > 0 && extendedSelectedRoute?.dest_lat
    ? (haversineDistance(trackingLogs[trackingLogs.length - 1].lat, trackingLogs[trackingLogs.length - 1].lng, extendedSelectedRoute.dest_lat, extendedSelectedRoute.dest_lng) / 1000).toFixed(1)
    : (isFinished ? '0.0' : null), [extendedSelectedRoute, trackingLogs, isFinished]);

  const realProgress = useMemo(() => extendedSelectedRoute ? calculateTripProgress(
    extendedSelectedRoute.checkpoints?.length || 0,
    (extendedSelectedRoute.events?.filter(e => e.type === 'checkpoint_reached') || []).length,
    extendedSelectedRoute.packages?.length || 0,
    (extendedSelectedRoute.packages?.filter(p => p.status === 'delivered' || p.status === 'completada') || []).length
  ) : 0, [extendedSelectedRoute]);

  const stats = useMemo(() => ({
    active: typeFilteredRoutes.filter((r) => r.type === 'route' && (r.status === 'active' || r.status === 'en_transito')).length,
    pending: listRoutes.filter((r) => r.type === 'route' && (r.status === 'pending' || r.status === 'planeada' || r.status === 'planned')).length,
    completed: typeFilteredRoutes.filter((r) => r.type === 'route' && (r.status === 'completed' || r.status === 'finalizada' || r.status === 'completada')).length,
  }), [typeFilteredRoutes, listRoutes]);

  const handleEventClick = useCallback((info) => {
    const found = routes.find(r => String(r.id) === String(info.event.id));
    if (!found) return;

    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
      // Double click
      handleEdit(found);
    } else {
      // Single click
      const timeout = setTimeout(() => {
        setClickTimeout(null);
        setSelectedRoute(found);
      }, 250);
      setClickTimeout(timeout);
    }
  }, [routes, clickTimeout, handleEdit]);

  const renderEventContent = useCallback((eventInfo) => {
    const event = eventInfo.event;
    const isPast = new Date(event.start) < new Date();
    const isMonthView = eventInfo.view.type === 'dayGridMonth';
    const route = event.extendedProps.route;
    const status = route.status;

    if (isMonthView) {
      return (
        <div className={`w-full overflow-hidden flex items-center gap-1.5 px-1.5 py-0.5 rounded-md ${isPast && status === 'planeada' ? 'opacity-60' : ''}`}>
          <span className="font-bold text-[9px] text-white/90 whitespace-nowrap">{eventInfo.timeText}</span>
          <span className="text-[10px] font-semibold text-white truncate">{event.title.split('|')[0].trim()}</span>
          {(status === 'active' || status === 'en_transito') && <Truck size={10} className="animate-pulse text-white ml-auto shrink-0" />}
        </div>
      );
    }

    return (
      <div className={`p-1.5 flex flex-col h-full overflow-hidden leading-tight rounded-md border-l-4 border-white/20 transition-all ${isPast && status === 'planeada' ? 'opacity-60 grayscale-[0.3]' : 'hover:scale-[1.02] shadow-sm'}`}>
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-[10px] text-white/90 tracking-tight">{eventInfo.timeText}</span>
            {route.schedule_id && (
              <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/20" title="Recurrente">
                <Clock3 size={8} className="text-white" />
              </div>
            )}
            {(status === 'active' || status === 'en_transito') && (
              <Truck size={10} className="animate-pulse text-white shrink-0" />
            )}
          </div>
          {['completed', 'finalizada', 'completada'].includes(status) && (
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          )}
        </div>
        <p className="text-[11px] font-bold text-white leading-tight truncate">{event.title.split('|')[0].trim()}</p>
        <p className="text-[9px] font-medium text-white/70 truncate mt-1 uppercase tracking-wider">{route.driver_name || 'Sin conductor'}</p>
        {status === 'active' && route.progress > 0 && (
          <div className="mt-auto h-0.5 w-full bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white" style={{ width: `${route.progress}%` }} />
          </div>
        )}
      </div>
    );
  }, []);

  const FilterSelect = ({ icon: Icon, value, onChange, options, placeholder, className = "" }) => {
    const isActive = !!value;
    return (
      <div className={`relative flex items-center group transition-all duration-300 ${className}`}>
        <div className={`absolute left-3.5 z-10 pointer-events-none transition-colors duration-300 ${isActive ? 'text-primary-600' : 'text-surface-400 group-hover:text-surface-600'}`}>
          <Icon size={16} strokeWidth={2.5} />
        </div>
        <select
          value={value}
          onChange={onChange}
          className={`w-full appearance-none h-[40px] pl-10 pr-9 text-[13px] font-bold rounded-xl border transition-all duration-300 outline-none cursor-pointer
            ${isActive 
              ? 'bg-primary-50/80 border-primary-300 text-primary-900 ring-2 ring-primary-500/10' 
              : 'bg-white border-surface-200 text-surface-700 hover:border-surface-400 hover:shadow-sm'
            }`}
        >
          <option value="">{placeholder}</option>
          {options.map(opt => (
            <option key={opt.id || opt.value || opt} value={opt.id || opt.value || opt}>
              {opt.name || opt.label || opt}
            </option>
          ))}
        </select>
        <div className={`absolute right-3 z-10 pointer-events-none transition-all duration-300 ${isActive ? 'text-primary-500 rotate-180' : 'text-surface-400'}`}>
          <ChevronDown size={14} strokeWidth={2.5} />
        </div>
      </div>
    );
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedDriverId('');
    setSelectedOrigin('');
    setSelectedDestination('');
    setSelectedTripType('');
  };

  const anyFilterActive = searchTerm || selectedDriverId || selectedOrigin || selectedDestination || selectedTripType;

  return (
    <div className="space-y-8">
      {loading ? (
        <Skeleton className="h-[220px] w-full" />
      ) : (
        <RoutesHero active={stats.active} pending={stats.pending} completed={stats.completed} />
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(22rem,40%)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-[1.8rem] border border-white/70 bg-white/88 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
          <div className="p-5 border-b border-surface-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-500/20">
                  <Truck size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="font-display text-xl font-black tracking-tight text-surface-950 leading-tight">Control de Rutas</h2>
                  <p className="text-[9px] font-black text-surface-400 uppercase tracking-[0.2em] mt-0.5">Operativa Logística</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <div className="flex bg-surface-100 p-1 rounded-xl border border-surface-200/50 flex-1 sm:flex-none">
                  <button onClick={() => setViewMode('calendar')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-primary-700' : 'text-surface-500 hover:text-surface-700'}`}><Calendar size={13} strokeWidth={2.5}/> Calendario</button>
                  <button onClick={() => setViewMode('list')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary-700' : 'text-surface-500 hover:text-surface-700'}`}><List size={13} strokeWidth={2.5}/> Lista</button>
                </div>
                <Button size="md" className="flex-1 sm:flex-none whitespace-nowrap px-5 h-9 text-xs" onClick={() => { setEditingRoute(null); setShowForm(true); }}>
                  <Plus size={16} strokeWidth={3} className="mr-1.5" /> Nuevo
                </Button>
              </div>
            </div>

            <div className="bg-surface-50/50 rounded-2xl border border-surface-100/80 px-3 py-2 flex items-center gap-3">
              <div className="relative group shrink-0">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-surface-400 group-focus-within:text-primary-500 transition-colors">
                  <Search size={16} strokeWidth={2.5} />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 w-10 group-focus-within:w-44 bg-white border border-surface-200 rounded-xl outline-none transition-all duration-300 focus:pl-10 focus:pr-4 cursor-pointer focus:cursor-text shadow-sm"
                  placeholder=""
                />
              </div>

              <div className="h-6 w-px bg-surface-200/60 hidden md:block" />

              <div className="grid grid-cols-2 lg:flex lg:items-center gap-2 flex-1">
                <FilterSelect 
                  icon={User}
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  options={uniqueDrivers}
                  placeholder="Conductor"
                  className="w-full lg:w-[150px]"
                />
                <FilterSelect 
                  icon={MapPin}
                  value={selectedOrigin}
                  onChange={(e) => setSelectedOrigin(e.target.value)}
                  options={uniqueOrigins.map(o => ({ value: o, label: o }))}
                  placeholder="Origen"
                  className="w-full lg:w-[125px]"
                />
                <FilterSelect 
                  icon={Flag}
                  value={selectedDestination}
                  onChange={(e) => setSelectedDestination(e.target.value)}
                  options={uniqueDestinations.map(d => ({ value: d, label: d }))}
                  placeholder="Destino"
                  className="w-full lg:w-[125px]"
                />
                <FilterSelect 
                  icon={Layers}
                  value={selectedTripType}
                  onChange={(e) => setSelectedTripType(e.target.value)}
                  options={[{ value: 'single', label: 'Único' }, { value: 'schedule', label: 'Tipo' }]}
                  placeholder="Tipo"
                  className="w-full lg:w-[125px]"
                />

                {anyFilterActive && (
                  <button onClick={handleClearFilters} className="flex shrink-0 items-center justify-center h-9 w-9 text-surface-400 hover:text-danger-600 transition-all bg-white border border-surface-200 rounded-xl hover:bg-danger-50 shadow-sm" title="Limpiar"><X size={14} strokeWidth={3} /></button>
                )}
              </div>
            </div>
          </div>
          <div className="p-4" style={{ height: 'calc(100vh - 18rem)' }}>
            {viewMode === 'calendar' ? (
              <div className="h-full bg-white rounded-2xl overflow-hidden shadow-sm border border-surface-100 text-xs sm:text-sm custom-calendar">
                <style>{`
                  .custom-calendar .fc-theme-standard th { border:none; padding: 10px 0; background-color: #f8fafc; font-weight: 600; color: #475569; }
                  .custom-calendar .fc-toolbar-title { font-size: 1.1rem !important; font-weight: 700; color: #0f172a; }
                  .custom-calendar .fc-button-primary { background-color: #0f172a !important; border-color: #0f172a !important; border-radius: 0.5rem; text-transform: capitalize; font-weight: 600; }
                  .custom-calendar .fc-button-active { background-color: #3b82f6 !important; border-color: #3b82f6 !important; }
                  .custom-calendar .fc-event { cursor: pointer; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid rgba(255,255,255,0.2); }
                  .custom-calendar .fc-timegrid-slot { height: 2.5em; }
                  .custom-calendar .fc-v-event .fc-event-main { padding: 4px; }
                  .custom-calendar .fc-scrollgrid { border-radius: 1rem; overflow: hidden; border: none; }
                `}</style>
                <RoutesCalendar 
                  events={calendarEvents}
                  onEventClick={handleEventClick}
                  renderEventContent={renderEventContent}
                />
              </div>
            ) : (
              <div className="h-full overflow-y-auto space-y-3">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
                ) : (
                  filteredListRoutes.map((route) => (
                    <div key={route.id} className={`${selectedRoute?.id === route.id ? 'ring-2 ring-primary-200 ring-offset-2 ring-offset-white rounded-[1.35rem]' : ''}`}>
                      <RouteCard 
                        route={route} 
                        isSelected={selectedRoute?.id === route.id} 
                        onClick={() => setSelectedRoute(route)} 
                        onEdit={() => handleEdit(route)} 
                        onDelete={() => handleDelete(route)} 
                      />
                    </div>
                  ))
                )}
                {!loading && filteredListRoutes.length === 0 && (
                  <EmptyState eyebrow="Sin coincidencias" title="No encontramos viajes con ese criterio" description="Prueba ajustando conductor, codigo o destino para volver a poblar la vista." className="min-h-[15rem] border-surface-100 bg-surface-50/70" />
                )}
              </div>
            )}
           </div>
        </div>

        <div className="relative min-h-[42rem] overflow-hidden rounded-[1.8rem] border border-white/60 bg-[linear-gradient(180deg,#eaf0f7_0%,#dfe8f2_100%)] shadow-[0_24px_70px_-42px_rgba(15,23,42,0.24)]">
          {extendedSelectedRoute ? (
            <>
              <RoutesMap 
                extendedSelectedRoute={extendedSelectedRoute}
                trackingLogs={trackingLogs}
                realProgress={realProgress}
                realRemainingDistance={realRemainingDistance}
              />
              <RouteInfoPanel 
                route={extendedSelectedRoute} 
                onClose={() => setSelectedRoute(null)} 
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAssign={handleAssign}
                realProgress={realProgress}
                realRemainingDistance={realRemainingDistance}
              />
            </>
          ) : (
            <EmptyState
              eyebrow="Mapa en espera"
              title="Selecciona un viaje para abrir el mapa"
              description="Al elegir un viaje mostraremos checkpoints, progreso, ETA y lectura espacial del recorrido."
              className="h-full min-h-[42rem] border-0 bg-transparent"
            />
          )}
        </div>
      </section>

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditingRoute(null); }} title={editingRoute ? 'Editar Viaje / Cronograma' : 'Configurar Nuevo Viaje o Cronograma'}>
        <RouteForm 
          initialData={editingRoute}
          onSuccess={() => { setShowForm(false); setEditingRoute(null); queryClient.invalidateQueries({ queryKey: ['adminRoutes'] }); }} 
          onCancel={() => { setShowForm(false); setEditingRoute(null); }} 
        />
      </Modal>

      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Asignar paquetes a ruta">
        <PackageAssignmentForm
          routeId={assigningRoute?.id}
          onSuccess={() => { setShowAssignModal(false); setAssigningRoute(null); queryClient.invalidateQueries({ queryKey: ['adminRoutes'] }); }}
          onCancel={() => setShowAssignModal(false)}
        />
      </Modal>

    </div>
  );
}

export default RoutesPage;
