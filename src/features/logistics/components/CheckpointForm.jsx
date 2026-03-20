import { useState } from 'react';
import Input from '../../../components/atoms/Input';
import Button from '../../../components/atoms/Button';
import { mockApi } from '../../../services/api.mock';

/**
 * Formulario para crear/editar un checkpoint
 */
function CheckpointForm({ routeId, checkpoint, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    name: checkpoint?.name || '',
    lat: checkpoint?.lat || '',
    lng: checkpoint?.lng || '',
    radius_meters: checkpoint?.radius_meters || 100,
    sequence_order: checkpoint?.sequence_order || 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      setUseCurrentLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setForm({
            ...form,
            lat: position.coords.latitude.toFixed(6),
            lng: position.coords.longitude.toFixed(6),
          });
          setUseCurrentLocation(false);
        },
        (error) => {
          console.error('Error obteniendo ubicación:', error);
          setError('No se pudo obtener la ubicación actual');
          setUseCurrentLocation(false);
        }
      );
    } else {
      setError('La geolocalización no es soportada por este navegador');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (checkpoint) {
        // Editar checkpoint existente
        await mockApi.updateCheckpoint(routeId, checkpoint.id, {
          ...form,
          lat: parseFloat(form.lat),
          lng: parseFloat(form.lng),
          radius_meters: parseInt(form.radius_meters),
          sequence_order: parseInt(form.sequence_order),
        });
      } else {
        // Crear nuevo checkpoint
        await mockApi.createCheckpoint(routeId, {
          ...form,
          lat: parseFloat(form.lat),
          lng: parseFloat(form.lng),
          radius_meters: parseInt(form.radius_meters),
          sequence_order: parseInt(form.sequence_order),
        });
      }
      onSuccess();
    } catch (err) {
      setError(err.message || 'Error al guardar checkpoint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Nombre del Checkpoint"
        name="name"
        value={form.name}
        onChange={handleChange}
        placeholder="Ej: Terminal La Paz"
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Latitud"
          name="lat"
          type="number"
          step="any"
          value={form.lat}
          onChange={handleChange}
          placeholder="-16.500000"
          required
        />
        <Input
          label="Longitud"
          name="lng"
          type="number"
          step="any"
          value={form.lng}
          onChange={handleChange}
          placeholder="-68.119300"
          required
        />
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
        <Input
          label="Radio (metros)"
          name="radius_meters"
          type="number"
          value={form.radius_meters}
          onChange={handleChange}
          placeholder="100"
          min="10"
          max="1000"
          required
        />
        <Input
          label="Orden en la ruta"
          name="sequence_order"
          type="number"
          value={form.sequence_order}
          onChange={handleChange}
          placeholder="1"
          min="1"
          required
        />
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger text-danger px-3 py-2 rounded-lg text-sm">
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
