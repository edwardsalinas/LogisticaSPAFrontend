import { useState } from 'react';
import Input from '../../../components/atoms/Input';
import Button from '../../../components/atoms/Button';
import api from '../../../services/api';

function PackageForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState({
    origen: '',
    destino: '',
    peso: '',
    description: '',
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
      await api.post('/logistics/packages', {
        ...form,
        peso: parseFloat(form.peso),
      });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Error al registrar paquete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Origen"
        name="origen"
        value={form.origen}
        onChange={handleChange}
        placeholder="Ciudad de origen"
        required
      />
      <Input
        label="Destino"
        name="destino"
        value={form.destino}
        onChange={handleChange}
        placeholder="Ciudad de destino"
        required
      />
      <Input
        label="Peso (kg)"
        name="peso"
        type="number"
        value={form.peso}
        onChange={handleChange}
        placeholder="Ej: 15"
        required
      />
      <Input
        label="Descripción"
        name="description"
        value={form.description}
        onChange={handleChange}
        placeholder="Descripción del contenido"
      />

      {error && <p className="text-danger text-sm">{error}</p>}

      <div className="flex justify-end gap-3 mt-2">
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Registrando...' : 'Registrar Paquete'}
        </Button>
      </div>
    </form>
  );
}

export default PackageForm;
