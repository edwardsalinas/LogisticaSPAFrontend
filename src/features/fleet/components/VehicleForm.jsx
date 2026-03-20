import { useState } from 'react';
import Input from '../../../components/atoms/Input';
import Select from '../../../components/atoms/Select';
import Button from '../../../components/atoms/Button';

/**
 * VehicleForm - Formulario para crear/editar vehículo
 * @param {Object} vehicle - Datos del vehículo a editar (opcional)
 * @param {function} onSuccess - Callback al completar
 * @param {function} onCancel - Callback al cancelar
 */
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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Simular llamada a API (mock)
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log('Vehículo guardado:', form);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Error al guardar vehículo');
    } finally {
      setLoading(false);
    }
  };

  const vehicleTypes = [
    { value: 'truck', label: 'Camión Pesado' },
    { value: 'van', label: 'Furgoneta' },
    { value: 'light_truck', label: 'Camión Ligero' },
    { value: 'trailer', label: 'Tráiler' },
  ];

  const vehicleStatus = [
    { value: 'active', label: 'Activo' },
    { value: 'maintenance', label: 'En Mantenimiento' },
    { value: 'inactive', label: 'Inactivo' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear - i);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Placa"
          name="plate_number"
          value={form.plate_number}
          onChange={handleChange}
          placeholder="INT-1234"
          required
        />
        <Input
          label="Marca"
          name="brand"
          value={form.brand}
          onChange={handleChange}
          placeholder="Volvo"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Modelo"
          name="model"
          value={form.model}
          onChange={handleChange}
          placeholder="FH16"
          required
        />
        <Select
          label="Año"
          name="year"
          value={form.year}
          onChange={handleChange}
          required
          options={years.map((year) => ({
            value: year,
            label: year.toString(),
          }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Tipo de Vehículo"
          name="type"
          value={form.type}
          onChange={handleChange}
          required
          options={vehicleTypes}
        />
        <Input
          label="Capacidad (kg)"
          name="capacity_kg"
          type="number"
          value={form.capacity_kg}
          onChange={handleChange}
          placeholder="20000"
          required
        />
      </div>

      <Select
        label="Estado"
        name="status"
        value={form.status}
        onChange={handleChange}
        required
        options={vehicleStatus}
      />

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
          {loading ? 'Guardando...' : vehicle ? 'Actualizar Vehículo' : 'Crear Vehículo'}
        </Button>
      </div>
    </form>
  );
}

export default VehicleForm;
