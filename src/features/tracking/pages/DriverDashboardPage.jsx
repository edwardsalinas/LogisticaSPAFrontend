import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Truck, Navigation, Play, Square, Activity, MapPin, Search, Calendar as CalendarIcon, Package } from 'lucide-react';
import { Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import Badge from '../../../components/atoms/Badge';
import Button from '../../../components/atoms/Button';
import BaseMap from '../../../components/molecules/BaseMap';
import StatCard from '../../../components/molecules/StatCard';
import PageSkeleton from '../../../components/organisms/PageSkeleton';
import RoutePath from '../../../components/molecules/RoutePath';
import CheckpointMarker from '../../../components/molecules/CheckpointMarker';
import OriginDestMarker from '../../../components/molecules/OriginDestMarker';
import VehicleMarker from '../../../components/molecules/VehicleMarker';
import { heroImages } from '../../../constants/heroImages';
import apiService from '../../../services/apiService';
import { haversineDistance, calculateTripProgress } from '../../../utils/geoUtils';

const GPS_INTERVAL_MS = 30000;

// Componente de Calendario Memoizado para evitar re-renders por GPS
// Componente de Mapa Memoizado para aislar actualizaciones de GPS
const DashboardMap = memo(({ 
  currentPosition, 
  activeRouteData, 
  isActive, 
  activeTrip, 
  completedCheckpointIds, 
  isFinished, 
  eventsSent 
}) => {
  const center = currentPosition || (activeRouteData ? [activeRouteData.origin_lat || -16.5, activeRouteData.origin_lng || -68.15] : [-16.5, -68.15]);

  return (
    <BaseMap center={center} zoom={13} className="h-full w-full rounded-[1.6rem]">
      {activeRouteData && <RoutePath route={activeRouteData} isCompleted={isFinished} />}
      
      {activeRouteData?.origin_lat && (
        <OriginDestMarker type="origin" position={[activeRouteData.origin_lat, activeRouteData.origin_lng]} title={activeRouteData.origin} subtitle="Punto de partida" />
      )}
      {activeRouteData?.dest_lat && (
        <OriginDestMarker type="dest" position={[activeRouteData.dest_lat, activeRouteData.dest_lng]} title={activeRouteData.destination} subtitle="Meta final" />
      )}

      {activeRouteData?.checkpoints?.map((cp) => (
        <CheckpointMarker key={cp.id} checkpoint={cp} isCompleted={completedCheckpointIds.includes(cp.id)} />
      ))}

      {(currentPosition || (isFinished && activeRouteData?.dest_lat)) && (
        <VehicleMarker 
          position={isFinished ? [activeRouteData.dest_lat, activeRouteData.dest_lng] : currentPosition} 
          title="Tu Ubicación" 
          subtitle={activeRouteData?.plate_number || 'Vehículo'} 
          isFinished={isFinished}
        />
      )}
    </BaseMap>
  );
});

const DashboardCalendar = memo(({ events, onEventClick, renderEventContent }) => (
  <FullCalendar
    plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
    initialView="timeGridDay"
    headerToolbar={{ left: 'prev,next', center: 'title', right: 'timeGridDay,timeGridWeek,dayGridMonth' }}
    events={events}
    eventClick={onEventClick}
    eventContent={renderEventContent}
    height="100%"
    allDaySlot={false}
    locale="es"
    slotMinTime="06:00:00"
    slotMaxTime="22:00:00"
    dayMaxEvents={true}
    buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día' }}
  />
));

function DriverDashboardPage() {
  const queryClient = useQueryClient();
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [toggling, setToggling] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [eventsSent, setEventsSent] = useState(0);
  const [completedCheckpointIds, setCompletedCheckpointIds] = useState([]);
  const [deliveringPkgId, setDeliveringPkgId] = useState(null);

  // --- REACT QUERY ---
  const { data: activeTrip, isLoading: loadingTrip } = useQuery({
    queryKey: ['activeTrip'],
    queryFn: async () => {
      const res = await apiService.getActiveTrip();
      return res?.data || null;
    },
    staleTime: 10000
  });

  const { data: routes = [], isLoading: loadingRoutes } = useQuery({
    queryKey: ['driverRoutes'],
    queryFn: async () => {
      const res = await apiService.getRoutes();
      return Array.isArray(res) ? res : (res?.data || []);
    },
    staleTime: 60000
  });

  const { data: activeRouteDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ['routeDetails', selectedRouteId],
    queryFn: async () => {
      if (!selectedRouteId) return null;
      const res = await apiService.getRoute(selectedRouteId);
      return res.data;
    },
    enabled: !!selectedRouteId,
    staleTime: 30000
  });

  // Sincronizar selectedRouteId y checkpoints alcanzados cuando carga el trip activo
  useEffect(() => {
    if (activeTrip) {
      setSelectedRouteId(activeTrip.route_id);
      const reached = activeTrip.events
        ?.filter(e => e.type === 'checkpoint_reached' || (e.data && e.data.checkpoint_id))
        .map(e => e.checkpoint_id || e.data.checkpoint_id) || [];
      setCompletedCheckpointIds(reached);
    }
  }, [activeTrip]);

  const loading = loadingTrip || loadingRoutes;

  // --- DATOS DERIVADOS MEMOIZADOS ---
  const isActive = !!activeTrip;
  const activeRouteData = activeRouteDetails || routes.find(r => String(r.id) === String(selectedRouteId));
  const isFinished = useMemo(() => 
    ['completed', 'finalizada', 'completada'].includes(activeRouteData?.status),
  [activeRouteData?.status]);

  const realProgress = useMemo(() => {
    if (!isActive || !activeRouteData) return 0;
    return calculateTripProgress(
      activeRouteData.checkpoints?.length || 0,
      completedCheckpointIds.length,
      activeRouteData.packages?.length || 0,
      (activeRouteData.packages?.filter(p => p.status === 'delivered' || p.status === 'completada') || []).length
    );
  }, [isActive, activeRouteData, completedCheckpointIds]);

  const calendarEvents = useMemo(() => {
    return routes.filter(r => r.departure_time).map(r => {
      const start = new Date(r.departure_time);
      if (isNaN(start.getTime())) return null;
      
      const status = r.status;
      const isCompleted = ['completed', 'finalizada', 'completada'].includes(status);
      const isActiveStatus = ['active', 'en_transito'].includes(status);
      
      let end;
      let isEstimated = false;

      if (isCompleted) {
        // Si finalizó y tenemos hora de llegada real, usarla. Si no, estimar 2h.
        end = r.arrival_time ? new Date(r.arrival_time) : new Date(start.getTime() + (120 * 60000));
      } else if (isActiveStatus) {
        // Viaje en curso: se extiende hasta "ahora" para mostrar progreso real.
        end = new Date();
        // Si "ahora" es antes de la salida (raro pero posible), sumar 30m para visibilidad
        if (end < start) end = new Date(start.getTime() + (30 * 60000));
      } else {
        // Pendiente: es una estimación.
        end = new Date(start.getTime() + ((r.eta_minutes || 120) * 60000));
        isEstimated = true;
      }
      
      let bgColor = '#3b82f6';
      if (isActiveStatus) bgColor = '#10b981';
      if (isCompleted) bgColor = '#18181b';

      return {
        id: String(r.id),
        title: `${r.route_code || 'S/C'} | ${r.origin || ''} - ${r.destination || ''}`,
        start: r.departure_time,
        end: end.toISOString(),
        backgroundColor: bgColor,
        borderColor: 'transparent',
        display: 'block',
        extendedProps: { route: r, isEstimated }
      };
    }).filter(Boolean);
  }, [routes]);
  const renderEventContent = useCallback((eventInfo) => {
    const { event } = eventInfo;
    const isPast = new Date(event.start) < new Date();
    const isMonthView = eventInfo.view.type === 'dayGridMonth';
    const routeStatus = event.extendedProps.route?.status;

    const isEstimated = event.extendedProps.isEstimated;
    const route = event.extendedProps.route;
    
    if (isMonthView) {
      return (
        <div className={`w-full overflow-hidden flex items-center gap-1.5 px-1.5 py-0.5 rounded-md ${isPast && routeStatus === 'planeada' ? 'opacity-60' : ''}`} style={isEstimated ? { maskImage: 'linear-gradient(to right, black 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 100%)' } : {}}>
          <span className="font-bold text-[9px] text-white/90 whitespace-nowrap">{eventInfo.timeText}</span>
          <span className="text-[10px] font-semibold text-white truncate">{event.title.split('|')[0].trim()}</span>
          {(['active', 'en_transito'].includes(routeStatus)) && <Truck size={10} className="animate-pulse text-white ml-auto shrink-0" />}
        </div>
      );
    }

    return (
      <div 
        className={`p-2 flex flex-col h-full overflow-hidden leading-tight rounded-md border-l-4 border-white/20 transition-all ${isPast && routeStatus === 'planeada' ? 'opacity-60 grayscale-[0.3]' : 'hover:scale-[1.02] shadow-sm'}`}
        style={isEstimated ? { maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)' } : {}}
      >
        <div className="flex justify-between items-center mb-1.5">
          <div className="flex items-center gap-1.5">
            {(['active', 'en_transito'].includes(routeStatus)) ? (
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400/30">
                <Truck size={10} className="animate-pulse text-white" />
              </div>
            ) : (
              <span className="font-black text-[10px] text-white/90 tracking-tight uppercase">Salida: {eventInfo.timeText.split('-')[0]}</span>
            )}
          </div>
          {['completed', 'finalizada', 'completada'].includes(routeStatus) && (
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          )}
        </div>
        
        <p className="text-[11px] font-black text-white leading-none truncate mb-1">
          {event.title.split('|')[0].trim()}
        </p>
        
        <p className="text-[9px] font-bold text-white/70 truncate uppercase tracking-wider mb-2">
          {event.title.split('|')[1]?.trim() || '---'}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/10 pt-1.5">
          <span className="text-[8px] font-black text-white/50 uppercase tracking-widest">
            {isEstimated ? 'Estimado' : 'Real'}
          </span>
          {['completed', 'finalizada', 'completada'].includes(routeStatus) ? (
             <span className="text-[9px] font-black text-emerald-300">Llegada: {new Date(route.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          ) : (
             <span className="text-[9px] font-black text-white/90">ETA: {eventInfo.timeText.split('-')[1]}</span>
          )}
        </div>
      </div>
    );
  }, []);

  const handleEventClick = useCallback((info) => {
    setSelectedRouteId(info.event.id);
  }, []);
  
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const lastPositionRef = useRef(null);

  const handleDeliverPackage = async (packageId) => {
    setDeliveringPkgId(packageId);
    try {
      await apiService.deliverPackage(packageId);
      // Actualizar caché de React Query
      queryClient.setQueryData(['routeDetails', selectedRouteId], prev => {
        if (!prev) return prev;
        return {
          ...prev,
          packages: prev.packages.map(p => 
            p.id === packageId ? { ...p, status: 'delivered' } : p
          )
        };
      });
      // Notificar cambio de progreso al admin
      queryClient.invalidateQueries({ queryKey: ['driverRoutes'] });
    } catch (err) {
      console.error('Error entregando paquete:', err);
    } finally {
      setDeliveringPkgId(null);
    }
  };

  const handleCheckpointCheck = async (checkpointId) => {
    if (!activeTrip || completedCheckpointIds.includes(checkpointId)) return;

    try {
      await apiService.logTripEvent(activeTrip.id, {
        checkpoint_id: checkpointId,
        status: 'reached',
        type: 'checkpoint_reached'
      });
      setCompletedCheckpointIds(prev => [...prev, checkpointId]);
    } catch (err) {
      console.error('Error marcando checkpoint:', err);
    }
  };

  const stopGpsTracking = useCallback(() => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    watchIdRef.current = null;
    intervalRef.current = null;
  }, []);

  const isStoppingRef = useRef(false);

  const handleStopTrip = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    setToggling(true);
    
    // 1. Detener el tracking localmente DE INMEDIATO
    stopGpsTracking();
    
    try {
      // 2. Notificar al servidor
      await apiService.stopTrip();
      
      // 3. Limpiar estado local y refrescar queries
      setCurrentPosition(null);
      setCompletedCheckpointIds([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['activeTrip'] }),
        queryClient.invalidateQueries({ queryKey: ['driverRoutes'] }),
        queryClient.invalidateQueries({ queryKey: ['routeDetails', selectedRouteId] })
      ]);
    } catch (err) {
      console.error('Error al finalizar viaje:', err);
      // Intentar limpiar igual si el error es que ya estaba cerrado
      if (err.status === 400 || (err.message && err.message.includes('ya ha sido completado'))) {
        queryClient.invalidateQueries({ queryKey: ['activeTrip'] });
      } else {
        alert(err.message || 'Error al finalizar viaje');
      }
    } finally {
      setToggling(false);
      isStoppingRef.current = false;
    }
  }, [stopGpsTracking, queryClient, selectedRouteId]);

  const handleStartTrip = useCallback(async () => {
    if (!selectedRouteId) {
      alert('Por favor selecciona una ruta para iniciar el viaje');
      return;
    }
    setToggling(true);
    try {
      await apiService.startTrip(selectedRouteId);
      setEventsSent(0);
      setCompletedCheckpointIds([]);
      
      // Invalidar queries para refrescar estado global
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['activeTrip'] }),
        queryClient.invalidateQueries({ queryKey: ['driverRoutes'] }),
        queryClient.invalidateQueries({ queryKey: ['routeDetails', selectedRouteId] })
      ]);
    } catch (err) {
      alert(err.message || 'Error al iniciar viaje');
    } finally {
      setToggling(true);
      setToggling(false);
    }
  }, [selectedRouteId, queryClient]);

  const sendPosition = useCallback(async () => {
    const pos = lastPositionRef.current;
    if (!pos || !activeTrip || isStoppingRef.current) return;

    try {
      const res = await apiService.logTripEvent(activeTrip.id, {
        lat: pos.latitude,
        lng: pos.longitude,
        status: 'in_transit'
      });
      setEventsSent((prev) => prev + 1);

      const status = res.data?.status?.toLowerCase() || '';
      if (status.includes('llegó') || status.includes('destino')) {
        handleStopTrip();
      }
    } catch (err) {
      console.error('Error enviando posición:', err);
    }
  }, [activeTrip, handleStopTrip]);

  const startGpsTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocalización no soportada');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentPosition({ lat: latitude, lng: longitude });
        lastPositionRef.current = position.coords;
      },
      (error) => setGpsError(`Error GPS: ${error.message}`),
      { enableHighAccuracy: true }
    );
    watchIdRef.current = watchId;
    intervalRef.current = setInterval(sendPosition, GPS_INTERVAL_MS);
  }, [sendPosition]);

  useEffect(() => {
    if (activeTrip) startGpsTracking();
    return () => stopGpsTracking();
  }, [activeTrip, startGpsTracking, stopGpsTracking]);

  if (loading) return <PageSkeleton stats={3} layout="map" />;

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="relative overflow-hidden rounded-[1.7rem] border border-white/70 bg-[linear-gradient(135deg,#06111f_0%,#0b1d34_35%,#f8fbff_100%)] p-6 shadow-[0_28px_80px_-48px_rgba(2,36,72,0.7)] sm:rounded-[2rem] sm:p-8">
        <div className="absolute inset-0">
          <img src={heroImages.fleet.url} alt="Operacion Conductor" className="h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(6,17,31,0.94)_0%,rgba(11,29,52,0.84)_38%,rgba(11,29,52,0.34)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_34%)]" />
        </div>
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.95fr)] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-emerald-100/85 backdrop-blur">
              <Truck size={14} strokeWidth={2.2} /> Modo Conduccion
            </div>
            <h1 className="mt-5 max-w-3xl font-display text-[clamp(2rem,4.5vw,3.8rem)] font-semibold tracking-[-0.06em] text-white break-all sm:break-normal">Panel Operativo</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Inicia tu viaje para habilitar el seguimiento GPS y compartir tu ubicacion en linea con el centro de control.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <div className="rounded-[1.4rem] border border-white/10 bg-white/7 p-4 text-white backdrop-blur-sm">
              <p className="text-[0.64rem] uppercase tracking-[0.18em] text-slate-300">Estado satelital</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-display text-2xl font-semibold tracking-[-0.05em]">{isActive ? 'Transmitiendo' : 'En pausa'}</span>
                {isActive ? <Activity size={18} className="text-emerald-400" strokeWidth={2.2} /> : <Search size={18} className="text-slate-400" strokeWidth={2.2} />}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Las tarjetas de estadísticas se movieron al interior del mapa como overlays flotantes */}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-4 flex flex-col gap-4">
          <div className="rounded-[1.6rem] border border-surface-100 bg-white shadow-xl overflow-hidden flex flex-col h-full min-h-[500px]">
            <div className={`p-5 border-b flex items-center justify-between ${isActive ? 'bg-emerald-50 border-emerald-100' : 'bg-surface-50 border-surface-100'}`}>
              <div>
                <h2 className="text-lg font-display font-bold text-surface-900 leading-tight">Itinerario de Viajes</h2>
                <p className="text-[10px] uppercase tracking-wider text-surface-500 font-bold mt-0.5">Gestión Operativa</p>
              </div>
              {isActive && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-bold animate-pulse">
                  <Activity size={12} /> EN TRÁNSITO
                </div>
              )}
            </div>

            <div className="flex-1 overflow-hidden p-4 text-xs custom-driver-calendar">
              <style>{`
                .custom-driver-calendar .fc-toolbar { margin-bottom: 1rem !important; }
                .custom-driver-calendar .fc-toolbar-title { font-size: 0.9rem !important; font-weight: 800; }
                .custom-driver-calendar .fc-button { padding: 4px 8px !important; font-size: 0.75rem !important; border-radius: 8px !important; }
                .custom-driver-calendar .fc-theme-standard td, .custom-driver-calendar .fc-theme-standard th { border-color: #f1f5f9; }
                .custom-driver-calendar .fc-event { cursor: pointer; border: none; }
              `}</style>
              <DashboardCalendar 
                events={calendarEvents}
                onEventClick={handleEventClick}
                renderEventContent={renderEventContent}
              />
            </div>
            
            <div className="mt-auto border-t border-surface-100 bg-surface-50">
              {!(activeRouteData || activeTrip) ? (
                <div className="p-8 flex flex-col items-center text-center gap-3">
                  <div className="h-14 w-14 rounded-2xl bg-primary-50 text-primary-500 flex items-center justify-center">
                    <CalendarIcon size={28} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-surface-900">Selecciona una ruta</h3>
                    <p className="text-xs text-surface-500 mt-1 max-w-[200px]">Toca un evento del calendario para gestionar.</p>
                  </div>
                </div>
              ) : (
                <div className="p-0">
                  <div className="p-5 border-b border-surface-100 bg-surface-50/50">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${isActive ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-primary-500 text-white shadow-primary-200'}`}>
                          {isActive ? <Truck size={22} strokeWidth={2.5} /> : <Navigation size={22} strokeWidth={2.5} />}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[10px] font-black uppercase tracking-[0.15em] ${isActive ? 'text-emerald-600' : 'text-primary-600'}`}>
                            {isActive ? 'Misión en Curso' : 'Ruta Seleccionada'}
                          </p>
                          <p className="text-base font-black text-surface-900 truncate tracking-tight">
                            {(activeRouteData || activeTrip?.route)?.route_code || '---'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="shrink-0">
                        {isActive ? (
                          <Button 
                            variant="danger" 
                            className="px-5 py-2.5 h-auto text-[11px] font-black uppercase tracking-widest gap-2 shadow-xl shadow-danger-100/50 border-none rounded-xl" 
                            onClick={handleStopTrip} 
                            disabled={toggling}
                          >
                            {toggling ? '...' : <><Square fill="currentColor" size={12} stroke="none" /> Finalizar</>}
                          </Button>
                        ) : (
                          <Button 
                            className={`${(isFinished || !selectedRouteId) ? 'bg-surface-200 text-surface-400 border-surface-200 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200/60 shadow-xl'} px-5 py-2.5 h-auto text-[11px] font-black uppercase tracking-widest gap-2 transition-all active:scale-95 border-none rounded-xl`} 
                            onClick={handleStartTrip} 
                            disabled={toggling || !selectedRouteId || isFinished}
                          >
                            {toggling ? '...' : isFinished ? 'Completado' : <><Play fill="currentColor" size={12} stroke="none" /> Iniciar</>}
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-4">
                      <div className="relative pl-4 border-l-2 border-primary-500/30">
                        <p className="text-[9px] font-black text-surface-400 uppercase tracking-widest leading-none">Origen</p>
                        <p className="mt-1.5 text-xs font-bold text-surface-800 truncate">{(activeRouteData || activeTrip?.route)?.origin || '---'}</p>
                      </div>
                      <div className="relative pl-4 border-l-2 border-emerald-500/30">
                        <p className="text-[9px] font-black text-surface-400 uppercase tracking-widest leading-none">Destino</p>
                        <p className="mt-1.5 text-xs font-bold text-surface-800 truncate">{(activeRouteData || activeTrip?.route)?.destination || '---'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-6">

                  {isActive && (
                    <div className="pt-2">
                       <div className="flex justify-between items-center mb-1.5">
                         <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Progreso del Viaje</span>
                         <span className="text-[11px] font-black text-primary-600">{realProgress}%</span>
                       </div>
                       <div className="h-1.5 w-full bg-surface-200 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-primary-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" 
                           style={{ width: `${realProgress}%` }}
                         />
                       </div>
                    </div>
                  )}

                  {isActive && (activeRouteData?.checkpoints?.length > 0) && (
                    <div className="pt-0">
                      <p className="text-[10px] font-black text-surface-400 uppercase tracking-[0.2em] mb-3 px-1">Checkpoints de Control</p>
                      <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                        {[...(activeRouteData?.checkpoints || [])]
                          .sort((a,b) => (a.sequence_order || 0) - (b.sequence_order || 0))
                          .map(cp => {
                            const isReached = completedCheckpointIds.includes(cp.id);
                            return (
                              <div key={cp.id} className={`group flex items-center justify-between p-2.5 rounded-2xl border transition-all duration-300 ${isReached ? 'bg-emerald-50/50 border-emerald-100/50' : 'bg-white border-surface-100 hover:border-surface-200 hover:shadow-md hover:shadow-surface-100/60'}`}>
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-colors ${isReached ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-surface-100 text-surface-400'}`}>
                                    {isReached ? '✓' : cp.sequence_order}
                                  </div>
                                  <div className="min-w-0">
                                    <span className={`text-[11px] font-bold block truncate leading-none ${isReached ? 'text-emerald-900' : 'text-surface-700'}`}>{cp.name}</span>
                                    {isReached && <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mt-0.5 block">Alcanzado</span>}
                                  </div>
                                </div>
                                {!isReached && (
                                  <button 
                                    onClick={() => handleCheckpointCheck(cp.id)}
                                    className="text-[9px] font-black text-primary-600 hover:text-white hover:bg-primary-600 uppercase tracking-widest px-3 py-1.5 rounded-lg bg-primary-50 active:scale-95 transition-all border border-primary-100/30"
                                  >
                                    Validar
                                  </button>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {isActive && (activeRouteData?.packages?.length > 0) && (
                    <div className="pt-2 border-t border-surface-100/80">
                      <p className="text-[10px] font-black text-surface-400 uppercase tracking-[0.2em] mb-3 px-1">Carga a Entregar</p>
                      <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                        {activeRouteData.packages.map(pkg => {
                          const isDelivered = pkg.status === 'delivered' || pkg.status === 'completada';
                          const isDelivering = deliveringPkgId === pkg.id;
                          return (
                            <div key={pkg.id} className={`group flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 ${isDelivered ? 'bg-slate-50 border-slate-200/50 grayscale-[0.4]' : 'bg-white border-surface-100 hover:border-surface-200 hover:shadow-md hover:shadow-surface-100/60'}`}>
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 transition-all ${isDelivered ? 'bg-slate-200 text-slate-500' : 'bg-emerald-50 text-emerald-600 group-hover:scale-110'}`}>
                                  <Package size={18} strokeWidth={2.5} />
                                </div>
                                <div className="min-w-0">
                                  <p className={`text-[12px] font-black tracking-tight ${isDelivered ? 'text-slate-500' : 'text-surface-900'}`}>{pkg.tracking_code}</p>
                                  <p className="text-[10px] text-surface-400 truncate mt-0.5 leading-none">{pkg.destino}</p>
                                </div>
                              </div>
                              <div className="shrink-0 pl-2">
                                {!isDelivered ? (
                                  <button 
                                    onClick={() => handleDeliverPackage(pkg.id)}
                                    disabled={isDelivering}
                                    className="text-[9px] font-black text-emerald-700 hover:text-white hover:bg-emerald-600 uppercase tracking-widest px-3.5 py-2 rounded-xl bg-emerald-50 active:scale-95 transition-all border border-emerald-100/50"
                                  >
                                    {isDelivering ? '...' : 'Entregar'}
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-100/50 text-emerald-700 border border-emerald-100">
                                    <span className="text-[9px] font-black uppercase tracking-wider">Éxito</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-8">
          <div className="h-[65vh] min-h-[35rem] overflow-hidden rounded-[2rem] border border-white/60 bg-white p-3 shadow-2xl relative">
            <DashboardMap 
              currentPosition={currentPosition}
              activeRouteData={activeRouteData}
              isActive={isActive}
              activeTrip={activeTrip}
              completedCheckpointIds={completedCheckpointIds}
              isFinished={isFinished}
              eventsSent={eventsSent}
            />
            
            {!isActive && !selectedRouteId && !currentPosition && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-900/15 backdrop-blur-sm z-[1000] rounded-[1.6rem] pointer-events-none m-3">
                <div className="bg-white/95 p-8 rounded-2xl shadow-2xl text-center border border-white/20 max-w-sm">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-100 text-surface-400 mb-4">
                    <Navigation size={28} />
                  </div>
                  <h3 className="font-display text-xl font-bold text-surface-900">GPS en espera</h3>
                  <p className="mt-2 text-sm text-surface-500">El seguimiento por geolocalización iniciará automáticamente al arrancar el viaje.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(19, 127, 236, 0.4); }
          70% { box-shadow: 0 0 0 12px rgba(19, 127, 236, 0); }
          100% { box-shadow: 0 0 0 0 rgba(19, 127, 236, 0); }
        }
      `}</style>
    </div>
  );
}

export default DriverDashboardPage;
