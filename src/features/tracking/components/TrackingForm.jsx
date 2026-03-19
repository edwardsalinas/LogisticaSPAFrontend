import { useState } from 'react';
import Input from '../../../components/atoms/Input';
import Select from '../../../components/atoms/Select';
import Button from '../../../components/atoms/Button';
import api from '../../../services/api';

const statusOptions = [
  { value: 'in_warehouse', label: 'Recibido en Almacén' },
  { value: 'in_transit', label: 'En Tránsito' },
  { value: 'in_delivery', label: 'En Reparto' },
  { value: 'delivered', label: 'Entregado' },
];

function TrackingForm({ packages, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    package_id: '',
    lat: '',
    lng: '',
    status: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await api.post('/tracking', {
        package_id: form.package_id,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        status: form.status,
      });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Error al registrar evento');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Select
        label="Paquete"
        name="package_id"
        value={form.package_id}
        onChange={handleChange}
        placeholder="Seleccionar paquete..."
        required
        options={packages.map((p) => ({
          value: p.id,
          label: `${p.tracking_code} — ${p.origen} → ${p.destino}`,
        }))}
      />
      <Select
        label="Estado"
        name="status"
        value={form.status}
        onChange={handleChange}
        placeholder="Seleccionar estado..."
        required
        options={statusOptions}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Latitud"
          name="lat"
          type="number"
          step="any"
          value={form.lat}
          onChange={handleChange}
          placeholder="-16.5000"
          required
        />
        <Input
          label="Longitud"
          name="lng"
          type="number"
          step="any"
          value={form.lng}
          onChange={handleChange}
          placeholder="-68.1193"
          required
        />
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}

      <div className="flex justify-end gap-3 mt-2">
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Registrando...' : 'Registrar Evento'}
        </Button>
      </div>
    </form>
  );
}

export default TrackingForm;
