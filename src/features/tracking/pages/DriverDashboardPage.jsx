import { useState, useEffect, useRef, useCallback } from 'react';
import { Truck, Navigation, Play, Square, Activity, MapPin, Search } from 'lucide-react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import Badge from '../../../components/atoms/Badge';
import Button from '../../../components/atoms/Button';
import BaseMap from '../../../components/molecules/BaseMap';
import StatCard from '../../../components/molecules/StatCard';
import PageSkeleton from '../../../components/organisms/PageSkeleton';
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
        setCurrentPosition({ lat: position.coords.latitude, lng: position.coords.longitude });
        lastPositionRef.current = position.coords;
      },
      (error) => setGpsError(`Error GPS: ${error.message}`),
      { enableHighAccuracy: true }
    );
    watchIdRef.current = watchId;
    intervalRef.current = setInterval(sendPosition, GPS_INTERVAL_MS);
  }, [sendPosition]);

  const stopGpsTracking = useCallback(() => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    watchIdRef.current = null;
    intervalRef.current = null;
  }, []);

  useEffect(() => {
    if (activeTrip) startGpsTracking();
    return () => stopGpsTracking();
  }, [activeTrip, startGpsTracking, stopGpsTracking]);

  const handleStartTrip = async () => {
    if (!selectedRouteId) {
      alert('Por favor selecciona una ruta para iniciar el viaje');
      return;
    }
    setToggling(true);
    try {
      const res = await apiService.startTrip(selectedRouteId);
      setActiveTrip(res.data);
      setEventsSent(0);
    } catch (err) {
      alert(err.message || 'Error al iniciar viaje');
    } finally {
      setToggling(false);
    }
  };

  const handleStopTrip = async () => {
    setToggling(true);
    try {
      await apiService.stopTrip();
      stopGpsTracking();
      setActiveTrip(null);
      setCurrentPosition(null);
    } catch (err) {
      alert(err.message || 'Error al finalizar viaje');
    } finally {
      setToggling(false);
    }
  }

  if (loading) return <PageSkeleton stats={3} layout="map" />;

  const isActive = !!activeTrip;
  const activeRouteData = routes.find(r => r.id === selectedRouteId);

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
          <div className="rounded-[1.6rem] border border-surface-100 bg-white shadow-xl overflow-hidden">
            <div className={`p-6 border-b-4 ${isActive ? 'border-emerald-500 bg-emerald-50' : 'border-surface-200 bg-surface-50'}`}>
              <h2 className="text-xl font-display font-semibold text-surface-900 mb-2">Control de Viaje</h2>
              <p className="text-sm text-surface-500 mb-6">Selecciona la ruta asignada y habilita la recoleccion in-app de tu posicion para el calculo de ETA.</p>
              
              {!isActive ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[0.68rem] font-bold uppercase tracking-[0.18em] text-surface-500 mb-2">
                      Rutas Pendientes
                    </label>
                    <select
                      value={selectedRouteId}
                      onChange={(e) => setSelectedRouteId(e.target.value)}
                      className="w-full h-11 px-4 border border-surface-200 rounded-xl bg-white text-surface-900 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                    >
                      <option value="">-- Elige una ruta --</option>
                      {routes.map(r => (
                        <option key={r.id} value={r.id}>{r.route_code} ({r.origin} → {r.destination})</option>
                      ))}
                    </select>
                  </div>
                  <Button size="lg" className="w-full justify-center gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={handleStartTrip} disabled={toggling || !selectedRouteId}>
                    {toggling ? 'Iniciando...' : <><Play fill="currentColor" size={16} /> Iniciar Viaje</>}
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-emerald-100/50 border border-emerald-200">
                    <p className="text-sm font-semibold text-emerald-800">
                      🟢 Viaje Activo
                    </p>
                    <p className="text-xs text-emerald-600 mt-1 max-w-[200px]">
                      {activeTrip.route ? `${activeTrip.route.origin} → ${activeTrip.route.destination}` : 'Ruta activa'}
                    </p>
                  </div>
                  <Button size="lg" variant="danger" className="w-full justify-center gap-2" onClick={handleStopTrip} disabled={toggling}>
                    {toggling ? 'Finalizando...' : <><Square fill="currentColor" size={16} /> Finalizar Viaje</>}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-8">
          <div className="h-[60vh] min-h-[30rem] overflow-hidden rounded-[1.6rem] border border-surface-100 bg-white p-3 shadow-xl relative">
            <BaseMap
              center={currentPosition ? [currentPosition.lat, currentPosition.lng] : [-16.5, -68.15]}
              zoom={currentPosition ? 15 : 7}
              className="h-full w-full rounded-2xl"
            >
              {currentPosition && (
                <Marker position={[currentPosition.lat, currentPosition.lng]} icon={vehicleIcon}>
                  <Popup>Tu ubicación actual (Transmitiendo...)</Popup>
                </Marker>
              )}
            </BaseMap>

            {!isActive && !currentPosition && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-900/15 backdrop-blur-sm z-[1000] rounded-2xl pointer-events-none m-3">
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
