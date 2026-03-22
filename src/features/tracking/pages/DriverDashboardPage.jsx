import { useState, useEffect, useRef, useCallback } from 'react';
import { Truck, Navigation, Play, Square, Activity, MapPin, Search, Calendar as CalendarIcon } from 'lucide-react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

import Badge from '../../../components/atoms/Badge';
import Button from '../../../components/atoms/Button';
import BaseMap from '../../../components/molecules/BaseMap';
import StatCard from '../../../components/molecules/StatCard';
import PageSkeleton from '../../../components/organisms/PageSkeleton';
import RoutePath from '../../../components/molecules/RoutePath';
import CheckpointMarker from '../../../components/molecules/CheckpointMarker';
import OriginDestMarker from '../../../components/molecules/OriginDestMarker';
import { heroImages } from '../../../constants/heroImages';
import apiService from '../../../services/apiService';

const GPS_INTERVAL_MS = 30000; // Enviar posición cada 30 segundos

const vehicleIcon = L.divIcon({
  className: 'custom-vehicle-marker',
  html: `
    <div style="
      background: linear-gradient(135deg, #137fec 0%, #0d5bbd 100%);
      border: 3px solid white;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 3px 14px rgba(19, 127, 236, 0.5);
      animation: pulse 2s infinite;
    ">
      🚛
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

/**
 * Calcula la distancia entre dos puntos (Haversine) en metros.
 */
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Dashboard del conductor con toggle de viaje adaptado a nueva UI.
 */
function DriverDashboardPage() {
  const [activeTrip, setActiveTrip] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [eventsSent, setEventsSent] = useState(0);
  const [completedCheckpointIds, setCompletedCheckpointIds] = useState([]);

  // --- DATOS DERIVADOS ---
  const isActive = !!activeTrip;
  const activeRouteData = routes.find(r => r.id === selectedRouteId);

  // Transformar rutas para el calendario
  const calendarEvents = routes.filter(r => r.departure_time).map(r => {
    const start = new Date(r.departure_time);
    const end = new Date(start.getTime() + (120 * 60000)); // 2h por defecto
    
    let bgColor = r.schedule_id ? '#8b5cf6' : '#3b82f6';
    if (r.status === 'active' || r.status === 'en_transito') bgColor = '#10b981';
    if (r.status === 'completed' || r.status === 'finalizada') bgColor = '#64748b';

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

  const renderEventContent = (eventInfo) => {
    const { event } = eventInfo;
    const isPast = new Date(event.start) < new Date();
    const isMonthView = eventInfo.view.type === 'dayGridMonth';

    if (isMonthView) {
      return (
        <div className={`w-full overflow-hidden flex items-center gap-1 px-1 ${isPast && event.extendedProps.route?.status === 'laneada' ? 'opacity-70' : ''}`}>
          <span className="font-bold text-[9px] text-white/90 whitespace-nowrap">{eventInfo.timeText}</span>
          <span className="text-[10px] font-medium text-white truncate">{event.title.split('|')[0].trim()}</span>
          {(['active', 'en_transito'].includes(event.extendedProps.route?.status)) && <Truck size={10} className="animate-pulse text-white ml-auto shrink-0" />}
        </div>
      );
    }
    return (
      <div className={`p-1 flex flex-col h-full overflow-hidden leading-tight ${isPast && event.extendedProps.route?.status === 'laneada' ? 'opacity-70' : ''}`}>
        <div className="flex justify-between items-center mb-0.5">
          <span className="font-bold text-[10px] text-white/90">{eventInfo.timeText}</span>
          {(['active', 'en_transito'].includes(event.extendedProps.route?.status)) && <Truck size={10} className="animate-pulse text-white" />}
        </div>
        <p className="text-[10px] font-medium text-white truncate">{event.title.split('|')[0]}</p>
        <p className="text-[9px] text-white/80 truncate mt-0.5">{event.title.split('|')[1]}</p>
      </div>
    );
  };

  const handleEventClick = (info) => {
    setSelectedRouteId(info.event.id);
  };
  
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const lastPositionRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tripRes, routesRes] = await Promise.all([
          apiService.getActiveTrip(),
          apiService.getRoutes() 
        ]);
        
        if (tripRes.data) {
          setActiveTrip(tripRes.data);
          setSelectedRouteId(tripRes.data.route_id);
          const reached = tripRes.data.events
            ?.filter(e => e.type === 'checkpoint_reached' || (e.data && e.data.checkpoint_id))
            .map(e => e.checkpoint_id || e.data.checkpoint_id) || [];
          setCompletedCheckpointIds(reached);
        }
        setRoutes(routesRes.data || []);
      } catch (err) {
        console.error('Error cargando datos del driver:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  const handleStopTrip = useCallback(async () => {
    setToggling(true);
    try {
      await apiService.stopTrip();
      stopGpsTracking();
      setActiveTrip(null);
      setCurrentPosition(null);
      setCompletedCheckpointIds([]);
    } catch (err) {
      alert(err.message || 'Error al finalizar viaje');
    } finally {
      setToggling(false);
    }
  }, [stopGpsTracking]);

  const handleStartTrip = useCallback(async () => {
    if (!selectedRouteId) {
      alert('Por favor selecciona una ruta para iniciar el viaje');
      return;
    }
    setToggling(true);
    try {
      const res = await apiService.startTrip(selectedRouteId);
      setActiveTrip(res.data);
      setEventsSent(0);
      setCompletedCheckpointIds([]);
    } catch (err) {
      alert(err.message || 'Error al iniciar viaje');
    } finally {
      setToggling(false);
    }
  }, [selectedRouteId]);

  const sendPosition = useCallback(async () => {
    const pos = lastPositionRef.current;
    if (!pos || !activeTrip) return;

    try {
      await apiService.logTripEvent(activeTrip.id, {
        lat: pos.latitude,
        lng: pos.longitude,
        status: 'in_transit'
      });
      setEventsSent((prev) => prev + 1);
    } catch (err) {
      console.error('Error enviando posición:', err);
    }
  }, [activeTrip]);

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

        if (activeRouteData?.dest_lat && activeRouteData?.dest_lng) {
          const dist = getDistance(latitude, longitude, activeRouteData.dest_lat, activeRouteData.dest_lng);
          if (dist < 150) {
            console.log('🏁 Destino alcanzado (Auto-Stop):', dist.toFixed(1), 'm');
            handleStopTrip();
          }
        }
      },
      (error) => setGpsError(`Error GPS: ${error.message}`),
      { enableHighAccuracy: true }
    );
    watchIdRef.current = watchId;
    intervalRef.current = setInterval(sendPosition, GPS_INTERVAL_MS);
  }, [sendPosition, activeRouteData, handleStopTrip]);

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

      <section className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-3">
        <StatCard label="Lecturas GPS Emitidas" value={eventsSent} icon={Activity} caption="Pings enviados en el viaje." tone="blue" />
        <StatCard label="Ruta Seleccionada" value={activeRouteData ? activeRouteData.route_code : 'Ninguna'} icon={Navigation} caption="Ruta operativa actual." tone="violet" />
        <StatCard label="Inicio de Sesión" value={isActive ? new Date(activeTrip.started_at).toLocaleTimeString() : '--:--'} icon={MapPin} caption="Hora de arranque logistico." tone={isActive ? 'emerald' : 'amber'} />
      </section>

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
              <FullCalendar
                plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
                initialView="timeGridDay"
                headerToolbar={{ left: 'prev,next', center: 'title', right: 'timeGridDay,timeGridWeek,dayGridMonth' }}
                events={calendarEvents}
                eventClick={handleEventClick}
                eventContent={renderEventContent}
                height="100%"
                allDaySlot={false}
                locale="es"
                slotMinTime="06:00:00"
                slotMaxTime="22:00:00"
                dayMaxEvents={true}
                buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día' }}
              />
            </div>
            
            {(activeRouteData || activeTrip) && (
              <div className="mt-auto p-5 bg-surface-50 border-t border-surface-100 ring-1 ring-black/5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-primary-100 text-primary-600'}`}>
                        {isActive ? <Truck size={20} /> : <Navigation size={20} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-surface-400 uppercase tracking-tighter">
                          {isActive ? 'Viaje en Curso' : 'Ruta Seleccionada'}
                        </p>
                        <p className="text-sm font-bold text-surface-800 truncate">
                          {(activeRouteData || activeTrip?.route)?.route_code || '---'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {['completed', 'finalizada'].includes(activeRouteData?.status) ? (
                        <Badge tone="slate" icon={Square} className="py-2.5 px-4 h-auto flex items-center gap-2 text-[10px] font-bold shadow-sm border-surface-200">
                          VIAJE CERRADO
                        </Badge>
                      ) : isActive ? (
                        <Button size="sm" variant="danger" className="px-4 py-2 h-auto text-[11px] gap-2 shadow-lg shadow-danger-200" onClick={handleStopTrip} disabled={toggling}>
                          {toggling ? '...' : <><Square fill="currentColor" size={12} /> Finalizar</>}
                        </Button>
                      ) : (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 h-auto text-[11px] gap-2 shadow-lg shadow-emerald-200" onClick={handleStartTrip} disabled={toggling || !selectedRouteId}>
                          {toggling ? '...' : <><Play fill="currentColor" size={12} /> Iniciar Viaje</>}
                        </Button>
                      )}
                      <Badge variant={isActive ? "emerald" : (['completed', 'finalizada'].includes(activeRouteData?.status) ? "slate" : "blue")} className="text-[9px] px-2.5 py-0.5">
                        {(activeRouteData || activeTrip?.route)?.type === 'schedule' ? 'Recurrente' : 'Único'}
                      </Badge>
                    </div>
                  </div>

                  {isActive && (activeRouteData?.checkpoints?.length > 0) && (
                    <div className="pt-3 border-t border-surface-200/60">
                      <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-3">Progreso de Checkpoints</p>
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                        {activeRouteData.checkpoints
                          .sort((a,b) => a.sequence_order - b.sequence_order)
                          .map(cp => {
                            const isReached = completedCheckpointIds.includes(cp.id);
                            return (
                              <div key={cp.id} className={`flex items-center justify-between p-2 rounded-lg border transition-all ${isReached ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-surface-100 hover:border-surface-200'}`}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isReached ? 'bg-emerald-500 text-white' : 'bg-surface-100 text-surface-500'}`}>
                                    {isReached ? '✓' : cp.sequence_order}
                                  </div>
                                  <span className={`text-[11px] font-medium truncate ${isReached ? 'text-emerald-800' : 'text-surface-600'}`}>{cp.name}</span>
                                </div>
                                {!isReached && (
                                  <button 
                                    onClick={() => handleCheckpointCheck(cp.id)}
                                    className="text-[9px] font-bold text-primary-600 hover:text-primary-700 uppercase tracking-tighter px-2 py-1 rounded bg-primary-50 active:scale-95 transition-transform"
                                  >
                                    Check
                                  </button>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!activeRouteData && !activeTrip && (
              <div className="mt-auto p-6 text-center bg-surface-50 border-t border-surface-100">
                <p className="text-xs font-medium text-surface-400 uppercase tracking-widest flex items-center justify-center gap-2">
                  <CalendarIcon size={14} /> Selecciona un viaje del calendario
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-8">
          <div className="h-[65vh] min-h-[35rem] overflow-hidden rounded-[2rem] border border-white/60 bg-white p-3 shadow-2xl relative">
            <BaseMap
              center={currentPosition ? [currentPosition.lat, currentPosition.lng] : activeRouteData ? [activeRouteData.origin_lat, activeRouteData.origin_lng] : [-16.5, -68.15]}
              zoom={currentPosition || activeRouteData ? 13 : 7}
              className="h-full w-full rounded-[1.6rem]"
            >
              {activeRouteData && (
                <>
                  {/* Ruta Completa (Tenue) */}
                  <RoutePath route={activeRouteData} color="#64748b" weight={3} fitBounds={!isActive} />
                  
                  {/* Ruta Completada (Solid Green) */}
                  {(isActive || ['completed', 'finalizada'].includes(activeRouteData?.status)) && (
                    <RoutePath 
                      route={{
                        ...activeRouteData,
                        checkpoints: ['completed', 'finalizada'].includes(activeRouteData?.status)
                          ? activeRouteData.checkpoints
                          : activeRouteData.checkpoints.filter(cp => 
                              cp.sequence_order <= Math.max(0, ...activeRouteData.checkpoints
                                .filter(c => completedCheckpointIds.includes(c.id))
                                .map(c => c.sequence_order))
                            )
                      }} 
                      isCompleted={true}
                      fitBounds={false}
                    />
                  )}

                  {activeRouteData.origin_lat && activeRouteData.origin_lng && (
                    <OriginDestMarker type="origin" position={[activeRouteData.origin_lat, activeRouteData.origin_lng]} title="Punto de Inicio" subtitle={activeRouteData.origin} />
                  )}
                  {activeRouteData.dest_lat && activeRouteData.dest_lng && (
                    <OriginDestMarker type="dest" position={[activeRouteData.dest_lat, activeRouteData.dest_lng]} title="Destino Final" subtitle={activeRouteData.destination} />
                  )}
                  {activeRouteData.checkpoints?.map(cp => (
                    <CheckpointMarker 
                      key={cp.id} 
                      checkpoint={cp} 
                      isCompleted={completedCheckpointIds.includes(cp.id) || ['completed', 'finalizada'].includes(activeRouteData?.status)}
                    />
                  ))}
                </>
              )}

              {currentPosition && (
                <Marker position={[currentPosition.lat, currentPosition.lng]} icon={vehicleIcon}>
                  <Popup>Tu ubicación actual (Transmitiendo...)</Popup>
                </Marker>
              )}
            </BaseMap>

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
