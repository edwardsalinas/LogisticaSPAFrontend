import { useState, useEffect } from 'react';
import Input from '../../../components/atoms/Input';
import Select from '../../../components/atoms/Select';
import Button from '../../../components/atoms/Button';
import Spinner from '../../../components/atoms/Spinner';
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

  if (loadingData) return <Spinner />;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Origen"
        name="origin"
        value={form.origin}
        onChange={handleChange}
        placeholder="Ciudad de origen"
        required
      />
      <Input
        label="Destino"
        name="destination"
        value={form.destination}
        onChange={handleChange}
        placeholder="Ciudad de destino"
        required
      />
      <Select
        label="Conductor Responsable"
        name="driver_id"
        value={form.driver_id}
        onChange={handleChange}
        placeholder="Seleccionar conductor..."
        required
        options={drivers.map((d) => ({
          value: d.id,
          label: d.full_name || d.email,
        }))}
      />
      <Select
        label="Vehículo Asignado"
        name="vehicle_id"
        value={form.vehicle_id}
        onChange={handleChange}
        placeholder="Seleccionar vehículo..."
        required
        options={vehicles.map((v) => ({
          value: v.id,
          label: `${v.plate_number} — ${v.brand} ${v.model}`,
        }))}
      />

      {error && <p className="text-danger text-sm">{error}</p>}

      <div className="flex justify-end gap-3 mt-2">
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creando...' : 'Crear Ruta'}
        </Button>
      </div>
    </form>
  );
}

export default RouteForm;
