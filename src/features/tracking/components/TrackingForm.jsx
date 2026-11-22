import { Route, Save } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Button from '../../../components/atoms/Button';
import Select from '../../../components/atoms/Select';
import apiService from '../../../services/apiService';
import { PACKAGE_STATUS } from '../../../constants/status';
import { matchCity } from '../../../constants/bolivia';
import { latField, lngField, requireInsideBolivia } from '../../../constants/locationSchema';
import LocationPicker from './LocationPicker';

const STATUS_OPTIONS = [
  { value: PACKAGE_STATUS.PENDING, label: 'Pendiente' },
  { value: PACKAGE_STATUS.ASSIGNED, label: 'Asignado' },
  { value: PACKAGE_STATUS.IN_TRANSIT, label: 'En tránsito' },
  { value: PACKAGE_STATUS.AT_AGENCY, label: 'En agencia' },
  { value: PACKAGE_STATUS.DELIVERED, label: 'Entregado' },
  { value: PACKAGE_STATUS.INCIDENT, label: 'Siniestro' },
];

// Reglas equivalentes a trackingEventSchema del backend (tracking.schema.js)
export const trackingFormSchema = z
  .object({
    package_id: z.string().min(1, 'Selecciona un paquete'),
    status: z.string().min(1, 'Selecciona el estado'),
    lat: latField(),
    lng: lngField(),
  })
  .superRefine(requireInsideBolivia);

// Dónde suele estar el paquete según el estado: al asignarlo, en el origen; al entregarlo o dejarlo en agencia, en el destino.
export const suggestedCityFor = (pkg, status) => {
  if (!pkg) return null;
  if (status === PACKAGE_STATUS.PENDING || status === PACKAGE_STATUS.ASSIGNED) return matchCity(pkg.origen);
  if (status === PACKAGE_STATUS.DELIVERED || status === PACKAGE_STATUS.AT_AGENCY) return matchCity(pkg.destino);
  return null;
};

function TrackingForm({ packages = [], onSuccess, onCancel }) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(trackingFormSchema),
    defaultValues: { package_id: '', status: '', lat: '', lng: '' },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [packageId, status, lat, lng] = watch(['package_id', 'status', 'lat', 'lng']);
  const suggestion = suggestedCityFor(packages.find((p) => p.id === packageId), status);

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
            <p className="text-xs uppercase tracking-[0.18em] text-surface-500">Nuevo evento</p>
            <p className="text-sm text-surface-600">Asocia el paquete, define el estado y indica dónde está.</p>
          </div>
        </div>
      </div>

      <Select label="Paquete" options={packageOptions} placeholder="Selecciona un paquete..." required error={errors.package_id?.message} {...register('package_id')} />
      <Select label="Estado" options={STATUS_OPTIONS} placeholder="Selecciona el estado..." required error={errors.status?.message} {...register('status')} />

      <LocationPicker register={register} errors={errors} setValue={setValue} lat={lat} lng={lng} suggestion={suggestion} />

      {error && <p role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={loading}><Save size={16} strokeWidth={2.2} />{loading ? 'Guardando...' : 'Guardar evento'}</Button>
      </div>
    </form>
  );
}

export default TrackingForm;
