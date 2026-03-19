import { useState, useEffect } from 'react';
import Button from '../../../components/atoms/Button';
import Badge from '../../../components/atoms/Badge';
import Spinner from '../../../components/atoms/Spinner';
import DataTable from '../../../components/organisms/DataTable';
import StatCard from '../../../components/molecules/StatCard';
import Modal from '../../../components/molecules/Modal';
import RouteForm from '../components/RouteForm';
import api from '../../../services/api';

const statusMap = {
  active: { label: 'Activa', variant: 'success' },
  pending: { label: 'Pendiente', variant: 'warning' },
  completed: { label: 'Completada', variant: 'neutral' },
};

function RoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/logistics/routes');
      setRoutes(res.data || []);
    } catch (err) {
      console.error('Error cargando rutas:', err);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleCreateSuccess = () => {
    setShowForm(false);
    fetchRoutes();
  };

  const columns = [
    { key: 'id', label: 'ID', render: (val) => val?.substring(0, 8) + '...' },
    { key: 'origin', label: 'Origen' },
    { key: 'destination', label: 'Destino' },
    {
      key: 'driver_id',
      label: 'Conductor',
      render: (val) => val ? '✅ Asignado' : '—',
    },
    {
      key: 'vehicle_id',
      label: 'Vehículo',
      render: (val) => val ? '✅ Asignado' : '—',
    },
    {
      key: 'status',
      label: 'Estado',
      render: (val) => {
        const s = statusMap[val] || { label: val || 'Pendiente', variant: 'neutral' };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
  ];

  const totalRoutes = routes.length;
  const active = routes.filter((r) => r.status === 'active').length;
  const completed = routes.filter((r) => r.status === 'completed').length;

  if (loading) return <Spinner size="lg" />;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard label="Total Rutas" value={totalRoutes} />
        <StatCard label="Rutas Activas" value={active} />
        <StatCard label="Completadas" value={completed} />
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex items-center justify-between p-6 border-b border-surface-200">
          <div>
            <h2 className="text-lg font-semibold text-surface-800">Rutas de Transporte</h2>
            <p className="text-sm text-surface-400 mt-1">Mostrando {totalRoutes} rutas registradas</p>
          </div>
          <Button onClick={() => setShowForm(true)}>+ Nueva Ruta</Button>
        </div>

        <DataTable columns={columns} data={routes} />
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Crear Ruta de Transporte"
      >
        <RouteForm onSuccess={handleCreateSuccess} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}

export default RoutesPage;
