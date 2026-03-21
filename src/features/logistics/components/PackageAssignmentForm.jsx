import { useState, useEffect } from 'react';
import Button from '../../../components/atoms/Button';
import Select from '../../../components/atoms/Select';
import Spinner from '../../../components/atoms/Spinner';
import apiService from '../../../services/apiService';

function PackageAssignmentForm({ routeId, onSuccess, onCancel }) {
  const [packages, setPackages] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await apiService.getPackages();
        // Filtrar solo los que están en estado 'pending' (sin ruta)
        const pending = (res.data || []).filter(p => p.status === 'pending' || !p.route_id);
        setPackages(pending);
      } catch (err) {
        console.error('Error cargando paquetes pendientes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPending();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPackageId) {
      setError('Por favor selecciona un paquete');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiService.assignPackageToRoute(routeId, selectedPackageId);
      onSuccess();
    } catch (err) {
      console.error('Error asignando paquete:', err);
      setError(err.response?.data?.message || 'Error al asignar el paquete');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner size="sm" />;

  if (packages.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-surface-500 mb-4">No hay paquetes pendientes de asignación.</p>
        <Button variant="secondary" onClick={onCancel}>Cerrar</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md">
          {error}
        </div>
      )}

      <Select
        label="Paquetes Pendientes"
        value={selectedPackageId}
        onChange={(e) => setSelectedPackageId(e.target.value)}
        required
        options={packages.map(p => ({
          value: p.id,
          label: `${p.tracking_code} (${p.origen} → ${p.destino}) - ${p.peso}kg`
        }))}
        placeholder="Selecciona un paquete..."
      />

      <div className="flex justify-end gap-3 mt-4">
        <Button variant="secondary" onClick={onCancel} type="button">
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Asignando...' : 'Asignar a Ruta'}
        </Button>
      </div>
    </form>
  );
}

export default PackageAssignmentForm;
