import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Truck, Navigation, Play, Square, Activity, MapPin, Search, Calendar as CalendarIcon, Package, Clock, Route, WifiOff } from 'lucide-react';
import { Marker, Popup, Polyline } from 'react-leaflet';
import { toast } from 'sonner';
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
import PageHeader from '../../../components/organisms/PageHeader';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import useMediaQuery from '@/hooks/useMediaQuery';
import apiService from '../../../services/apiService';
import { PACKAGE_STATUS, isPackageDelivered, isRouteFinished } from '../../../constants/status';
import { enqueuePoint, countQueued, flushQueue, requestBackgroundSync } from '../../../services/offlineQueue';
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
    // Las 24 horas del día (antes empezaba a las 06:00 y una salida de madrugada, como las de 04:30, quedaba invisible);
    // la vista arranca desplazada a las 06:00 para que se vea igual que antes
    slotMinTime="00:00:00"
    slotMaxTime="24:00:00"
    scrollTime="06:00:00"
    // Nombre accesible de los botones de navegación (por defecto salen en inglés y sin texto para lectores de pantalla)
    buttonHints={{ prev: 'Anterior', next: 'Siguiente', today: 'Ir a hoy', month: 'Vista de mes', week: 'Vista de semana', day: 'Vista de día' }}
    dayMaxEvents={true}
    buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día' }}
  />
));

