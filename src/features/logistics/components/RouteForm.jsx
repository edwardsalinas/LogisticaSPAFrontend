import { useState, useEffect } from 'react';
import Input from '../../../components/atoms/Input';
import Select from '../../../components/atoms/Select';
import Button from '../../../components/atoms/Button';
import Skeleton from '../../../components/atoms/Skeleton';
import api from '../../../services/api';

function RouteForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState({
    origin: '',
    destination: '',
    driver_id: '',
    vehicle_id: '',
  });
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [driversRes, vehiclesRes] = await Promise.all([
          api.get('/fleet/drivers'),
          api.get('/fleet/vehicles'),
        ]);
        setDrivers(driversRes.data || []);
        setVehicles(vehiclesRes.data || []);
      } catch (err) {
        console.error('Error cargando datos:', err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await api.post('/logistics/routes', form);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Error al crear ruta');
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
      <Input label="Origen" name="origin" value={form.origin} onChange={handleChange} placeholder="Ciudad de origen" required />
      <Input label="Destino" name="destination" value={form.destination} onChange={handleChange} placeholder="Ciudad de destino" required />
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

      {error && <p className="text-danger text-sm">{error}</p>}

      <div className="mt-2 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={submitting}>{submitting ? 'Creando...' : 'Crear Ruta'}</Button>
      </div>
    </form>
  );
}

export default RouteForm;
