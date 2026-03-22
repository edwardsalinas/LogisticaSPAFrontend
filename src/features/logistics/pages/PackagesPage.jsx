import { useEffect, useMemo, useState } from 'react';
import { Boxes, MapPinned, PackageCheck, Search, Truck } from 'lucide-react';
import api from '../../../services/api';
import Badge from '../../../components/atoms/Badge';
import Button from '../../../components/atoms/Button';
import SearchInput from '../../../components/atoms/SearchInput';
import Modal from '../../../components/molecules/Modal';
import DataTable from '../../../components/organisms/DataTable';
import Skeleton from '../../../components/atoms/Skeleton';
import { heroImages } from '../../../constants/heroImages';
import PackageDetail from '../components/PackageDetail';
import PackageForm from '../components/PackageForm';
import useRole from '../../../app/useRole';
import PackagesHero from '../components/PackagesHero';

const statusMap = {
  pendiente: { label: 'Pendiente', variant: 'warning' },
  asignado: { label: 'Asignado', variant: 'info' },
  en_transito: { label: 'En transito', variant: 'info' },
  entregado: { label: 'Entregado', variant: 'success' },
};

function PackagesPage() {
  const { hasRole } = useRole();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredPackages = useMemo(() => {
    if (!searchTerm) return packages;
    const term = searchTerm.toLowerCase();
    return packages.filter((pkg) =>
      [pkg.tracking_code, pkg.origen, pkg.destino, pkg.status].some((value) => String(value || '').toLowerCase().includes(term))
    );
  }, [packages, searchTerm]);

  const columns = [
    {
      key: 'tracking_code',
      label: 'Paquete',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700"><Boxes size={18} strokeWidth={2.2} /></div>
          <div>
            <p className="font-semibold text-surface-900">{val}</p>
            <p className="text-xs text-surface-500">{row.description || 'Sin descripcion'}</p>
          </div>
        </div>
      ),
    },
    { key: 'origen', label: 'Origen' },
    { key: 'destino', label: 'Destino' },
    { key: 'peso', label: 'Peso', render: (val) => `${val} kg` },
    {
      key: 'status',
      label: 'Estado',
      render: (val) => {
        const s = statusMap[val] || { label: val, variant: 'neutral' };
        return <Badge variant={s.variant} dot>{s.label}</Badge>;
      },
    },
  ];

  const totalPackages = packages.length;
  const delivered = packages.filter((p) => p.status === 'delivered').length;
  const inTransit = packages.filter((p) => p.status === 'in_transit' || p.status === 'assigned').length;
  const pending = packages.filter((p) => p.status === 'pending').length;

  return (
    <div className="space-y-8">
      {loading ? (
        <Skeleton className="h-[220px] w-full" />
      ) : (
        <PackagesHero totalPackages={totalPackages} deliveredCount={delivered} transitCount={inTransit} pendingCount={pending} />
      )}

      <section className="rounded-[1.8rem] border border-white/70 bg-white/88 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 border-b border-surface-100 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[0.64rem] uppercase tracking-[0.24em] text-surface-500">Centro de datos</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-surface-950">Listado de paquetes</h2>
          </div>
          <div className="flex flex-col gap-3 w-full sm:flex-row sm:w-auto sm:items-center">
            <div className="w-full sm:w-80"><SearchInput value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar codigo, origen, destino o estado..." /></div>
            <Button className="w-full sm:w-auto whitespace-nowrap" onClick={() => setShowForm(true)}>+ Registrar paquete</Button>
          </div>
        </div>
        <div className="px-6 pt-5"><p className="text-sm text-surface-500">Mostrando {filteredPackages.length} paquetes en la vista actual.</p></div>
        <DataTable columns={columns} data={filteredPackages} loading={loading} onRowClick={(row) => setSelectedPackage(row)} />
      </section>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Registrar nuevo paquete">
        <PackageForm onSuccess={handleCreateSuccess} onCancel={() => setShowForm(false)} />
      </Modal>

      <Modal isOpen={!!selectedPackage} onClose={() => setSelectedPackage(null)} title={`Paquete ${selectedPackage?.tracking_code || ''}`}>
        {selectedPackage && <PackageDetail pkg={selectedPackage} />}
      </Modal>
    </div>
  );
}

export default PackagesPage;