// Nota de entrega (opcional) y botones. En el celular va dentro de una hoja inferior; en escritorio, en línea bajo el paquete.
function DeliveryNoteForm({ pkgId, note, onNote, delivering, onCancel, onConfirm }) {
  return (
    <div className="space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3">
      <label htmlFor={`note-${pkgId}`} className="text-xs font-bold uppercase tracking-widest text-surface-500">
        Nota de entrega (opcional)
      </label>
      <textarea
        id={`note-${pkgId}`}
        value={note}
        onChange={(e) => onNote(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Ej: Recibió la señora Mamani"
        className="w-full rounded-xl border border-surface-200 p-2 text-base md:text-xs"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={delivering}
          className="min-h-11 px-4 py-2 text-xs font-bold uppercase tracking-widest text-surface-500 md:min-h-0 md:px-3"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={delivering}
          className="min-h-11 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white active:scale-95 disabled:opacity-60 md:min-h-0 md:px-3.5"
        >
          {delivering ? 'Guardando...' : 'Confirmar entrega'}
        </button>
      </div>
    </div>
  );
}

function DriverDashboardPage() {
  const queryClient = useQueryClient();
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [toggling, setToggling] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [eventsSent, setEventsSent] = useState(0);
  const [completedCheckpointIds, setCompletedCheckpointIds] = useState([]);
  const [deliveringPkgId, setDeliveringPkgId] = useState(null);
  const [confirmingPkgId, setConfirmingPkgId] = useState(null);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [deliverError, setDeliverError] = useState(null);

  // --- COLA OFFLINE (puntos GPS sin conexión) ---
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const isMobile = useMediaQuery('(max-width: 767px)');

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

  // Con una sola ruta disponible no hay nada que elegir: queda seleccionada
  useEffect(() => {
    if (!activeTrip && !selectedRouteId && routes.length === 1) setSelectedRouteId(String(routes[0].id));
  }, [activeTrip, selectedRouteId, routes]);

  const loading = loadingTrip || loadingRoutes;

  // --- DATOS DERIVADOS MEMOIZADOS ---
  const isActive = !!activeTrip;
  const activeRouteData = activeRouteDetails || routes.find(r => String(r.id) === String(selectedRouteId));
  const routeStatus = (activeRouteData?.status || '').toLowerCase();
  const isFinished = useMemo(() =>
    ['completed', 'finalizada', 'completada', 'entregado', 'terminada'].includes(routeStatus),
  [routeStatus]);

  const realProgress = useMemo(() => {
    if (!isActive || !activeRouteData) return 0;
    return calculateTripProgress(
      activeRouteData.checkpoints?.length || 0,
      completedCheckpointIds.length,
      activeRouteData.packages?.length || 0,
      (activeRouteData.packages?.filter(p => isPackageDelivered(p.status)) || []).length
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

      let bgColor = 'var(--color-event-planned)';
      if (isActiveStatus) bgColor = 'var(--color-event-active)';
      if (isCompleted) bgColor = 'var(--color-surface-900)';

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
        <div className={`w-full overflow-hidden flex items-center gap-1 px-1 py-0.5 rounded-md ${isPast && routeStatus === 'planeada' ? 'opacity-60' : ''}`} style={isEstimated ? { maskImage: 'linear-gradient(to right, black 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 100%)' } : {}}>
          <span className="font-bold text-[11px] text-white whitespace-nowrap">{eventInfo.timeText.split(' - ')[0]}</span>
          <span className="text-xs font-semibold text-white truncate max-w-[60px]">{event.title.split('|')[0].trim()}</span>
          {(['active', 'en_transito'].includes(routeStatus)) && <Truck size={8} className="animate-pulse text-white ml-auto shrink-0" />}
        </div>
      );
    }

    return (
      <div
        className={`p-1.5 flex flex-col h-full overflow-hidden leading-tight rounded-md border-l-4 border-white/20 transition-all ${isPast && routeStatus === 'planeada' ? 'opacity-60 grayscale-[0.3]' : 'hover:scale-[1.02] shadow-sm'}`}
        style={isEstimated ? { maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)' } : {}}
      >
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-1 min-w-0">
            {(['active', 'en_transito'].includes(routeStatus)) ? (
              <Truck size={10} className="animate-pulse text-white shrink-0" />
            ) : (
              <Clock size={10} className="text-white/60 shrink-0" />
            )}
            <span className="font-bold text-xs text-white/90 truncate tracking-tight">
              {eventInfo.timeText.split(' - ')[0]}
            </span>
          </div>
          {['completed', 'finalizada', 'completada'].includes(routeStatus) && (
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] shrink-0" />
          )}
        </div>

        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <p className="text-xs font-bold text-white leading-tight truncate">
            {event.title.split('|')[0].trim()}
          </p>
          <p className="text-xs font-medium text-white/80 truncate mt-0.5">
            {event.title.split('|')[1]?.trim() || '---'}
          </p>
        </div>

        <div className="mt-1 flex items-center justify-between gap-1 border-t border-white/10 pt-1 shrink-0">
          <span className="text-xs font-medium text-white/80 tracking-tighter">
            {isEstimated ? 'EST.' : 'REAL'}
          </span>
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-xs font-bold text-white/90 truncate">
               {['completed', 'finalizada', 'completada'].includes(routeStatus)
                 ? `✓ ${new Date(route.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                 : `→ ${eventInfo.timeText.split(' - ')[1] || ''}`}
            </span>
          </div>
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
    setDeliverError(null);
    try {
      await apiService.deliverPackage(packageId, deliveryNote);
      setConfirmingPkgId(null);
      setDeliveryNote('');
      // Actualizar caché de React Query
      queryClient.setQueryData(['routeDetails', selectedRouteId], prev => {
        if (!prev) return prev;
        return {
          ...prev,
          packages: prev.packages.map(p =>
            p.id === packageId ? { ...p, status: PACKAGE_STATUS.DELIVERED } : p
          )
        };
      });
      // Notificar cambio de progreso al admin
      queryClient.invalidateQueries({ queryKey: ['driverRoutes'] });
    } catch (err) {
      console.error('Error entregando paquete:', err);
      setDeliverError({ id: packageId, message: err?.response?.data?.message || 'No se pudo registrar la entrega. Intenta de nuevo.' });
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

  // Envía al servidor los puntos GPS acumulados offline (en orden cronológico y en lote)
  const flushOfflineQueue = useCallback(async () => {
    try {
      const result = await flushQueue(apiService.logTripEventsBatch);
      setPendingCount(result.remaining);
      if (result.sent > 0) queryClient.invalidateQueries({ queryKey: ['activeTrip'] });
      return result;
    } catch (err) {
      console.error('Error vaciando la cola offline:', err);
      return null;
    }
  }, [queryClient]);

  const isStoppingRef = useRef(false);

  const handleStopTrip = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    setToggling(true);

    // 1. Detener el tracking localmente DE INMEDIATO
    stopGpsTracking();

    try {
      // 2. Registrar los puntos GPS pendientes (si los hay) y notificar al servidor
      await flushOfflineQueue();
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
        toast.error('No se pudo finalizar el viaje', { description: err.message || 'Inténtalo de nuevo.' });
      }
    } finally {
      setToggling(false);
      isStoppingRef.current = false;
    }
  }, [stopGpsTracking, flushOfflineQueue, queryClient, selectedRouteId]);

  const handleStartTrip = useCallback(async () => {
    if (!selectedRouteId) {
      toast.warning('Elige una ruta para iniciar el viaje');
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
      toast.error('No se pudo iniciar el viaje', { description: err.message || 'Inténtalo de nuevo.' });
    } finally {
      setToggling(true);
      setToggling(false);
    }
  }, [selectedRouteId, queryClient]);

  const sendPosition = useCallback(async () => {
    const pos = lastPositionRef.current;
    if (!pos || !activeTrip || isStoppingRef.current) return;

    // Cada punto lleva su timestamp real: si se envía tarde (offline), el servidor conserva la hora de lectura
    const point = {
      lat: pos.latitude,
      lng: pos.longitude,
      status: 'in_transit',
      timestamp: new Date().toISOString()
    };

    const enqueue = async () => {
      try {
        await enqueuePoint({ tripId: activeTrip.id, ...point });
        setPendingCount(await countQueued());
        requestBackgroundSync(); // el service worker lo enviará al recuperar la señal (si el navegador lo soporta)
      } catch (queueErr) {
        console.error('Error guardando el punto GPS en la cola offline:', queueErr);
      }
    };

    // Sin conexión: guardar en el dispositivo
    if (!navigator.onLine) {
      await enqueue();
      return;
    }

    try {
      // Primero se vacían los puntos pendientes para respetar el orden cronológico
      if ((await countQueued()) > 0) {
        const flushed = await flushOfflineQueue();
        if (flushed?.arrived) {
          handleStopTrip();
          return;
        }
        if (!flushed || flushed.remaining > 0) {
          await enqueue();
          return;
        }
      }

      const res = await apiService.logTripEvent(activeTrip.id, point);
      setEventsSent((prev) => prev + 1);

      // Forzar actualización de estadísticas (pings, etc)
      queryClient.invalidateQueries({ queryKey: ['activeTrip'] });

      const status = res.data?.status?.toLowerCase() || '';
      if (status.includes('llegó') || status.includes('destino')) {
        handleStopTrip();
      }
    } catch (err) {
      if (err.isNetworkError) {
        await enqueue(); // se cayó la conexión justo ahora
      } else {
        console.error('Error enviando posición:', err);
      }
    }
  }, [activeTrip, handleStopTrip, flushOfflineQueue, queryClient]);

  // Contador inicial de la cola y reacción a los cambios de conectividad
  const stopTripRef = useRef(null);
  stopTripRef.current = handleStopTrip;

  useEffect(() => {
    countQueued().then(setPendingCount).catch(() => {});

    const goOnline = async () => {
      setIsOnline(true);
      const flushed = await flushOfflineQueue();
      if (flushed?.arrived) stopTripRef.current?.();
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [flushOfflineQueue]);

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

  const confirmingPkg = activeRouteData?.packages?.find((p) => p.id === confirmingPkgId);

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Panel operativo"
        description="Inicia tu viaje para habilitar el seguimiento GPS y compartir tu ubicación en línea con el centro de control."
        stats={[{ label: 'Estado satelital', value: isActive ? 'Transmitiendo' : 'En pausa', tone: isActive ? 'success' : 'default' }]}
      />

      {isMobile && (
        <Drawer open={confirmingPkgId != null} onOpenChange={(open) => { if (!open) { setConfirmingPkgId(null); setDeliveryNote(''); } }}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Entregar paquete</DrawerTitle>
              <DrawerDescription>
                {confirmingPkg ? `${confirmingPkg.tracking_code} · ${confirmingPkg.destino}` : 'Confirma la entrega y, si quieres, deja una nota.'}
              </DrawerDescription>
            </DrawerHeader>
            <div className="space-y-2 px-4 pb-6">
              {confirmingPkg && (
                <DeliveryNoteForm
                  pkgId={confirmingPkg.id}
                  note={deliveryNote}
                  onNote={setDeliveryNote}
                  delivering={deliveringPkgId === confirmingPkg.id}
                  onCancel={() => { setConfirmingPkgId(null); setDeliveryNote(''); }}
                  onConfirm={() => handleDeliverPackage(confirmingPkg.id)}
                />
              )}
              {deliverError?.id === confirmingPkgId && (
                <p role="alert" className="px-2 text-sm font-semibold text-red-600">{deliverError.message}</p>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {(!isOnline || pendingCount > 0) && (
        <div role="status" className="sticky top-[5.25rem] z-20 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow-sm">
          <WifiOff size={18} strokeWidth={2.2} className="shrink-0" />
          <span>
            {isOnline
              ? `Sincronizando ${pendingCount} punto(s) GPS pendientes...`
              : `Sin conexión: ${pendingCount} punto(s) GPS guardados en el dispositivo. Se enviarán automáticamente al recuperar la señal.`}
          </span>
        </div>
      )}

      {/* Las tarjetas de estadísticas se movieron al interior del mapa como overlays flotantes */}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-4 flex flex-col gap-4">
          <div className="rounded-[1.6rem] border border-surface-100 bg-white shadow-xl overflow-hidden flex flex-col h-full min-h-[500px]">
            <div className={`p-5 border-b flex items-center justify-between ${isActive ? 'bg-emerald-50 border-emerald-100' : 'bg-surface-50 border-surface-100'}`}>
              <div>
                <h2 className="text-lg font-display font-bold text-surface-900 leading-tight">Itinerario de Viajes</h2>
                <p className="text-xs uppercase tracking-wider text-surface-500 font-bold mt-0.5">Gestión Operativa</p>
              </div>
              {isActive && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold animate-pulse">
                  <Activity size={12} /> EN TRÁNSITO
                </div>
              )}
            </div>

            <div className="flex-1 overflow-hidden p-4 text-xs custom-driver-calendar">
              <style>{`
                .custom-driver-calendar .fc-toolbar { margin-bottom: 1rem !important; }
                .custom-driver-calendar .fc-toolbar-title { font-size: 0.9rem !important; font-weight: 800; }
                .custom-driver-calendar .fc-button { padding: 4px 8px !important; font-size: 0.75rem !important; border-radius: 8px !important; }
                @media (max-width: 639px) { .custom-driver-calendar .fc-button { min-height: 44px; min-width: 44px; } }
                .custom-driver-calendar .fc-theme-standard td, .custom-driver-calendar .fc-theme-standard th { border-color: var(--color-surface-100); }
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
                  <div className="p-4 border-b border-surface-100">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary-500/10 text-primary-600'}`}>
                          {isActive ? <Truck size={20} strokeWidth={2.5} /> : <Navigation size={20} strokeWidth={2.5} />}
                        </div>
                        <div className="min-w-0 flex flex-col sm:flex-row sm:items-baseline gap-x-3 gap-y-0.5">
                          <p className="text-sm font-bold text-surface-900 truncate tracking-tight">
                            {(activeRouteData || activeTrip?.route)?.route_code || '---'}
                          </p>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${isActive ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-primary-50 border-primary-100 text-primary-600'} shrink-0`}>
                            {isActive ? 'En Curso' : 'Seleccionada'}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isActive ? (
                          <Button
                            variant="danger"
                            className="px-4 py-2 h-11 md:h-9 text-xs font-bold uppercase tracking-wider gap-1.5 shadow-none border-none rounded-xl"
                            onClick={handleStopTrip}
                            disabled={toggling}
                          >
                            {toggling ? '...' : <><Square fill="currentColor" size={10} stroke="none" /> Finalizar</>}
                          </Button>
                        ) : (
                          <Button
                            className={`${(isFinished || !selectedRouteId) ? 'bg-surface-100 text-surface-400' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200/40'} px-4 py-2 h-11 md:h-9 text-xs font-bold uppercase tracking-wider gap-1.5 transition-all active:scale-95 border-none rounded-xl`}
                            onClick={handleStartTrip}
                            disabled={toggling || !selectedRouteId || isFinished}
                          >
                            {toggling ? '...' : isFinished ? 'Completado' : <><Play fill="currentColor" size={10} stroke="none" /> Iniciar</>}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-6">

                  {isActive && (
                    <div className="pt-2">
                       <div className="flex justify-between items-center mb-1.5">
                         <span className="text-xs font-bold text-surface-500 uppercase tracking-wider">Progreso del Viaje</span>
                         <span className="text-xs font-bold text-primary-600">{realProgress}%</span>
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
                      <p className="text-xs font-bold text-surface-500 mb-3 px-1">Puntos de control</p>
                      <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                        {[...(activeRouteData?.checkpoints || [])]
                          .sort((a,b) => (a.sequence_order || 0) - (b.sequence_order || 0))
                          .map(cp => {
                            const isReached = completedCheckpointIds.includes(cp.id);
                            return (
                              <div key={cp.id} className={`group flex items-center justify-between p-2.5 rounded-2xl border transition-all duration-300 ${isReached ? 'bg-emerald-50/50 border-emerald-100/50' : 'bg-white border-surface-100 hover:border-surface-200 hover:shadow-md hover:shadow-surface-100/60'}`}>
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${isReached ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-surface-100 text-surface-400'}`}>
                                    {isReached ? '✓' : cp.sequence_order}
                                  </div>
                                  <div className="min-w-0">
                                    <span className={`text-xs font-bold block truncate leading-none ${isReached ? 'text-emerald-900' : 'text-surface-700'}`}>{cp.name}</span>
                                    {isReached && <span className="text-xs font-semibold text-emerald-700 mt-0.5 block">Alcanzado</span>}
                                  </div>
                                </div>
                                {!isReached && (
                                  <button
                                    onClick={() => handleCheckpointCheck(cp.id)}
                                    className="text-xs font-bold text-primary-600 hover:text-white hover:bg-primary-600 uppercase tracking-widest px-4 py-1.5 min-h-11 md:min-h-0 md:px-3 rounded-lg bg-primary-50 active:scale-95 transition-all border border-primary-100/30"
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
                      <p className="text-xs font-bold text-surface-500 mb-3 px-1">Carga a Entregar</p>
                      <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                        {activeRouteData.packages.map(pkg => {
                          const isDelivered = isPackageDelivered(pkg.status);
                          const isDelivering = deliveringPkgId === pkg.id;
                          return (
                            <div key={pkg.id}>
                            <div className={`group flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 ${isDelivered ? 'bg-slate-50 border-slate-200/50 grayscale-[0.4]' : 'bg-white border-surface-100 hover:border-surface-200 hover:shadow-md hover:shadow-surface-100/60'}`}>
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 transition-all ${isDelivered ? 'bg-slate-200 text-slate-500' : 'bg-emerald-50 text-emerald-600 group-hover:scale-110'}`}>
                                  <Package size={18} strokeWidth={2.5} />
                                </div>
                                <div className="min-w-0">
                                  <p className={`text-[12px] font-bold tracking-tight ${isDelivered ? 'text-slate-500' : 'text-surface-900'}`}>{pkg.tracking_code}</p>
                                  <p className="text-xs text-surface-500 truncate mt-0.5 leading-none">{pkg.destino}</p>
                                </div>
                              </div>
                              <div className="shrink-0 pl-2">
                                {!isDelivered ? (
                                  <button
                                    onClick={() => { setConfirmingPkgId(pkg.id); setDeliveryNote(''); setDeliverError(null); }}
                                    disabled={isDelivering}
                                    className="text-xs font-bold text-emerald-700 hover:text-white hover:bg-emerald-600 uppercase tracking-widest px-4 py-2 min-h-11 md:min-h-0 md:px-3.5 rounded-xl bg-emerald-50 active:scale-95 transition-all border border-emerald-100/50"
                                  >
                                    {isDelivering ? '...' : 'Entregar'}
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-100/50 text-emerald-700 border border-emerald-100">
                                    <span className="text-xs font-bold uppercase tracking-wider">Éxito</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {confirmingPkgId === pkg.id && !isDelivered && !isMobile && (
                              <div className="mt-2">
                                <DeliveryNoteForm
                                  pkgId={pkg.id}
                                  note={deliveryNote}
                                  onNote={setDeliveryNote}
                                  delivering={isDelivering}
                                  onCancel={() => { setConfirmingPkgId(null); setDeliveryNote(''); }}
                                  onConfirm={() => handleDeliverPackage(pkg.id)}
                                />
                              </div>
                            )}
                            {deliverError?.id === pkg.id && !isMobile && (
                              <p role="alert" className="mt-1 px-2 text-xs font-semibold text-red-600">{deliverError.message}</p>
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
            </div>
          </div>
        </div>

        <div className="xl:col-span-8">
          <div className="h-[65vh] min-h-[35rem] overflow-hidden rounded-[2rem] border border-white/60 bg-white p-3 shadow-2xl relative isolate">
            <DashboardMap
              currentPosition={currentPosition}
              activeRouteData={activeRouteData}
              isActive={isActive}
              activeTrip={activeTrip}
              completedCheckpointIds={completedCheckpointIds}
              isFinished={isFinished}
              eventsSent={eventsSent}
            />

            {(activeRouteData || selectedRouteId) && (
              <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-6 pointer-events-auto bg-white/90 backdrop-blur-sm px-5 py-2 rounded-xl border border-surface-200 shadow-lg shadow-surface-900/5">
                <div className="flex items-center gap-2.5 pr-6 border-r border-surface-100">
                  <div className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-primary-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]'}`} />
                  <p className="text-xs font-bold text-surface-900 uppercase tracking-wider">
                    {(activeRouteData || activeTrip?.route)?.route_code || '---'}
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Activity size={12} className="text-surface-500" />
                    <div className="flex flex-col">
                      <span className="text-[7.5px] font-bold text-surface-500 uppercase tracking-tighter leading-none mb-0.5">Pings</span>
                      <span className="text-xs font-bold text-surface-900">{activeRouteData?.ping_count || 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock size={12} className="text-surface-500" />
                    <div className="flex flex-col">
                      <span className="text-[7.5px] font-bold text-surface-500 uppercase tracking-tighter leading-none mb-0.5">Inicio</span>
                      <span className="text-xs font-bold text-surface-900">
                        {activeRouteData?.start_time ? new Date(activeRouteData.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-1">
                    <MapPin size={12} className="text-emerald-500" />
                    <div className="flex flex-col">
                       <span className="text-[7.5px] font-bold text-surface-500 uppercase tracking-tighter leading-none mb-0.5">Destino</span>
                       <span className="text-xs font-bold text-surface-900 truncate max-w-[150px]">
                         {(activeRouteData || activeTrip?.route)?.destination || '---'}
                       </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!isActive && !selectedRouteId && !currentPosition && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-900/15 backdrop-blur-sm z-[1000] rounded-[1.6rem] pointer-events-none m-3">
                <div className="bg-white/95 p-8 rounded-2xl shadow-2xl text-center border border-white/20 max-w-sm">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-100 text-surface-500 mb-4">
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
