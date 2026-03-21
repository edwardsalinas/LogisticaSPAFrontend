import { useEffect, useMemo, useState } from 'react';
import { Boxes, MapPinned, PackageCheck, Search, Truck } from 'lucide-react';
import api from '../../../services/api';
import Badge from '../../../components/atoms/Badge';
import Button from '../../../components/atoms/Button';
import SearchInput from '../../../components/atoms/SearchInput';
import Modal from '../../../components/molecules/Modal';
import DataTable from '../../../components/organisms/DataTable';
import PageSkeleton from '../../../components/organisms/PageSkeleton';
import { heroImages } from '../../../constants/heroImages';
import PackageDetail from '../components/PackageDetail';
import PackageForm from '../components/PackageForm';
import useRole from '../../../app/useRole';

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

  if (loading) return <PageSkeleton stats={4} layout="table" />;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,#06111f_0%,#0b1d34_35%,#f8fbff_100%)] p-7 shadow-[0_28px_80px_-48px_rgba(2,36,72,0.7)] sm:p-8">
        <div className="absolute inset-0">
          <img src={heroImages.packages.url} alt={heroImages.packages.alt} className="h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(6,17,31,0.94)_0%,rgba(11,29,52,0.84)_38%,rgba(11,29,52,0.34)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_34%)]" />
        </div>
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.95fr)] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-sky-100/85 backdrop-blur"><PackageCheck size={14} strokeWidth={2.2} />Gestion de paquetes</div>
            <h1 className="mt-5 max-w-3xl font-display text-[clamp(2.1rem,5vw,4rem)] font-semibold tracking-[-0.06em] text-white">Inventario de paquetes con lectura clara de flujo, estado y trazabilidad.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Concentramos registro, consulta y detalle operativo en una sola vista para que el equipo encuentre rapido lo que necesita.</p>
          </div>
          <div className="flex flex-col gap-3 lg:gap-4">
            <div className="rounded-[1.7rem] border border-white/10 bg-white/6 p-3 backdrop-blur-xl">
              <div className="grid grid-cols-4 gap-2.5">
                <div className="rounded-[1.35rem] border border-white/10 bg-white/8 p-4 text-white">
                  <Boxes size={18} className="text-sky-300" strokeWidth={2.2} />
                  <p className="mt-2 text-[0.6rem] uppercase tracking-[0.18em] text-slate-300">Total paquetes</p>
                  <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em]">{totalPackages}</p>
                </div>
                <div className="rounded-[1.35rem] border border-white/10 bg-white/8 p-4 text-white">
                  <PackageCheck size={18} className="text-emerald-300" strokeWidth={2.2} />
                  <p className="mt-2 text-[0.6rem] uppercase tracking-[0.18em] text-slate-300">Entregados</p>
                  <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em]">{delivered}</p>
                </div>
                <div className="rounded-[1.35rem] border border-white/10 bg-white/8 p-4 text-white">
                  <Truck size={18} className="text-amber-300" strokeWidth={2.2} />
                  <p className="mt-2 text-[0.6rem] uppercase tracking-[0.18em] text-slate-300">En transito</p>
                  <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em]">{inTransit}</p>
                </div>
                <div className="rounded-[1.35rem] border border-white/10 bg-white/8 p-4 text-white">
                  <MapPinned size={18} className="text-violet-300" strokeWidth={2.2} />
                  <p className="mt-2 text-[0.6rem] uppercase tracking-[0.18em] text-slate-300">Pendientes</p>
                  <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em]">{pending}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-white/70 bg-white/88 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 border-b border-surface-100 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[0.64rem] uppercase tracking-[0.24em] text-surface-500">Centro de datos</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-surface-950">Listado de paquetes</h2>
          </div>
          <div className="w-full lg:w-80"><SearchInput value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar codigo, origen, destino o estado..." /></div>
        </div>
        <div className="px-6 pt-5"><p className="text-sm text-surface-500">Mostrando {filteredPackages.length} paquetes en la vista actual.</p></div>
        <DataTable columns={columns} data={filteredPackages} onRowClick={(row) => setSelectedPackage(row)} />
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

