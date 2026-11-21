import { MapPinned, Route, Save } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Button from '../../../components/atoms/Button';
import Input from '../../../components/atoms/Input';
import Select from '../../../components/atoms/Select';
import apiService from '../../../services/apiService';
import { PACKAGE_STATUS } from '../../../constants/status';

const STATUS_OPTIONS = [
  { value: PACKAGE_STATUS.PENDING, label: 'Pendiente' },
  { value: PACKAGE_STATUS.ASSIGNED, label: 'Asignado' },
  { value: PACKAGE_STATUS.IN_TRANSIT, label: 'En tránsito' },
  { value: PACKAGE_STATUS.AT_AGENCY, label: 'En agencia' },
  { value: PACKAGE_STATUS.DELIVERED, label: 'Entregado' },
  { value: PACKAGE_STATUS.INCIDENT, label: 'Siniestro' },
];

// Reglas equivalentes a trackingEventSchema del backend (tracking.schema.js)
export const trackingFormSchema = z.object({
  package_id: z.string().min(1, 'Selecciona un paquete'),
  status: z.string().min(1, 'Selecciona el estado'),
  lat: z.coerce.number({ message: 'Ingresa una latitud válida' }).min(-90, 'La latitud debe estar entre -90 y 90').max(90, 'La latitud debe estar entre -90 y 90'),
  lng: z.coerce.number({ message: 'Ingresa una longitud válida' }).min(-180, 'La longitud debe estar entre -180 y 180').max(180, 'La longitud debe estar entre -180 y 180'),
});

function TrackingForm({ packages = [], onSuccess, onCancel }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(trackingFormSchema),
    defaultValues: { package_id: '', status: '', lat: '', lng: '' },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (values) => {
    setLoading(true);
    setError('');

    try {
      // POST /tracking (antes apuntaba a /tracking/logs, una ruta que no existe en el backend)
      await apiService.createTrackingEvent(values);
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
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

      <Select label="Paquete" options={packageOptions} placeholder="Selecciona un paquete..." required error={errors.package_id?.message} {...register('package_id')} />
      <Select label="Estado" options={STATUS_OPTIONS} placeholder="Selecciona el estado..." required error={errors.status?.message} {...register('status')} />

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Latitud" type="number" step="any" placeholder="Ej: -16.4897" required error={errors.lat?.message} {...register('lat')} />
        <Input label="Longitud" type="number" step="any" placeholder="Ej: -68.1193" required error={errors.lng?.message} {...register('lng')} />
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

      {error && <p role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={loading}><Save size={16} strokeWidth={2.2} />{loading ? 'Guardando...' : 'Guardar evento'}</Button>
      </div>
    </form>
  );
}

export default TrackingForm;
