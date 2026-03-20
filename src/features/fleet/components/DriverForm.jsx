import { useState } from 'react';
import Input from '../../../components/atoms/Input';
import Button from '../../../components/atoms/Button';

/**
 * DriverForm - Formulario para crear/editar conductor
 * @param {Object} driver - Datos del conductor a editar (opcional)
 * @param {function} onSuccess - Callback al completar
 * @param {function} onCancel - Callback al cancelar
 */
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
      console.log('Conductor guardado:', form);
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
    { value: 'C', label: 'Tipo C - Carga Pesada' },
    { value: 'D', label: 'Tipo D - Transporte Público' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Activo' },
    { value: 'vacation', label: 'De Vacaciones' },
    { value: 'inactive', label: 'Inactivo' },
  ];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Nombre Completo"
        name="full_name"
        value={form.full_name}
        onChange={handleChange}
        placeholder="Juan Pérez"
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="juan@empresa.com"
          required
        />
        <Input
          label="Teléfono"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          placeholder="+591 70012345"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Número de Licencia"
          name="license_number"
          value={form.license_number}
          onChange={handleChange}
          placeholder="LIC-123456"
          required
        />
        <Select
          label="Tipo de Licencia"
          name="license_type"
          value={form.license_type}
          onChange={handleChange}
          required
          options={licenseTypes}
        />
      </div>

      <Select
        label="Estado"
        name="status"
        value={form.status}
        onChange={handleChange}
        required
        options={statusOptions}
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
          {loading ? 'Guardando...' : driver ? 'Actualizar Conductor' : 'Registrar Conductor'}
        </Button>
      </div>
    </form>
  );
}

export default DriverForm;
