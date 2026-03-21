import { useState, useEffect } from 'react';
import Input from '../../../components/atoms/Input';
import Select from '../../../components/atoms/Select';
import Button from '../../../components/atoms/Button';
import Skeleton from '../../../components/atoms/Skeleton';
import apiService from '../../../services/apiService';
import { Trash2, ArrowUp, ArrowDown, MapPin } from 'lucide-react';

function RouteForm({ onSuccess, onCancel, initialData = null }) {
  const [form, setForm] = useState({
    predefined_route_id: initialData?.predefined_route_id || '',
    origin: initialData?.origin || '',
    destination: initialData?.destination || '',
    driver_id: initialData?.driver_id || '',
    vehicle_id: initialData?.vehicle_id || '',
    departure_time: initialData?.departure_time ? new Date(initialData.departure_time).toISOString().slice(0, 16) : '',
    checkpoints: initialData?.checkpoints || [],
  });
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
        setDrivers(driversRes.data || []);
        setVehicles(vehiclesRes.data || []);
        setPredefinedRoutes(predefinedRes.data || []);
      } catch (err) {
        console.error('Error cargando datos:', err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const handlePredefinedChange = (e) => {
    const routeId = e.target.value;
    const selected = predefinedRoutes.find(r => r.id === routeId);
    if (selected) {
      setForm({
        ...form,
        predefined_route_id: routeId,
        origin: selected.origin_city,
        destination: selected.destination_city
      });
    } else {
      setForm({ ...form, predefined_route_id: routeId, origin: '', destination: '' });
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        ...form,
        departure_time: new Date(form.departure_time).toISOString(),
        checkpoints: form.checkpoints.map((cp, idx) => ({
          name: cp.name,
          lat: Number(cp.lat),
          lng: Number(cp.lng),
          sequence_order: idx + 1
        }))
      };

      if (initialData?.id) {
        await apiService.updateRoute(initialData.id, payload);
      } else {
        await apiService.createRoute(payload);
      }
      onSuccess();
    } catch (err) {
      setError(err.message || 'Error al guardar ruta');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx}>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-12 w-full rounded-xl" />
          </div>
        ))}
        <div className="flex justify-end gap-3 pt-2">
          <Skeleton className="h-11 w-28 rounded-xl" />
          <Skeleton className="h-11 w-32 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Select
        label="Ruta Predefinida"
        name="predefined_route_id"
        value={form.predefined_route_id}
        onChange={handlePredefinedChange}
        placeholder="Seleccionar ruta operativa..."
        required
        options={predefinedRoutes.map((r) => ({
          value: r.id,
          label: `${r.name} (${r.estimated_km} km - Aprox. ${Math.round(r.estimated_minutes / 60)}h)`
        }))}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Origen (Autocompletado)" name="origin" value={form.origin} readOnly disabled placeholder="Ciudad de origen" required />
        <Input label="Destino (Autocompletado)" name="destination" value={form.destination} readOnly disabled placeholder="Ciudad de destino" required />
      </div>
      <Select
        label="Conductor Responsable"
        name="driver_id"
        value={form.driver_id}
        onChange={handleChange}
        placeholder="Seleccionar conductor..."
        required
        options={drivers.map((d) => ({ value: d.id, label: d.full_name || d.email }))}
      />
      <Select
        label="Vehiculo Asignado"
        name="vehicle_id"
        value={form.vehicle_id}
        onChange={handleChange}
        placeholder="Seleccionar vehiculo..."
        required
        options={vehicles.map((v) => ({ value: v.id, label: `${v.plate_number} - ${v.brand} ${v.model}` }))}
      />
      <Input 
        type="datetime-local" 
        label="Fecha y Hora de Salida" 
        name="departure_time" 
        value={form.departure_time} 
        onChange={handleChange} 
        required 
      />

      <div className="flex flex-col gap-3 mt-2">
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium text-surface-900">Checkpoints de control (Opcional)</label>
          <Button 
            type="button" 
            variant="secondary" 
            size="sm" 
            onClick={() => setForm({ ...form, checkpoints: [...form.checkpoints, { name: '', lat: '', lng: '', sequence_order: form.checkpoints.length + 1 }] })}
          >
            + Agregar parada
          </Button>
        </div>
        <div className="space-y-3">
          {form.checkpoints.map((cp, idx) => (
            <div key={idx} className="group relative flex items-center gap-3 bg-white p-3 pr-4 rounded-xl border border-surface-200 shadow-sm transition-all hover:shadow-md hover:border-surface-300">
              
              {/* Controles de reordenamiento */}
              <div className="flex flex-col items-center gap-1 text-surface-400">
                <button 
                  type="button" 
                  disabled={idx === 0}
                  onClick={() => {
                    const newCp = [...form.checkpoints];
                    const temp = newCp[idx - 1];
                    newCp[idx - 1] = newCp[idx];
                    newCp[idx] = temp;
                    newCp.forEach((c, i) => c.sequence_order = i + 1);
                    setForm({ ...form, checkpoints: newCp });
                  }}
                  className="p-1 hover:text-primary-600 hover:bg-primary-50 rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-surface-400 transition-colors"
                >
                  <ArrowUp size={14} strokeWidth={2.5} />
                </button>
                <button 
                  type="button" 
                  disabled={idx === form.checkpoints.length - 1}
                  onClick={() => {
                    const newCp = [...form.checkpoints];
                    const temp = newCp[idx + 1];
                    newCp[idx + 1] = newCp[idx];
                    newCp[idx] = temp;
                    newCp.forEach((c, i) => c.sequence_order = i + 1);
                    setForm({ ...form, checkpoints: newCp });
                  }}
                  className="p-1 hover:text-primary-600 hover:bg-primary-50 rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-surface-400 transition-colors"
                >
                  <ArrowDown size={14} strokeWidth={2.5} />
                </button>
              </div>

              {/* Distintivo Numérico */}
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold border-2 border-amber-200 shadow-inner">
                {idx + 1}
              </div>

              {/* Contenido Principal */}
              <div className="flex-1 flex flex-col gap-2">
                <Input 
                  className="!min-h-[2.5rem] !py-1 text-sm font-semibold border-transparent hover:border-surface-200 focus:border-primary-500 bg-transparent hover:bg-white transition-all px-2 -ml-2"
                  placeholder="Escribe el nombre del punto..."
                  value={cp.name}
                  onChange={(e) => {
                    const newCp = [...form.checkpoints];
                    newCp[idx].name = e.target.value;
                    setForm({ ...form, checkpoints: newCp });
                  }}
                  required
                />
                
                <div className="flex items-center gap-4 px-1 opacity-60 focus-within:opacity-100 hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-1.5 text-xs text-surface-500">
                    <MapPin size={12} className="text-surface-400" /> Lat:
                    <input 
                      type="number" step="any" required
                      className="w-20 bg-transparent border-b border-dashed border-surface-300 focus:border-primary-500 outline-none p-0.5 text-surface-700 font-mono"
                      value={cp.lat}
                      onChange={(e) => {
                        const newCp = [...form.checkpoints];
                        newCp[idx].lat = e.target.value;
                        setForm({ ...form, checkpoints: newCp });
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-surface-500">
                    Lng:
                    <input 
                      type="number" step="any" required
                      className="w-20 bg-transparent border-b border-dashed border-surface-300 focus:border-primary-500 outline-none p-0.5 text-surface-700 font-mono"
                      value={cp.lng}
                      onChange={(e) => {
                        const newCp = [...form.checkpoints];
                        newCp[idx].lng = e.target.value;
                        setForm({ ...form, checkpoints: newCp });
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Botón Eliminar */}
              <button 
                type="button" 
                className="flex-shrink-0 p-2 text-surface-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar parada"
                onClick={() => {
                  const newCp = form.checkpoints.filter((_, i) => i !== idx);
                  newCp.forEach((c, i) => c.sequence_order = i + 1);
                  setForm({ ...form, checkpoints: newCp });
                }}
              >
                <Trash2 size={18} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
        {form.checkpoints.length === 0 && (
          <div className="text-center py-4 rounded-xl border border-dashed border-surface-200 bg-surface-50/50">
            <p className="text-xs text-surface-500">No hay checkpoints intermedios definidos. Presiona "+ Agregar parada" si necesitas controles de seguridad.</p>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="mt-2 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={submitting}>{submitting ? 'Guardando...' : initialData ? 'Guardar Cambios' : 'Crear Ruta'}</Button>
      </div>
    </form>
  );
}

export default RouteForm;
