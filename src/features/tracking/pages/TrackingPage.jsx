import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, PackageSearch, Route, Search, TimerReset } from 'lucide-react';
import Badge from '../../../components/atoms/Badge';
import Button from '../../../components/atoms/Button';
import SearchInput from '../../../components/atoms/SearchInput';
import EmptyState from '../../../components/molecules/EmptyState';
import Modal from '../../../components/molecules/Modal';

import PageSkeleton from '../../../components/organisms/PageSkeleton';
import { heroImages } from '../../../constants/heroImages';
import apiService from '../../../services/apiService';
import TrackingHero from '../components/TrackingHero';
import TrackingForm from '../components/TrackingForm';
import TrackingHistory from '../components/TrackingHistory';

const statusMap = {
  pending: { label: 'Pendiente', variant: 'warning' },
  assigned: { label: 'Asignado', variant: 'info' },
  in_transit: { label: 'En transito', variant: 'info' },
  delivered: { label: 'Entregado', variant: 'success' },
};

function TrackingPage() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await apiService.getPackages();
      const nextPackages = res.data || [];
      setPackages(nextPackages);
      if (!selectedPackageId && nextPackages[0]?.id) setSelectedPackageId(nextPackages[0].id);
    } catch (err) {
      console.error('Error cargando paquetes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleRegisterSuccess = async () => {
    setShowForm(false);
    await fetchPackages();
  };

  const filteredPackages = useMemo(() => {
    if (!searchTerm) return packages;
    const term = searchTerm.toLowerCase();
    return packages.filter((pkg) => [pkg.tracking_code, pkg.origen, pkg.destino, pkg.status].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [packages, searchTerm]);

  const selectedPackage = packages.find((pkg) => pkg.id === selectedPackageId);
  const delivered = packages.filter((pkg) => pkg.status === 'delivered').length;
  const active = packages.filter((pkg) => pkg.status === 'in_transit' || pkg.status === 'assigned').length;
  const pending = packages.filter((pkg) => pkg.status === 'pending').length;

  if (loading) return <PageSkeleton stats={4} layout="split" />;

  return (
    <div className="space-y-8">
      <TrackingHero visibleCount={filteredPackages.length} activeCount={active} pendingCount={pending} deliveredCount={delivered} />

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(19rem,0.86fr)_minmax(0,1.14fr)]">
        <div className="rounded-[1.8rem] border border-white/70 bg-white/88 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
          <div className="border-b border-surface-100 p-6">
            <p className="text-[0.64rem] uppercase tracking-[0.24em] text-surface-500">Busqueda operativa</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-surface-950">Paquetes</h2>
            <div className="mt-5"><SearchInput value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar codigo, origen, destino o estado..." /></div>
          </div>
          <div className="max-h-[42rem] space-y-3 overflow-y-auto p-4">
            {filteredPackages.map((pkg) => {
              const status = statusMap[pkg.status] || { label: pkg.status, variant: 'neutral' };
              const isSelected = selectedPackageId === pkg.id;
              return (
                <button key={pkg.id} onClick={() => setSelectedPackageId(pkg.id)} className={`w-full rounded-[1.3rem] border p-4 text-left transition-all ${isSelected ? 'border-primary-200 bg-primary-50 shadow-[0_18px_40px_-34px_rgba(11,78,162,0.35)]' : 'border-surface-100 bg-white hover:border-surface-200 hover:bg-surface-50'}`}>
                  <div className="mb-3 flex items-center justify-between gap-2"><p className="text-sm font-semibold text-surface-900">{pkg.tracking_code}</p><Badge variant={status.variant} dot>{status.label}</Badge></div>
                  <p className="text-sm text-surface-700">{pkg.origen} {' -> '} {pkg.destino}</p>
                  <p className="mt-2 text-xs text-surface-500">Peso: {pkg.peso} kg</p>
                </button>
              );
            })}
            {filteredPackages.length === 0 && (
              <EmptyState
                eyebrow="Sin coincidencias"
                title="No encontramos paquetes con ese criterio"
                description="Prueba ajustando codigo, origen, destino o estado para volver a poblar la vista."
                className="min-h-[14rem] border-surface-100 bg-surface-50/70"
              />
            )}
          </div>
        </div>

        <div>
          {selectedPackage ? (
            <TrackingHistory packageId={selectedPackage.id} />
          ) : (
            <EmptyState
              eyebrow="Sin paquete activo"
              title="Selecciona un paquete para revisar su historial"
              description="Cuando elijas un registro de la lista, aqui mostraremos eventos, checkpoints y cambios de estado en una sola vista."
              className="min-h-[24rem] border-surface-100 bg-white/88 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl"
            />
          )}
        </div>
      </section>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Registrar evento de seguimiento">
        <TrackingForm packages={packages} onSuccess={handleRegisterSuccess} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}

export default TrackingPage;
