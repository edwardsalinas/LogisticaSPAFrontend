import { useState, useEffect, useRef, useCallback } from 'react';
import { Truck, Navigation, Play, Square, Activity, MapPin, Search, Calendar as CalendarIcon, Package } from 'lucide-react';
import { Marker, Popup, Polyline } from 'react-leaflet';
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
import VehicleMarker from '../../../components/molecules/VehicleMarker';
import { heroImages } from '../../../constants/heroImages';
import apiService from '../../../services/apiService';
import { haversineDistance, calculateTripProgress } from '../../../utils/geoUtils';

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
  const [activeRouteDetails, setActiveRouteDetails] = useState(null);
  const [deliveringPkgId, setDeliveringPkgId] = useState(null);

  // --- DATOS DERIVADOS ---
  const isActive = !!activeTrip;
  const activeRouteData = activeRouteDetails || routes.find(r => String(r.id) === String(selectedRouteId));
  const isFinished = ['completed', 'finalizada', 'completada'].includes(activeRouteData?.status);

  const realProgress = isActive && activeRouteData ? calculateTripProgress(
    activeRouteData.checkpoints?.length || 0,
    completedCheckpointIds.length,
    activeRouteData.packages?.length || 0,
    (activeRouteData.packages?.filter(p => p.status === 'delivered' || p.status === 'completada') || []).length
  ) : 0;

  // Transformar rutas para el calendario
  const calendarEvents = routes.filter(r => r.departure_time).map(r => {
    const start = new Date(r.departure_time);
    if (isNaN(start.getTime())) return null; // Saltar si fecha invalida

    const end = new Date(start.getTime() + (120 * 60000)); // 2h por defecto
    
    let bgColor = '#3b82f6'; // Blue (Planned)
    if (r.status === 'active' || r.status === 'en_transito') bgColor = '#10b981'; // Green (Active)
    if (['completed', 'finalizada', 'completada'].includes(r.status)) bgColor = '#18181b'; // Zinc-900 (Finished)

    return {
      id: String(r.id),
      title: `${r.route_code || 'S/C'} | ${r.origin || ''} - ${r.destination || ''}`,
      start: r.departure_time,
      end: end.toISOString(),
      backgroundColor: bgColor,
      borderColor: 'transparent',
      display: 'block',
      extendedProps: { route: r }
    };
  }).filter(Boolean);

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

  const fetchData = useCallback(async () => {
    try {
      const [tripSettled, routesSettled] = await Promise.allSettled([
        apiService.getActiveTrip(),
        apiService.getRoutes() 
      ]);
      
      if (tripSettled.status === 'fulfilled' && tripSettled.value?.data) {
        const trip = tripSettled.value.data;
        setActiveTrip(trip);
        setSelectedRouteId(trip.route_id);
        const reached = trip.events
          ?.filter(e => e.type === 'checkpoint_reached' || (e.data && e.data.checkpoint_id))
          .map(e => e.checkpoint_id || e.data.checkpoint_id) || [];
        setCompletedCheckpointIds(reached);
      } else {
        setActiveTrip(null);
      }
      
      const routesRes = routesSettled.status === 'fulfilled' ? routesSettled.value : [];
      const routesData = Array.isArray(routesRes) ? routesRes : (routesRes?.data || []);
      setRoutes(routesData);
    } catch (err) {
      console.error('Error cargando datos del driver:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!selectedRouteId) {
      setActiveRouteDetails(null);
      return;
    }
    const fetchDetails = async () => {
      try {
        const res = await apiService.getRoute(selectedRouteId);
        setActiveRouteDetails(res.data);
      } catch (err) {
        console.error('Error fetching route details:', err);
      }
    };
    fetchDetails();
  }, [selectedRouteId]);

  const handleDeliverPackage = async (packageId) => {
    setDeliveringPkgId(packageId);
    try {
      await apiService.deliverPackage(packageId);
      // Actualizar localmente
      setActiveRouteDetails(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          packages: prev.packages.map(p => 
            p.id === packageId ? { ...p, status: 'delivered' } : p
          )
        };
      });
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
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    setToggling(true);
    
    // 1. Detener el tracking localmente DE INMEDIATO
    stopGpsTracking();
    
    try {
      // 2. Notificar al servidor
      await apiService.stopTrip();
      
      // 3. Limpiar estado local
      setActiveTrip(null); 
      setCurrentPosition(null);
      setCompletedCheckpointIds([]);
      setRoutes(prev => prev.map(r => String(r.id) === String(selectedRouteId) ? { ...r, status: 'completada' } : r));
      if (activeRouteDetails) {
        setActiveRouteDetails(prev => ({ ...prev, status: 'completada' }));
      }
      
      // 4. Refrescar datos completos (Opcional pero recomendado)
      await fetchData();
    } catch (err) {
      console.error('Error al finalizar viaje:', err);
      // Intentar limpiar igual si el error es que ya estaba cerrado
      if (err.status === 400 || (err.message && err.message.includes('ya ha sido completado'))) {
        setActiveTrip(null);
        await fetchData();
      } else {
        alert(err.message || 'Error al finalizar viaje');
      }
    } finally {
      setToggling(false);
      isStoppingRef.current = false;
    }
  }, [stopGpsTracking, fetchData, selectedRouteId]);

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
      
      // Actualización local proactiva
      setRoutes(prev => prev.map(r => String(r.id) === String(selectedRouteId) ? { ...r, status: 'en_transito' } : r));
      if (activeRouteDetails) {
        setActiveRouteDetails(prev => ({ ...prev, status: 'en_transito' }));
      }
    } catch (err) {
      alert(err.message || 'Error al iniciar viaje');
    } finally {
      setToggling(false);
    }
  }, [selectedRouteId]);

  const sendPosition = useCallback(async () => {
    const pos = lastPositionRef.current;
    if (!pos || !activeTrip || isStoppingRef.current) return;

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
          const dist = haversineDistance(latitude, longitude, activeRouteData.dest_lat, activeRouteData.dest_lng);
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
                <div className="p-5 ring-1 ring-black/5">
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
                      {isActive ? (
                        <Button 
                          size="sm" 
                          variant="danger" 
                          className="px-4 py-2 h-auto text-[11px] gap-2 shadow-lg shadow-danger-200" 
                          onClick={handleStopTrip} 
                          disabled={toggling}
                        >
                          {toggling ? '...' : <><Square fill="currentColor" size={12} /> Finalizar</>}
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          className={`${(isFinished || !selectedRouteId) ? 'bg-surface-200 text-surface-400 border-surface-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 shadow-lg'} px-4 py-2 h-auto text-[11px] gap-2 transition-all active:scale-95`} 
                          onClick={handleStartTrip} 
                          disabled={toggling || !selectedRouteId || isFinished}
                        >
                          {toggling ? '...' : isFinished ? 'Viaje Finalizado' : <><Play fill="currentColor" size={12} /> Iniciar Viaje</>}
                        </Button>
                      )}
                    </div>
                  </div>

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
                    <div className="pt-3 border-t border-surface-200/60">
                      <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-3">Progreso de Checkpoints</p>
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                        {[...(activeRouteData?.checkpoints || [])]
                          .sort((a,b) => (a.sequence_order || 0) - (b.sequence_order || 0))
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

                  {isActive && (activeRouteData?.packages?.length > 0) && (
                    <div className="pt-3 border-t border-surface-200/60">
                      <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-3">Paquetes a Entregar</p>
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                        {activeRouteData.packages.map(pkg => {
                          const isDelivered = pkg.status === 'delivered' || pkg.status === 'completada';
                          const isDelivering = deliveringPkgId === pkg.id;
                          return (
                            <div key={pkg.id} className={`flex items-center justify-between p-2 rounded-lg border transition-all ${isDelivered ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-surface-100'}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${isDelivered ? 'bg-emerald-500 text-white' : 'bg-primary-50 text-primary-600'}`}>
                                  <Package size={14} />
                                </div>
                                <div className="min-w-0">
                                  <p className={`text-[11px] font-bold truncate ${isDelivered ? 'text-emerald-800' : 'text-surface-800'}`}>{pkg.tracking_code}</p>
                                  <p className="text-[9px] text-surface-400 truncate">{pkg.destino}</p>
                                </div>
                              </div>
                              {!isDelivered && (
                                <button 
                                  onClick={() => handleDeliverPackage(pkg.id)}
                                  disabled={isDelivering}
                                  className="text-[9px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-tighter px-2.5 py-1.5 rounded-lg bg-emerald-50 active:scale-95 transition-all border border-emerald-100/50"
                                >
                                  {isDelivering ? '...' : 'Entregar'}
                                </button>
                              )}
                              {isDelivered && <span className="text-[9px] font-bold text-emerald-600 uppercase pr-2">Entregado</span>}
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
            <BaseMap
              center={
                currentPosition?.lat && currentPosition?.lng 
                  ? [currentPosition.lat, currentPosition.lng] 
                  : activeRouteData?.origin_lat && activeRouteData?.origin_lng 
                    ? [activeRouteData.origin_lat, activeRouteData.origin_lng] 
                    : [-16.5, -68.15]
              }
              zoom={currentPosition || activeRouteData ? 13 : 7}
              className="h-full w-full rounded-[1.6rem]"
            >
              {activeRouteData && (
                <>
                  {/* Ruta Planificada (Sutil pero clara) */}
                  {activeRouteData && (
                    <RoutePath route={activeRouteData} color="#94a3b8" weight={5} opacity={0.55} fitBounds={!isActive} />
                  )}
                  
                  {/* Ruta Ejecutada/Completada (SOLID Slate) */}
                  {(isActive || ['completed', 'finalizada', 'completada'].includes(activeRouteData?.status)) && (
                    <RoutePath 
                      route={{
                        ...activeRouteData,
                        checkpoints: ['completed', 'finalizada', 'completada'].includes(activeRouteData?.status)
                          ? (activeRouteData?.checkpoints || [])
                          : (activeRouteData?.checkpoints || []).filter(cp => 
                              (cp.sequence_order || 0) <= Math.max(0, ...(activeRouteData?.checkpoints || [])
                                .filter(c => completedCheckpointIds.includes(c.id))
                                .map(c => c.sequence_order || 0))
                            )
                      }} 
                      isCompleted={true}
                      weight={6}
                      fitBounds={false}
                    />
                  )}

                  {/* Recorrido Real GPS (Línea Punteada) */}
                  {(activeTrip?.events || activeRouteData?.trip?.events)?.length > 0 && (
                    <Polyline 
                      positions={(activeTrip?.events || activeRouteData?.trip?.events)
                        .filter(e => e.status === 'in_transit' && e.lat && e.lng)
                        .sort((a,b) => new Date(a.created_at) - new Date(b.created_at))
                        .map(e => [e.lat, e.lng])
                      }
                      pathOptions={{
                        color: '#6366f1',
                        dashArray: '10, 15',
                        weight: 4,
                        opacity: 0.8
                      }}
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

              {/* Posición del Vehículo (Actual o Final) */}
              {(currentPosition || (isFinished && activeRouteData?.dest_lat)) && (
                <VehicleMarker 
                  position={
                    isFinished && activeRouteData?.dest_lat
                      ? [activeRouteData.dest_lat, activeRouteData.dest_lng]
                      : [currentPosition.lat, currentPosition.lng]
                  } 
                  title={isFinished ? 'Viaje Finalizado' : 'Tu ubicación actual'}
                  subtitle={isFinished ? 'Llegada a destino' : 'Transmitiendo GPS...'}
                  isFinished={isFinished}
                />
              )}
            </BaseMap>
            
            {/* Stats Overlays Minimalistas (Texto Oscuro para mapas claros) */}
            <div className="absolute top-6 left-6 right-6 z-[1000] flex flex-row items-center justify-start gap-10 pointer-events-none">
              <div className="flex items-center gap-3">
                <Activity size={20} className="text-blue-600" strokeWidth={3} />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-surface-500 uppercase tracking-wider leading-none">Pings</span>
                  <span className="text-xl font-display font-black text-surface-900 leading-none mt-1">{eventsSent}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Navigation size={20} className="text-violet-600" strokeWidth={3} />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-surface-500 uppercase tracking-wider leading-none">Ruta</span>
                  <span className="text-xl font-display font-black text-surface-900 leading-none mt-1 truncate max-w-[150px]">{activeRouteData ? activeRouteData.route_code : '---'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin size={20} className={isActive ? 'text-emerald-600' : 'text-amber-600'} strokeWidth={3} />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-surface-500 uppercase tracking-wider leading-none">Inicio</span>
                  <span className="text-xl font-display font-black text-surface-900 leading-none mt-1">
                    {isActive && activeTrip?.started_at ? new Date(activeTrip.started_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                  </span>
                </div>
              </div>
            </div>

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
