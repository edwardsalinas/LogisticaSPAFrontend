import { useState, useEffect } from 'react';
import Input from '../../../components/atoms/Input';
import Select from '../../../components/atoms/Select';
import Button from '../../../components/atoms/Button';
import Skeleton from '../../../components/atoms/Skeleton';
import apiService from '../../../services/apiService';
import { Trash2, ArrowUp, ArrowDown, MapPin, Rocket, CalendarRange, Clock, CheckCircle } from 'lucide-react';
import MapCheckpointsPicker from '../../../components/molecules/MapCheckpointsPicker';
import clsx from 'clsx';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_FULL  = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function RouteForm({ onSuccess, onCancel, initialData = null }) {
  const [form, setForm] = useState({
    predefined_route_id: initialData?.predefined_route_id || '',
    origin: initialData?.origin || '',
    destination: initialData?.destination || '',
    driver_id: initialData?.driver_id || '',
    vehicle_id: initialData?.vehicle_id || '',
    departure_time: initialData?.departure_time ? new Date(initialData.departure_time).toISOString().slice(0, 16) : '',
    checkpoints: initialData?.checkpoints || [],
    origin_lat: initialData?.origin_lat || null,
    origin_lng: initialData?.origin_lng || null,
    dest_lat: initialData?.dest_lat || null,
    dest_lng: initialData?.dest_lng || null,
  });

  // Schedule state
  const [tripType, setTripType] = useState('schedule');
  const [dayTimes, setDayTimes] = useState({});
  const [sameTime, setSameTime] = useState(true);
  const [globalTime, setGlobalTime] = useState('08:30');

  const [predefinedRoutes, setPredefinedRoutes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [driversRes, vehiclesRes, predefinedRes] = await Promise.all([
          apiService.getDrivers(),
          apiService.getVehicles(),
          apiService.getPredefinedRoutes()
        ]);
        setDrivers(Array.isArray(driversRes) ? driversRes : (driversRes.data || []));
        setVehicles(Array.isArray(vehiclesRes) ? vehiclesRes : (vehiclesRes.data || []));
        setPredefinedRoutes(Array.isArray(predefinedRes) ? predefinedRes : (predefinedRes.data || []));
      } catch (err) {
        console.error('Error cargando datos:', err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // Sync global time
  useEffect(() => {
    if (sameTime) {
      setDayTimes(prev => {
        const updated = {};
        Object.keys(prev).forEach(k => { updated[k] = globalTime; });
        return updated;
      });
    }
  }, [sameTime, globalTime]);

  const selectedDays = Object.keys(dayTimes).map(Number).sort();

  // ── Auto-link Driver ↔ Vehicle ──
  const handleDriverChange = (e) => {
    const driverId = e.target.value;
    const driver = drivers.find(d => d.id === driverId);
    setForm(prev => ({
      ...prev,
      driver_id: driverId,
      vehicle_id: driver?.current_vehicle_id || prev.vehicle_id,
    }));
  };

  const handleVehicleChange = (e) => {
    const vehicleId = e.target.value;
    const linkedDriver = drivers.find(d => d.current_vehicle_id === vehicleId);
    setForm(prev => ({
      ...prev,
      vehicle_id: vehicleId,
      driver_id: linkedDriver ? linkedDriver.id : prev.driver_id,
    }));
  };

  const toggleDay = (day) => {
    const key = String(day);
    setDayTimes(prev => {
      const next = { ...prev };
      if (next[key]) { delete next[key]; } else { next[key] = sameTime ? globalTime : '08:30'; }
      return next;
    });
  };

  const handlePredefinedChange = (e) => {
    const routeId = e.target.value;
    const selected = predefinedRoutes.find(r => r.id === routeId);
    if (selected) {
      setForm(prev => ({
        ...prev,
        predefined_route_id: routeId,
        origin: selected.origin_city,
        destination: selected.destination_city,
        origin_lat: selected.origin_lat,
        origin_lng: selected.origin_lng,
        dest_lat: selected.dest_lat,
        dest_lng: selected.dest_lng,
      }));
    } else {
      setForm(prev => ({ ...prev, predefined_route_id: '', origin: '', destination: '', origin_lat: null, origin_lng: null, dest_lat: null, dest_lng: null }));
    }
  };

  const handleOriginSelect = ({ lat, lng, name }) => {
    setForm(prev => ({ ...prev, origin: name, origin_lat: lat, origin_lng: lng }));
  };
  const handleDestinationSelect = ({ lat, lng, name }) => {
    setForm(prev => ({ ...prev, destination: name, dest_lat: lat, dest_lng: lng }));
  };
  const handleCheckpointsChange = (cps) => {
    setForm(prev => ({ ...prev, checkpoints: cps }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (tripType === 'schedule') {
        const schedulePayload = {
          vehicle_id: form.vehicle_id,
          driver_id: form.driver_id || undefined,
          predefined_route_id: form.predefined_route_id || undefined,
          origin: form.origin,
          destination: form.destination,
          origin_lat: form.origin_lat,
          origin_lng: form.origin_lng,
          dest_lat: form.dest_lat,
          dest_lng: form.dest_lng,
          day_times: dayTimes,
        };
        await apiService.createSchedule(schedulePayload);
      } else {
        const payload = {
          ...form,
          departure_time: new Date(form.departure_time).toISOString(),
          checkpoints: form.checkpoints.map((cp, idx) => ({
            name: cp.name, lat: Number(cp.lat), lng: Number(cp.lng), sequence_order: idx + 1
          }))
        };
        if (initialData?.id) {
          await apiService.updateRoute(initialData.id, payload);
        } else {
          await apiService.createRoute(payload);
        }
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx}><Skeleton className="h-4 w-28" /><Skeleton className="mt-2 h-12 w-full rounded-xl" /></div>
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* ── Conductor / Vehículo ── */}
      <div className="grid grid-cols-2 gap-4">
        <Select label="Conductor" value={form.driver_id} onChange={handleDriverChange} placeholder="Seleccionar conductor..." required
          options={drivers.map((d) => ({ value: d.id, label: d.full_name || d.email }))} />
        <Select label="Vehículo" value={form.vehicle_id} onChange={handleVehicleChange} placeholder="Seleccionar vehículo..." required
          options={vehicles.map((v) => ({ value: v.id, label: `${v.plate} - ${v.brand || ''} ${v.model}` }))} />
      </div>
      {form.driver_id && form.vehicle_id && (() => {
        const driver = drivers.find(d => d.id === form.driver_id);
        return driver?.current_vehicle_id === form.vehicle_id ? (
          <p className="text-xs text-emerald-600 flex items-center gap-1 -mt-3"><CheckCircle size={12} /> Conductor vinculado a este vehículo</p>
        ) : null;
      })()}

      {/* ── Mapa + Ruta Predefinida (todo junto) ── */}
      <div className="border border-surface-200 rounded-[1.5rem] bg-surface-50 p-5 flex flex-col gap-4 shadow-sm">
        <div>
          <h4 className="font-display font-semibold text-lg text-surface-900 tracking-tight">Recorrido</h4>
          <p className="text-sm text-surface-500 mb-3">Selecciona un trazado predefinido o marca origen, paradas y destino directamente en el mapa.</p>
        </div>

        {/* Selector de ruta predefinida arriba del mapa */}
        <Select
          label="Trazado Predefinido (opcional)"
          value={form.predefined_route_id}
          onChange={handlePredefinedChange}
          placeholder="— Seleccionar tramo para precargar —"
          hint="Al seleccionar un trazado, se marcarán el origen y destino automáticamente en el mapa."
          options={predefinedRoutes.map((r) => ({
            value: r.id,
            label: `${r.name} (${r.estimated_km} km - Aprox. ${Math.round(r.estimated_minutes / 60)}h)`
          }))}
        />

        {/* Indicador de origen/destino */}
        {(form.origin || form.destination) && (
          <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-surface-100">
            {form.origin && (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 text-sm font-semibold">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> {form.origin}
              </div>
            )}
            {form.origin && form.destination && <span className="text-surface-300">→</span>}
            {form.destination && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg border border-red-200 text-sm font-semibold">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" /> {form.destination}
              </div>
            )}
          </div>
        )}

        {/* Mapa */}
        <MapCheckpointsPicker
          origin={form.origin_lat ? { lat: form.origin_lat, lng: form.origin_lng, name: form.origin } : null}
          destination={form.dest_lat ? { lat: form.dest_lat, lng: form.dest_lng, name: form.destination } : null}
          checkpoints={form.checkpoints}
          onOriginSelect={handleOriginSelect}
          onDestinationSelect={handleDestinationSelect}
          onCheckpointsChange={handleCheckpointsChange}
        />

        {/* Checkpoints */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-surface-900">Checkpoints</label>
            <Button type="button" variant="secondary" size="sm"
              onClick={() => setForm({ ...form, checkpoints: [...form.checkpoints, { name: '', lat: '', lng: '', sequence_order: form.checkpoints.length + 1 }] })}
            >+ Agregar parada</Button>
          </div>
          <div className="space-y-3">
            {form.checkpoints.map((cp, idx) => (
              <div key={idx} className="group flex items-center gap-3 bg-white p-3 pr-4 rounded-xl border border-surface-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex flex-col items-center gap-1 text-surface-400">
                  <button type="button" disabled={idx === 0} onClick={() => { const newCp = [...form.checkpoints]; [newCp[idx - 1], newCp[idx]] = [newCp[idx], newCp[idx - 1]]; newCp.forEach((c, i) => c.sequence_order = i + 1); setForm({ ...form, checkpoints: newCp }); }}
                    className="p-1 hover:text-primary-600 hover:bg-primary-50 rounded disabled:opacity-30 transition-colors"><ArrowUp size={14} strokeWidth={2.5} /></button>
                  <button type="button" disabled={idx === form.checkpoints.length - 1} onClick={() => { const newCp = [...form.checkpoints]; [newCp[idx + 1], newCp[idx]] = [newCp[idx], newCp[idx + 1]]; newCp.forEach((c, i) => c.sequence_order = i + 1); setForm({ ...form, checkpoints: newCp }); }}
                    className="p-1 hover:text-primary-600 hover:bg-primary-50 rounded disabled:opacity-30 transition-colors"><ArrowDown size={14} strokeWidth={2.5} /></button>
                </div>
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold border-2 border-amber-200 shadow-inner">{idx + 1}</div>
                <div className="flex-1 flex flex-col gap-2">
                  <Input className="!min-h-[2.5rem] !py-1 text-sm font-semibold border-transparent hover:border-surface-200 focus:border-primary-500 bg-transparent hover:bg-white transition-all px-2 -ml-2"
                    placeholder="Nombre del punto..." value={cp.name}
                    onChange={(e) => { const newCp = [...form.checkpoints]; newCp[idx].name = e.target.value; setForm({ ...form, checkpoints: newCp }); }} required />
                  <div className="flex items-center gap-4 px-1 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-1.5 text-xs text-surface-500">
                      <MapPin size={12} className="text-surface-400" /> Lat:
                      <input type="number" step="any" required className="w-20 bg-transparent border-b border-dashed border-surface-300 focus:border-primary-500 outline-none p-0.5 text-surface-700 font-mono" value={cp.lat}
                        onChange={(e) => { const newCp = [...form.checkpoints]; newCp[idx].lat = e.target.value; setForm({ ...form, checkpoints: newCp }); }} />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-surface-500">Lng:
                      <input type="number" step="any" required className="w-20 bg-transparent border-b border-dashed border-surface-300 focus:border-primary-500 outline-none p-0.5 text-surface-700 font-mono" value={cp.lng}
                        onChange={(e) => { const newCp = [...form.checkpoints]; newCp[idx].lng = e.target.value; setForm({ ...form, checkpoints: newCp }); }} />
                    </div>
                  </div>
                </div>
                <button type="button" className="flex-shrink-0 p-2 text-surface-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  onClick={() => { const newCp = form.checkpoints.filter((_, i) => i !== idx); newCp.forEach((c, i) => c.sequence_order = i + 1); setForm({ ...form, checkpoints: newCp }); }}>
                  <Trash2 size={18} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
          {form.checkpoints.length === 0 && (
            <div className="text-center py-4 rounded-xl border border-dashed border-surface-200 bg-white/50">
              <p className="text-xs text-surface-500">Sin checkpoints. Usa el mapa o agrégalos manualmente.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── ¿Cuándo? ── */}
      {!initialData?.id && (
        <div className="border border-surface-200 rounded-2xl p-5 bg-surface-50/50 space-y-4">
          <h4 className="font-display font-semibold text-surface-900 tracking-tight">¿Cuándo?</h4>
          <div className="flex bg-white p-1 rounded-2xl gap-1 border border-surface-100">
            <button type="button" onClick={() => setTripType('schedule')}
              className={clsx("flex-1 py-2.5 px-4 flex items-center justify-center gap-2 text-sm font-semibold rounded-xl transition-all", tripType === 'schedule' ? "bg-primary-600 text-white shadow-md" : "text-surface-500 hover:text-surface-700")}
            ><CalendarRange size={16} /> Viaje Recurrente (Permanente)</button>
            <button type="button" onClick={() => setTripType('single')}
              className={clsx("flex-1 py-2.5 px-4 flex items-center justify-center gap-2 text-sm font-semibold rounded-xl transition-all", tripType === 'single' ? "bg-primary-600 text-white shadow-md" : "text-surface-500 hover:text-surface-700")}
            ><Rocket size={16} /> Viaje Único</button>
          </div>

          {tripType === 'single' ? (
            <Input type="datetime-local" label="Fecha y Hora de Salida" name="departure_time" value={form.departure_time} onChange={(e) => setForm(prev => ({ ...prev, departure_time: e.target.value }))} required />
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Días de Operación Fija *</label>
                <div className="flex gap-2 flex-wrap">
                  {DAY_NAMES.map((name, idx) => (
                    <button key={idx} type="button" onClick={() => toggleDay(idx)}
                      className={clsx("w-12 h-12 rounded-xl text-sm font-bold transition-all border-2",
                        dayTimes[String(idx)] ? "bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-600/30" : "bg-white text-surface-500 border-surface-200 hover:border-primary-300"
                      )}>{name}</button>
                  ))}
                </div>
              </div>

              {selectedDays.length > 0 && (
                <div className="bg-white rounded-xl p-4 space-y-3 border border-surface-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-surface-700">Horario de salida *</span>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={!sameTime} onChange={(e) => setSameTime(!e.target.checked)} className="accent-primary-600 w-4 h-4" />
                      <span className="text-surface-600">Hora diferente por día</span>
                    </label>
                  </div>
                  {sameTime ? (
                    <div className="flex items-center gap-3">
                      <Clock size={16} className="text-surface-400" />
                      <input type="time" value={globalTime} onChange={(e) => setGlobalTime(e.target.value)} className="rounded-xl border border-surface-200 px-3 py-2 text-sm font-mono font-semibold focus:border-primary-500 outline-none" />
                      <span className="text-xs text-surface-400">para todos los días</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedDays.map(day => (
                        <div key={day} className="flex items-center gap-3">
                          <span className="w-24 text-sm font-semibold text-surface-700">{DAY_FULL[day]}</span>
                          <input type="time" value={dayTimes[String(day)] || '08:30'} onChange={(e) => setDayTimes(prev => ({ ...prev, [String(day)]: e.target.value }))} className="rounded-xl border border-surface-200 px-3 py-2 text-sm font-mono font-semibold focus:border-primary-500 outline-none" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {initialData?.id && (
        <Input type="datetime-local" label="Fecha y Hora de Salida" name="departure_time" value={form.departure_time} onChange={(e) => setForm(prev => ({ ...prev, departure_time: e.target.value }))} required />
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="mt-2 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={submitting || (tripType === 'schedule' && selectedDays.length === 0)}>
          {submitting ? 'Guardando...' : initialData ? 'Guardar Cambios' : `Confirmar ${tripType === 'schedule' ? 'Rutina' : 'Viaje'}`}
        </Button>
      </div>
    </form>
  );
}

export default RouteForm;
