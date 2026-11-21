import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Button from '../../../components/atoms/Button';
import Select from '../../../components/atoms/Select';
import Spinner from '../../../components/atoms/Spinner';
import apiService from '../../../services/apiService';
import { PACKAGE_STATUS, normalizePackageStatus } from '../../../constants/status';

const assignmentSchema = z.object({
  packageId: z.string().min(1, 'Por favor selecciona un paquete'),
});

function PackageAssignmentForm({ routeId, onSuccess, onCancel }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(assignmentSchema), defaultValues: { packageId: '' } });
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await apiService.getPackages();
        // Solo los paquetes pendientes (estado «pendiente») o sin ruta asignada
        const pending = (res.data || []).filter(
          (p) => normalizePackageStatus(p.status) === PACKAGE_STATUS.PENDING || !p.route_id
        );
        setPackages(pending);
      } catch (err) {
        console.error('Error cargando paquetes pendientes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPending();
  }, []);

  const onSubmit = async ({ packageId }) => {
    setSubmitting(true);
    setError(null);

    try {
      await apiService.assignPackageToRoute(routeId, packageId);
      onSuccess();
    } catch (err) {
      console.error('Error asignando paquete:', err);
      setError(err.message || 'Error al asignar el paquete');
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
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {error && (
        <div role="alert" className="p-3 bg-red-50 text-red-600 text-sm rounded-md">
          {error}
        </div>
      )}

      <Select
        label="Paquetes Pendientes"
        required
        options={packages.map((p) => ({
          value: p.id,
          label: `${p.tracking_code} (${p.origen} → ${p.destino}) - ${p.peso}kg`,
        }))}
        placeholder="Selecciona un paquete..."
        error={errors.packageId?.message}
        {...register('packageId')}
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
