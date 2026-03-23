import { useEffect, useState } from 'react';
import { MapPinned, Route, Search, Truck, Calendar, List, User, MapPin, Flag, Layers, ChevronDown, Plus, Filter, X, CalendarRange } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
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
  const [viewMode, setViewMode] = useState('calendar');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const [selectedTripType, setSelectedTripType] = useState('');
  const [clickTimeout, setClickTimeout] = useState(null);

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
      const allRealRoutes = extractData(routesRes);

      const mappedRoutes = allRealRoutes.map(r => ({
        ...r,
        type: 'route',
        driver_name: r.driver?.full_name || 'Sin asignar',
        driver_id: r.driver_id || r.driver?.id || null,
        vehicle_brand: r.vehicles?.brand || 'Vehículo',
        plate_number: r.vehicles?.plate || '--',
      }));

      const mappedSchedules = rawSchedules.map(sch => ({
        ...sch,
        type: 'schedule',
        route_code: sch.label || `SCH-${sch.id.slice(0, 5).toUpperCase()}`,
        status: sch.status || 'schedule',
        driver_name: sch.drivers?.full_name || sch.drivers?.email || 'Sin conductor',
        driver_id: sch.driver_id || sch.drivers?.id || null,
        vehicle_brand: sch.vehicles?.brand || 'Vehículo',
        plate_number: sch.vehicles?.plate || '--',
        progress: 0,
        eta: '--',
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

  const uniqueDrivers = Array.from(new Map(
    routes.filter(r => r.driver_id).map(r => [r.driver_id, { id: r.driver_id, name: r.driver_name }])
  ).values());
  const uniqueOrigins = [...new Set(routes.filter(r => r.origin).map(r => r.origin))].sort();
  const uniqueDestinations = [...new Set(routes.filter(r => r.destination).map(r => r.destination))].sort();

  const driverFilteredRoutes = selectedDriverId 
    ? routes.filter(r => String(r.driver_id) === String(selectedDriverId))
    : routes;

  const locationFilteredRoutes = driverFilteredRoutes.filter(r => {
    if (selectedOrigin && r.origin !== selectedOrigin) return false;
    if (selectedDestination && r.destination !== selectedDestination) return false;
    return true;
  });

  const typeFilteredRoutes = locationFilteredRoutes.filter(r => {
    if (selectedTripType === 'single') return !r.schedule_id && r.type !== 'schedule';
    if (selectedTripType === 'schedule') return !!r.schedule_id || r.type === 'schedule';
    return true;
  });

  const todayStr = new Date().toISOString().split('T')[0];
  
  const listRoutes = typeFilteredRoutes.filter(r => {
    if (r.type === 'schedule') return true;
    if (r.schedule_id && (r.status === 'planeada' || r.status === 'pending')) {
      if (!r.scheduled_date || r.scheduled_date > todayStr) return false;
    }
    return true;
  });

  const filteredListRoutes = listRoutes.filter((route) => route.route_code?.toLowerCase().includes(searchTerm.toLowerCase()) || route.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) || route.origin?.toLowerCase().includes(searchTerm.toLowerCase()) || route.destination?.toLowerCase().includes(searchTerm.toLowerCase()));
  const calendarEvents = typeFilteredRoutes.filter(r => r.type === 'route' && r.departure_time).map(r => {
    const start = new Date(r.departure_time);
    const end = new Date(start.getTime() + ((r.eta_minutes || 120) * 60000));
    
    let bgColor = r.schedule_id ? '#8b5cf6' : '#3b82f6'; // Morado para recurrentes, Azul para únicos
    if (r.status === 'active' || r.status === 'en_transito') bgColor = '#059669'; // Verde
    if (r.status === 'completed' || r.status === 'finalizada') bgColor = '#475569'; // Gris

    return {
      id: r.id,
      title: `${r.route_code} | ${r.origin} - ${r.destination}`,
      start: r.departure_time,
      end: end.toISOString(),
      backgroundColor: bgColor,
      borderColor: 'transparent',
      display: 'block',
      extendedProps: { route: r }
    };
  });

  const active = typeFilteredRoutes.filter((r) => r.type === 'route' && (r.status === 'active' || r.status === 'en_transito')).length;
  const pending = listRoutes.filter((r) => r.type === 'route' && (r.status === 'pending' || r.status === 'planeada')).length;
  const completed = typeFilteredRoutes.filter((r) => r.type === 'route' && (r.status === 'completed' || r.status === 'finalizada')).length;

  const handleEventClick = (info) => {
    const found = routes.find(r => r.id === info.event.extendedProps.route.id);
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
  };

  const renderEventContent = (eventInfo) => {
    const event = eventInfo.event;
    const isPast = new Date(event.start) < new Date();
    const isMonthView = eventInfo.view.type === 'dayGridMonth';

    if (isMonthView) {
      return (
        <div className={`w-full overflow-hidden flex items-center gap-1 px-1 ${isPast && event.extendedProps.route.status === 'planeada' ? 'opacity-70' : ''}`}>
          <span className="font-bold text-[9px] text-white/90 whitespace-nowrap">{eventInfo.timeText}</span>
          <span className="text-[10px] sm:text-xs font-medium text-white truncate">{event.title.split('|')[0].trim()}</span>
          {(event.extendedProps.route.status === 'active' || event.extendedProps.route.status === 'en_transito') && <Truck size={10} className="animate-pulse text-white ml-auto shrink-0" />}
        </div>
      );
    }

    return (
      <div className={`p-1 flex flex-col h-full overflow-hidden leading-tight ${isPast && event.extendedProps.route.status === 'planeada' ? 'opacity-70' : ''}`}>
        <div className="flex justify-between items-center mb-0.5">
          <span className="font-bold text-[10px] sm:text-xs text-white/90">{eventInfo.timeText}</span>
          {(event.extendedProps.route.status === 'active' || event.extendedProps.route.status === 'en_transito') && <Truck size={10} className="animate-pulse text-white" />}
        </div>
        <p className="text-[10px] sm:text-xs font-medium text-white truncate">{event.title}</p>
        <p className="text-[9px] text-white/80 truncate mt-0.5">{event.extendedProps.route.driver_name}</p>
      </div>
    );
  };

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
        <RoutesHero active={active} pending={pending} completed={completed} />
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
                <Button variant="secondary" size="md" className="flex-1 sm:flex-none whitespace-nowrap px-4 h-9 text-xs" onClick={handleGenerateRoutes}>
                  <CalendarRange size={16} strokeWidth={2.5} className="mr-1.5" /> Proyectar Semana
                </Button>
                <Button size="md" className="flex-1 sm:flex-none whitespace-nowrap px-5 h-9 text-xs" onClick={() => { setEditingRoute(null); setShowForm(true); }}>
                  <Plus size={16} strokeWidth={3} className="mr-1.5" /> Nuevo
                </Button>
              </div>
            </div>

            <div className="bg-surface-50/50 rounded-2xl border border-surface-100/80 px-3 py-2 flex items-center gap-3">
              {/* Compact Search */}
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

              {/* Filters Flex Row - ensuring no wrap on desktop if possible, or tight grid */}
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
                  options={[
                    { value: 'single', label: 'Único' },
                    { value: 'schedule', label: 'Tipo' }
                  ]}
                  placeholder="Tipo"
                  className="w-full lg:w-[125px]"
                />

                {anyFilterActive && (
                  <button 
                    onClick={handleClearFilters}
                    className="flex shrink-0 items-center justify-center h-9 w-9 text-surface-400 hover:text-danger-600 transition-all bg-white border border-surface-200 rounded-xl hover:bg-danger-50 shadow-sm"
                    title="Limpiar"
                  >
                    <X size={14} strokeWidth={3} />
                  </button>
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
                <FullCalendar
                  plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
                  initialView="timeGridWeek"
                  headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
                  events={calendarEvents}
                  eventClick={handleEventClick}
                  eventContent={renderEventContent}
                  height="100%"
                  slotMinTime="05:00:00"
                  slotMaxTime="23:00:00"
                  allDaySlot={false}
                  locale="es"
                  buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día' }}
                />
              </div>
            ) : (
              <div className="h-full overflow-y-auto space-y-3">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
                ) : (
                  filteredListRoutes.map((route) => <div key={route.id} className={`${selectedRoute?.id === route.id ? 'ring-2 ring-primary-200 ring-offset-2 ring-offset-white rounded-[1.35rem]' : ''}`}><RouteCard route={route} isSelected={selectedRoute?.id === route.id} onClick={() => setSelectedRoute(route)} onEdit={() => handleEdit(route)} onDelete={() => handleDelete(route)} /></div>)
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
