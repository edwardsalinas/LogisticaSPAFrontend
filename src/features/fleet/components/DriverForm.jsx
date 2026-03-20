import { IdCard, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import Button from '../../../components/atoms/Button';
import Input from '../../../components/atoms/Input';
import Select from '../../../components/atoms/Select';

function DriverForm({ driver = null, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    full_name: driver?.full_name || '',
    email: driver?.email || '',
    phone: driver?.phone || '',
    license_number: driver?.license_number || '',
    license_type: driver?.license_type || 'B',
    status: driver?.status || 'active',
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
      setError(err.message || 'Error al guardar conductor');
    } finally {
      setLoading(false);
    }
  };

  const licenseTypes = [
    { value: 'A', label: 'Tipo A - Livianos' },
    { value: 'B', label: 'Tipo B - Pesados' },
    { value: 'C', label: 'Tipo C - Carga pesada' },
    { value: 'D', label: 'Tipo D - Transporte publico' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Activo' },
    { value: 'vacation', label: 'Vacaciones' },
    { value: 'inactive', label: 'Inactivo' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-[1.4rem] border border-surface-100 bg-surface-50/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
            <UserRound size={18} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[0.64rem] uppercase tracking-[0.18em] text-surface-500">Ficha de conductor</p>
            <p className="text-sm text-surface-600">Registra identidad, licencia y estado operativo del miembro del equipo.</p>
          </div>
        </div>
      </div>

      <Input label="Nombre completo" name="full_name" value={form.full_name} onChange={handleChange} placeholder="Juan Perez" required />

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="juan@empresa.com" required />
        <Input label="Telefono" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+591 70012345" required />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Numero de licencia" name="license_number" value={form.license_number} onChange={handleChange} placeholder="LIC-123456" required />
        <Select label="Tipo de licencia" name="license_type" value={form.license_type} onChange={handleChange} required options={licenseTypes} />
      </div>

      <Select label="Estado" name="status" value={form.status} onChange={handleChange} required options={statusOptions} />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[1.2rem] border border-surface-100 bg-white p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700"><Mail size={17} strokeWidth={2.2} /></div><div><p className="text-sm font-semibold text-surface-900">Contacto verificado</p><p className="text-xs text-surface-500">Confirma email y telefono antes de asignar rutas.</p></div></div></div>
        <div className="rounded-[1.2rem] border border-surface-100 bg-white p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><IdCard size={17} strokeWidth={2.2} /></div><div><p className="text-sm font-semibold text-surface-900">Licencia activa</p><p className="text-xs text-surface-500">Asegura compatibilidad entre licencia y tipo de unidad.</p></div></div></div>
        <div className="rounded-[1.2rem] border border-surface-100 bg-white p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><ShieldCheck size={17} strokeWidth={2.2} /></div><div><p className="text-sm font-semibold text-surface-900">Estado operativo</p><p className="text-xs text-surface-500">Mantiene claridad para asignacion y cobertura diaria.</p></div></div></div>
      </div>

      {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="flex flex-col-reverse justify-end gap-3 pt-2 sm:flex-row">
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={loading}><Phone size={16} strokeWidth={2.2} />{loading ? 'Guardando...' : driver ? 'Actualizar conductor' : 'Registrar conductor'}</Button>
      </div>
    </form>
  );
}

export default DriverForm;