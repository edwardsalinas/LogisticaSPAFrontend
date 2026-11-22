import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '../../../components/atoms/Input';
import Button from '../../../components/atoms/Button';
import LocationPicker from '../../tracking/components/LocationPicker';
import { latField, lngField, requireInsideBolivia } from '../../../constants/locationSchema';
import apiService from '../../../services/apiService';

// Reglas de validación (React Hook Form + Zod); coinciden con las del backend (checkpoints.service.js)
export const checkpointFormSchema = z
  .object({
    name: z.string().trim().min(2, 'El nombre es requerido (mínimo 2 caracteres)'),
    lat: latField(),
    lng: lngField(),
    radius_meters: z.coerce.number({ message: 'Ingresa un radio válido' }).int('El radio debe ser un número entero').min(10, 'El radio mínimo es 10 m').max(1000, 'El radio máximo es 1000 m'),
    sequence_order: z.coerce.number({ message: 'Ingresa la posición' }).int('La posición debe ser un número entero').min(1, 'La posición mínima es 1'),
  })
  .superRefine(requireInsideBolivia);

/**
 * Formulario para crear/editar un checkpoint
 */
function CheckpointForm({ routeId, checkpoint, nextOrder = 1, onSuccess, onCancel }) {
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(checkpointFormSchema),
    defaultValues: {
      name: checkpoint?.name || '',
      lat: checkpoint?.lat ?? '',
      lng: checkpoint?.lng ?? '',
      radius_meters: checkpoint?.radius_meters || 100,
      sequence_order: checkpoint?.sequence_order || nextOrder, // el siguiente punto de la ruta, sin que el usuario cuente
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lat, lng] = watch(['lat', 'lng']);

  // Al elegir una ciudad, si el punto aún no tiene nombre, se lo pone la ciudad
  const nameFromPlace = (place) => {
    if (!getValues('name')?.trim()) setValue('name', place, { shouldValidate: true });
  };

  const onSubmit = async (values) => {
    setLoading(true);
    setError('');

    try {
      if (checkpoint) {
        await apiService.updateCheckpoint(routeId, checkpoint.id, values);
      } else {
        await apiService.createCheckpoint(routeId, values);
      }
      onSuccess();
    } catch (err) {
      setError(err.message || 'No se pudo guardar el punto de control');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <Input
        label="Nombre del punto de control"
        placeholder="Ej: Terminal La Paz"
        required
        error={errors.name?.message}
        {...register('name')}
      />

      <LocationPicker register={register} errors={errors} setValue={setValue} lat={lat} lng={lng} onPlace={nameFromPlace} />

      <details className="rounded-xl border border-surface-100 bg-surface-50/60 px-4 py-3">
        <summary className="min-h-6 cursor-pointer text-sm font-semibold text-surface-700">Opciones avanzadas</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Input label="Radio de llegada (metros)" type="number" hint="A qué distancia se considera que el vehículo llegó al punto." required error={errors.radius_meters?.message} {...register('radius_meters')} />
          <Input label="Posición en la ruta" type="number" hint="1 es el primer punto. Se asigna sola." required error={errors.sequence_order?.message} {...register('sequence_order')} />
        </div>
      </details>

      {error && (
        <div role="alert" className="bg-danger/10 border border-danger text-danger px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 mt-2">
        <Button variant="secondary" onClick={onCancel} type="button">
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : checkpoint ? 'Guardar cambios' : 'Crear punto de control'}
        </Button>
      </div>
    </form>
  );
}

export default CheckpointForm;
