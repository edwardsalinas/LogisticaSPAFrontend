import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '../../../components/atoms/Input';
import Button from '../../../components/atoms/Button';
import apiService from '../../../services/apiService';

// Reglas de validación (React Hook Form + Zod); coinciden con las del backend (checkpoints.service.js)
export const checkpointFormSchema = z.object({
  name: z.string().trim().min(2, 'El nombre es requerido (mínimo 2 caracteres)'),
  lat: z.coerce.number({ message: 'Ingresa una latitud válida' }).min(-90, 'La latitud debe estar entre -90 y 90').max(90, 'La latitud debe estar entre -90 y 90'),
  lng: z.coerce.number({ message: 'Ingresa una longitud válida' }).min(-180, 'La longitud debe estar entre -180 y 180').max(180, 'La longitud debe estar entre -180 y 180'),
  radius_meters: z.coerce.number({ message: 'Ingresa un radio válido' }).int('El radio debe ser un número entero').min(10, 'El radio mínimo es 10 m').max(1000, 'El radio máximo es 1000 m'),
  sequence_order: z.coerce.number({ message: 'Ingresa el orden' }).int('El orden debe ser un número entero').min(1, 'El orden mínimo es 1'),
});

/**
 * Formulario para crear/editar un checkpoint
 */
function CheckpointForm({ routeId, checkpoint, onSuccess, onCancel }) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(checkpointFormSchema),
    defaultValues: {
      name: checkpoint?.name || '',
      lat: checkpoint?.lat ?? '',
      lng: checkpoint?.lng ?? '',
      radius_meters: checkpoint?.radius_meters || 100,
      sequence_order: checkpoint?.sequence_order || 1,
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('La geolocalización no es soportada por este navegador');
      return;
    }
    setUseCurrentLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('lat', position.coords.latitude.toFixed(6), { shouldValidate: true });
        setValue('lng', position.coords.longitude.toFixed(6), { shouldValidate: true });
        setUseCurrentLocation(false);
      },
      (geoError) => {
        console.error('Error obteniendo ubicación:', geoError);
        setError('No se pudo obtener la ubicación actual');
        setUseCurrentLocation(false);
      }
    );
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
      setError(err.message || 'Error al guardar checkpoint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <Input
        label="Nombre del Checkpoint"
        placeholder="Ej: Terminal La Paz"
        required
        error={errors.name?.message}
        {...register('name')}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input label="Latitud" type="number" step="any" placeholder="-16.500000" required error={errors.lat?.message} {...register('lat')} />
        <Input label="Longitud" type="number" step="any" placeholder="-68.119300" required error={errors.lng?.message} {...register('lng')} />
      </div>

      <Button
        type="button"
        variant="secondary"
        onClick={handleGetCurrentLocation}
        disabled={useCurrentLocation}
        className="text-sm"
      >
        {useCurrentLocation ? 'Obteniendo ubicación...' : '📍 Usar mi ubicación actual'}
      </Button>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Radio (metros)" type="number" placeholder="100" required error={errors.radius_meters?.message} {...register('radius_meters')} />
        <Input label="Orden en la ruta" type="number" placeholder="1" required error={errors.sequence_order?.message} {...register('sequence_order')} />
      </div>

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
          {loading ? 'Guardando...' : checkpoint ? 'Actualizar Checkpoint' : 'Crear Checkpoint'}
        </Button>
      </div>
    </form>
  );
}

export default CheckpointForm;
