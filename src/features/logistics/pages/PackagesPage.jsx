import { useState, useEffect } from 'react';
import Button from '../../../components/atoms/Button';
import Badge from '../../../components/atoms/Badge';
import Spinner from '../../../components/atoms/Spinner';
import DataTable from '../../../components/organisms/DataTable';
import StatCard from '../../../components/molecules/StatCard';
import Modal from '../../../components/molecules/Modal';
import PackageForm from '../components/PackageForm';
import PackageDetail from '../components/PackageDetail';
import api from '../../../services/api';

const statusMap = {
  pending: { label: 'Pendiente', variant: 'warning' },
  assigned: { label: 'Asignado', variant: 'info' },
  in_transit: { label: 'En Tránsito', variant: 'info' },
  delivered: { label: 'Entregado', variant: 'success' },
};

function PackagesPage() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await api.get('/logistics/packages');
      setPackages(res.data || []);
    } catch (err) {
      console.error('Error cargando paquetes:', err);
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleCreateSuccess = () => {
    setShowForm(false);
    fetchPackages();
  };

  const columns = [
    { key: 'tracking_code', label: 'Código' },
    { key: 'origen', label: 'Origen' },
    { key: 'destino', label: 'Destino' },
    { key: 'peso', label: 'Peso', render: (val) => `${val} kg` },
    {
      key: 'status',
      label: 'Estado',
      render: (val) => {
        const s = statusMap[val] || { label: val, variant: 'neutral' };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
  ];

  const totalPackages = packages.length;
  const delivered = packages.filter((p) => p.status === 'delivered').length;
  const inTransit = packages.filter((p) => p.status === 'in_transit' || p.status === 'assigned').length;
  const pending = packages.filter((p) => p.status === 'pending').length;

  if (loading) return <Spinner size="lg" />;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Total Paquetes" value={totalPackages} />
        <StatCard label="Entregados" value={delivered} />
        <StatCard label="En Tránsito" value={inTransit} />
        <StatCard label="Pendientes" value={pending} />
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex items-center justify-between p-6 border-b border-surface-200">
          <div>
            <h2 className="text-lg font-semibold text-surface-800">Listado de Paquetes</h2>
            <p className="text-sm text-surface-400 mt-1">Mostrando {totalPackages} paquetes</p>
          </div>
          <Button onClick={() => setShowForm(true)}>+ Nuevo Paquete</Button>
        </div>

        <DataTable
          columns={columns}
          data={packages}
          onRowClick={(row) => setSelectedPackage(row)}
        />
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Registrar Nuevo Paquete"
      >
        <PackageForm onSuccess={handleCreateSuccess} onCancel={() => setShowForm(false)} />
      </Modal>

      <Modal
        isOpen={!!selectedPackage}
        onClose={() => setSelectedPackage(null)}
        title={`Paquete ${selectedPackage?.tracking_code || ''}`}
      >
        {selectedPackage && <PackageDetail pkg={selectedPackage} />}
      </Modal>
    </div>
  );
}

export default PackagesPage;
