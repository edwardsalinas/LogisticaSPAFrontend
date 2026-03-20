import { Boxes, MapPinned, PackagePlus } from 'lucide-react';
import { useState } from 'react';
import Button from '../../../components/atoms/Button';
import Input from '../../../components/atoms/Input';
import api from '../../../services/api';

function PackageForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState({ origen: '', destino: '', peso: '', description: '' });
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
      await api.post('/logistics/packages', { ...form, peso: parseFloat(form.peso) });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Error al registrar paquete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-[1.4rem] border border-surface-100 bg-surface-50/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
            <PackagePlus size={18} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[0.64rem] uppercase tracking-[0.18em] text-surface-500">Nuevo registro</p>
            <p className="text-sm text-surface-600">Completa el origen, destino y datos base del paquete.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Origen" name="origen" value={form.origen} onChange={handleChange} placeholder="Ciudad de origen" required />
        <Input label="Destino" name="destino" value={form.destino} onChange={handleChange} placeholder="Ciudad de destino" required />
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Input label="Peso (kg)" name="peso" type="number" value={form.peso} onChange={handleChange} placeholder="Ej: 15" required />
        <Input label="Descripcion" name="description" value={form.description} onChange={handleChange} placeholder="Contenido, referencia o nota operativa" />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-[1.2rem] border border-surface-100 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700"><MapPinned size={17} strokeWidth={2.2} /></div>
            <div>
              <p className="text-sm font-semibold text-surface-900">Ruta inicial</p>
              <p className="text-xs text-surface-500">La asignacion se podra hacer despues del registro.</p>
            </div>
          </div>
        </div>
        <div className="rounded-[1.2rem] border border-surface-100 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><Boxes size={17} strokeWidth={2.2} /></div>
            <div>
              <p className="text-sm font-semibold text-surface-900">Control de carga</p>
              <p className="text-xs text-surface-500">Verifica peso y descripcion antes de guardar.</p>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Registrando...' : 'Registrar paquete'}</Button>
      </div>
    </form>
  );
}

export default PackageForm;
