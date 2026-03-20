import { CalendarRange, ShieldCheck, Truck, Wrench } from 'lucide-react';
import { useState } from 'react';
import Button from '../../../components/atoms/Button';
import Input from '../../../components/atoms/Input';
import Select from '../../../components/atoms/Select';

function VehicleForm({ vehicle = null, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    plate_number: vehicle?.plate_number || '',
    brand: vehicle?.brand || '',
    model: vehicle?.model || '',
    year: vehicle?.year || new Date().getFullYear(),
    type: vehicle?.type || 'truck',
    capacity_kg: vehicle?.capacity_kg || '',
    status: vehicle?.status || 'active',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      onSuccess();
    } catch (err) {
      setError(err.message || 'Error al guardar vehiculo');
    } finally {
      setLoading(false);
    }
  };

  const vehicleTypes = [
    { value: 'truck', label: 'Camion pesado' },
    { value: 'van', label: 'Furgoneta' },
    { value: 'light_truck', label: 'Camion ligero' },
    { value: 'trailer', label: 'Trailer' },
  ];

  const vehicleStatus = [
    { value: 'active', label: 'Activo' },
    { value: 'maintenance', label: 'En mantenimiento' },
    { value: 'inactive', label: 'Inactivo' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear - i);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-[1.4rem] border border-surface-100 bg-surface-50/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
            <Truck size={18} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[0.64rem] uppercase tracking-[0.18em] text-surface-500">Ficha de unidad</p>
            <p className="text-sm text-surface-600">Define placa, capacidad y estado para mantener la flota operativa y ordenada.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Placa" name="plate_number" value={form.plate_number} onChange={handleChange} placeholder="INT-1234" required />
        <Input label="Marca" name="brand" value={form.brand} onChange={handleChange} placeholder="Volvo" required />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Modelo" name="model" value={form.model} onChange={handleChange} placeholder="FH16" required />
        <Select label="Ano" name="year" value={form.year} onChange={handleChange} required options={years.map((year) => ({ value: year, label: year.toString() }))} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Select label="Tipo de vehiculo" name="type" value={form.type} onChange={handleChange} required options={vehicleTypes} />
        <Input label="Capacidad (kg)" name="capacity_kg" type="number" value={form.capacity_kg} onChange={handleChange} placeholder="20000" required />
      </div>

      <Select label="Estado" name="status" value={form.status} onChange={handleChange} required options={vehicleStatus} />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[1.2rem] border border-surface-100 bg-white p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700"><CalendarRange size={17} strokeWidth={2.2} /></div><div><p className="text-sm font-semibold text-surface-900">Vida util visible</p><p className="text-xs text-surface-500">Ano y modelo listos para control preventivo.</p></div></div></div>
        <div className="rounded-[1.2rem] border border-surface-100 bg-white p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><Wrench size={17} strokeWidth={2.2} /></div><div><p className="text-sm font-semibold text-surface-900">Mantenimiento claro</p><p className="text-xs text-surface-500">El estado ayuda a evitar asignaciones incorrectas.</p></div></div></div>
        <div className="rounded-[1.2rem] border border-surface-100 bg-white p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><ShieldCheck size={17} strokeWidth={2.2} /></div><div><p className="text-sm font-semibold text-surface-900">Capacidad lista</p><p className="text-xs text-surface-500">Base util para planificacion de carga y despacho.</p></div></div></div>
      </div>

      {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="flex flex-col-reverse justify-end gap-3 pt-2 sm:flex-row">
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={loading}><Truck size={16} strokeWidth={2.2} />{loading ? 'Guardando...' : vehicle ? 'Actualizar vehiculo' : 'Crear vehiculo'}</Button>
      </div>
    </form>
  );
}

export default VehicleForm;