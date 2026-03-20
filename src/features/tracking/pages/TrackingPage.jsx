import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, PackageSearch, Route, Search, TimerReset } from 'lucide-react';
import Badge from '../../../components/atoms/Badge';
import Button from '../../../components/atoms/Button';
import SearchInput from '../../../components/atoms/SearchInput';
import EmptyState from '../../../components/molecules/EmptyState';
import Modal from '../../../components/molecules/Modal';
import StatCard from '../../../components/molecules/StatCard';
import PageSkeleton from '../../../components/organisms/PageSkeleton';
import { heroImages } from '../../../constants/heroImages';
import apiService from '../../../services/apiService';
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
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,#06111f_0%,#0b1d34_35%,#f8fbff_100%)] p-7 shadow-[0_28px_80px_-48px_rgba(2,36,72,0.7)] sm:p-8">
        <div className="absolute inset-0">
          <img src={heroImages.tracking.url} alt={heroImages.tracking.alt} className="h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(6,17,31,0.94)_0%,rgba(11,29,52,0.84)_38%,rgba(11,29,52,0.34)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_34%)]" />
        </div>
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.95fr)] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-sky-100/85 backdrop-blur"><PackageSearch size={14} strokeWidth={2.2} />Trazabilidad</div>
            <h1 className="mt-5 max-w-3xl font-display text-[clamp(2.1rem,5vw,4rem)] font-semibold tracking-[-0.06em] text-white">Seguimiento operativo con historial, estado y acceso rapido al mapa.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">La vista combina seleccion de paquete, registro de eventos y lectura de la secuencia historica sin salir del flujo principal.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            {selectedPackageId && <Button variant="secondary" className="border-white/14 bg-white/8 text-white hover:bg-white/14" onClick={() => navigate(`/tracking/${selectedPackageId}/map`)}><Map size={16} strokeWidth={2.2} />Ver en mapa</Button>}
            <Button size="lg" onClick={() => setShowForm(true)}>+ Registrar evento</Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        <StatCard label="Paquetes visibles" value={filteredPackages.length} icon={Search} change={4.8} changeLabel="vs ayer" caption="Resultados en el contexto actual de consulta." tone="blue" />
        <StatCard label="En seguimiento" value={active} icon={Route} change={2.9} changeLabel="vs ayer" caption="Paquetes con movimiento o asignacion activa." tone="emerald" />
        <StatCard label="Pendientes" value={pending} icon={TimerReset} change={-3.1} changeLabel="vs ayer" caption="Items sin avance de despacho aun." tone="amber" />
        <StatCard label="Entregados" value={delivered} icon={PackageSearch} change={6.2} changeLabel="vs ayer" caption="Paquetes cerrados con confirmacion final." tone="violet" />
      </section>

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
