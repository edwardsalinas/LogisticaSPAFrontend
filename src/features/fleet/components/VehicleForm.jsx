import { Truck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Button from '../../../components/atoms/Button';
import Input from '../../../components/atoms/Input';
import Select from '../../../components/atoms/Select';
import apiService from '../../../services/apiService';

// Estados de vehículo: los mismos que valida el backend (fleet.schema.js)
export const VEHICLE_STATUS_OPTIONS = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'en_servicio', label: 'En servicio' },
  { value: 'mantenimiento', label: 'En mantenimiento' },
  { value: 'retirado', label: 'Retirado' },
];

const VEHICLE_TYPE_OPTIONS = [
  { value: 'camion', label: 'Camión pesado' },
  { value: 'camion_ligero', label: 'Camión ligero' },
  { value: 'van', label: 'Furgoneta' },
  { value: 'trailer', label: 'Tráiler' },
];

// Reglas equivalentes a vehicleSchema del backend
export const vehicleFormSchema = z.object({
  plate: z.string().trim().min(6, 'La placa debe tener al menos 6 caracteres').max(10, 'La placa es demasiado larga'),
  brand: z.string().trim(),
  model: z.string().trim().min(2, 'El modelo es requerido'),
  type: z.string().min(2, 'Selecciona el tipo de vehículo'),
  capacity_kg: z.coerce.number({ message: 'Ingresa una capacidad válida' }).positive('La capacidad debe ser positiva'),
  status: z.enum(['disponible', 'en_servicio', 'mantenimiento', 'retirado']),
});

function VehicleForm({ onSuccess, onCancel }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: { plate: '', brand: '', model: '', type: 'camion', capacity_kg: '', status: 'disponible' },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (values) => {
    setLoading(true);
    setError('');
    try {
      const { brand, ...rest } = values;
      await apiService.createVehicle({
        ...rest,
        plate: rest.plate.toUpperCase(),
        ...(brand ? { brand } : {}),
      });
      onSuccess();
    } catch (err) {
      // El backend devuelve los errores de validación por campo en data.errors
      const fieldErrors = err.data?.errors ? Object.values(err.data.errors).flat() : [];
      setError(fieldErrors[0] || err.message || 'Error al guardar el vehículo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <div className="rounded-[1.4rem] border border-surface-100 bg-surface-50/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
            <Truck size={18} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-surface-500">Ficha de unidad</p>
            <p className="text-sm text-surface-600">Define placa, capacidad y estado de la unidad.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Placa" placeholder="INT-1234" required error={errors.plate?.message} {...register('plate')} />
        <Input label="Marca (opcional)" placeholder="Volvo" error={errors.brand?.message} {...register('brand')} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Modelo" placeholder="FH16" required error={errors.model?.message} {...register('model')} />
        <Select label="Tipo de vehículo" required options={VEHICLE_TYPE_OPTIONS} error={errors.type?.message} {...register('type')} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Capacidad (kg)" type="number" placeholder="20000" required error={errors.capacity_kg?.message} {...register('capacity_kg')} />
        <Select label="Estado" required options={VEHICLE_STATUS_OPTIONS} error={errors.status?.message} {...register('status')} />
      </div>

      {error && <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="flex flex-col-reverse justify-end gap-3 pt-2 sm:flex-row">
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={loading}><Truck size={16} strokeWidth={2.2} />{loading ? 'Guardando...' : 'Crear vehículo'}</Button>
      </div>
    </form>
  );
}

export default VehicleForm;
