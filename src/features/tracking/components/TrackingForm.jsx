import { MapPinned, Route, Save } from 'lucide-react';
import { useState } from 'react';
import Button from '../../../components/atoms/Button';
import Input from '../../../components/atoms/Input';
import Select from '../../../components/atoms/Select';
import api from '../../../services/api';

function TrackingForm({ packages, onSuccess, onCancel }) {
  const [form, setForm] = useState({ package_id: '', status: '', lat: '', lng: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/tracking/logs', {
        ...form,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
      });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Error registrando evento');
    } finally {
      setLoading(false);
    }
  };

  const packageOptions = packages.map((p) => ({
    value: p.id,
    label: `${p.tracking_code} - ${p.origen} -> ${p.destino}`,
  }));

  const statusOptions = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'assigned', label: 'Asignado' },
    { value: 'in_transit', label: 'En transito' },
    { value: 'delivered', label: 'Entregado' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-[1.4rem] border border-surface-100 bg-surface-50/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
            <Route size={18} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[0.64rem] uppercase tracking-[0.18em] text-surface-500">Nuevo evento</p>
            <p className="text-sm text-surface-600">Asocia el paquete, define el estado y guarda la ubicacion reportada.</p>
          </div>
        </div>
      </div>

      <Select label="Paquete" name="package_id" value={form.package_id} onChange={handleChange} options={packageOptions} required />
      <Select label="Estado" name="status" value={form.status} onChange={handleChange} options={statusOptions} required />

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Latitud" name="lat" type="number" step="any" value={form.lat} onChange={handleChange} placeholder="Ej: -16.4897" required />
        <Input label="Longitud" name="lng" type="number" step="any" value={form.lng} onChange={handleChange} placeholder="Ej: -68.1193" required />
      </div>

      <div className="rounded-[1.2rem] border border-surface-100 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <MapPinned size={17} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-sm font-semibold text-surface-900">Coordenadas de referencia</p>
            <p className="text-xs text-surface-500">Usa valores reales para que el mapa y la trazabilidad mantengan consistencia.</p>
          </div>
        </div>
      </div>

      {error && <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={loading}><Save size={16} strokeWidth={2.2} />{loading ? 'Guardando...' : 'Guardar evento'}</Button>
      </div>
    </form>
  );
}

export default TrackingForm;