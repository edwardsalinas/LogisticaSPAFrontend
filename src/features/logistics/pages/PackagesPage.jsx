import { useEffect, useMemo, useState } from 'react';
import { Boxes, MapPinned, PackageCheck, Search, Truck, Link } from 'lucide-react';
import api from '../../../services/api';
import Badge from '../../../components/atoms/Badge';
import Button from '../../../components/atoms/Button';
import SearchInput from '../../../components/atoms/SearchInput';
import Modal from '../../../components/molecules/Modal';
import DataTable from '../../../components/organisms/DataTable';
import Skeleton from '../../../components/atoms/Skeleton';
import PackageDetail from '../components/PackageDetail';
import PackageForm from '../components/PackageForm';
import ShipmentAssignmentForm from '../components/ShipmentAssignmentForm';
import useRole from '../../../app/useRole';
import PackagesHero from '../components/PackagesHero';
import Select from '../../../components/atoms/Select';

const statusMap = {
  pendiente: { label: 'Pendiente', variant: 'warning' },
  asignado: { label: 'Asignado', variant: 'info' },
  en_transito: { label: 'En tránsito', variant: 'info' },
  entregado: { label: 'Entregado', variant: 'success' },
};

function PackagesPage() {
  const { hasRole } = useRole();
  const [packages, setPackages] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignPackage, setAssignPackage] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [filterRouteId, setFilterRouteId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pkgRes, routeRes] = await Promise.all([
        api.get('/logistics/packages'),
        api.get('/logistics/routes')
      ]);
      setPackages(pkgRes.data || []);
      setRoutes(routeRes.data || []);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setPackages([]);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSuccess = () => {
    setShowForm(false);
    fetchData();
  };

  const handleAssignSuccess = () => {
    setShowAssignModal(false);
    setAssignPackage(null);
    fetchData();
  };

  const totalPackages = packages.length;
  const delivered = packages.filter((p) => p.status === 'entregado').length;
  const transitCount = packages.filter((p) => p.status === 'en_transito' || p.status === 'asignado').length;
  const pendingCount = packages.filter((p) => p.status === 'pendiente').length;

  const tabs = [
    { id: 'all', label: 'Operativo', count: pendingCount + transitCount },
    { id: 'loose', label: 'Carga Suelta', count: pendingCount },
    { id: 'shipments', label: 'Despachos Activos', count: routes.filter(r => r.status !== 'completada').length },
    { id: 'delivered', label: 'Histórico', count: delivered },
  ];

  const groupedData = useMemo(() => {
    let result = packages;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((pkg) =>
        [pkg.tracking_code, pkg.origen, pkg.destino].some((value) => String(value || '').toLowerCase().includes(term))
      );
    }

    if (filterRouteId) {
      result = result.filter(p => p.route_id === filterRouteId);
    }

    if (activeTab === 'delivered') {
      return { historical: result.filter(p => p.status === 'entregado') };
    }

    const loose = result.filter(p => !p.route_id && p.status !== 'entregado');
    const assigned = result.filter(p => p.route_id && p.status !== 'entregado');

    if (activeTab === 'loose') return { loose };

    const shipmentsMap = {};
    
    // Asegurar que se muestren todos los despachos activos (aunque estén vacíos)
    routes.filter(r => r.status !== 'completada').forEach(r => {
      shipmentsMap[r.id] = { route: r, packages: [] };
    });

    assigned.forEach(pkg => {
      if (!shipmentsMap[pkg.route_id]) {
        const route = routes.find(r => r.id === pkg.route_id);
        shipmentsMap[pkg.route_id] = {
          route: route || { id: pkg.route_id, origin: pkg.origen, destination: pkg.destino, status: 'unknown' },
          packages: []
        };
      }
      shipmentsMap[pkg.route_id].packages.push(pkg);
    });

    const shipments = Object.values(shipmentsMap);

    if (activeTab === 'shipments') return { shipments };

    // En modo 'Operativo', solo mostrar despachos que tengan carga para evitar ruido
    const activeShipments = shipments.filter(s => s.packages.length > 0);

    return {
      loose,
      shipments: activeShipments
    };
  }, [packages, routes, searchTerm, activeTab, filterRouteId]);

  const baseColumns = [
    {
      key: 'tracking_code',
      label: 'Paquete',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
            <Boxes size={18} strokeWidth={2.2} />
          </div>
          <div>
            <p className="font-semibold text-surface-900">{val}</p>
            <p className="text-xs text-surface-500 font-medium">{row.description || 'Sin descripción'}</p>
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

  const columnsLoose = useMemo(() => [
    ...baseColumns,
    {
      key: 'actions',
      label: 'Acción',
      render: (_, row) => (
        <Button 
          variant="secondary" 
          size="sm" 
          className="flex items-center gap-1 bg-primary-50 text-primary-600 hover:bg-primary-100 border-primary-100"
          onClick={(e) => {
            e.stopPropagation();
            setAssignPackage(row);
            setShowAssignModal(true);
          }}
        >
          <Link size={14} />
          Asignar
        </Button>
      )
    }
  ], [baseColumns]);

  const routeOptions = useMemo(() => [
    { value: '', label: 'Todos los despachos' },
    ...routes.filter(r => r.status !== 'completada').map(r => {
      const date = r.departure_time ? new Date(r.departure_time).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit' }) : '';
      const driver = r.driver?.full_name ? ` - ${r.driver.full_name}` : '';
      return { 
        value: r.id, 
        label: `${r.origin} → ${r.destination} (${date})${driver}`
      };
    })
  ], [routes]);

  return (
    <div className="space-y-8 pb-12">
      {loading ? (
        <Skeleton className="h-[220px] w-full" />
      ) : (
        <PackagesHero totalPackages={totalPackages} deliveredCount={delivered} transitCount={transitCount} pendingCount={pendingCount} />
      )}

      <section className="rounded-[1.8rem] border border-white/70 bg-white/88 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 border-b border-surface-100 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[0.64rem] uppercase tracking-[0.24em] text-surface-500 font-bold">Gestión de Carga</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-surface-950 text-balance">Panel de Operaciones</h2>
          </div>
          <div className="flex flex-col gap-3 w-full sm:flex-row sm:w-auto sm:items-center">
            <div className="w-full sm:w-64">
              <Select 
                options={routeOptions} 
                value={filterRouteId} 
                onChange={(e) => { 
                  setFilterRouteId(e.target.value); 
                  if (e.target.value) setActiveTab('shipments'); 
                }}
                placeholder="Seleccionar Despacho"
              />
            </div>
            <div className="w-full sm:w-80"><SearchInput value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar código, ciudad o remesa..." /></div>
            {hasRole(['admin', 'logistics_operator']) && (
              <Button className="w-full sm:w-auto whitespace-nowrap" onClick={() => setShowForm(true)}>+ Registrar paquete</Button>
            )}
          </div>
        </div>

        <div className="flex border-b border-surface-100 bg-surface-50/30 px-6 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setFilterRouteId(''); }}
              className={`relative flex items-center gap-2 py-5 px-4 text-sm font-semibold transition-all ${
                activeTab === tab.id ? 'text-primary-600' : 'text-surface-500 hover:text-surface-700'
              }`}
            >
              <span className="whitespace-nowrap">{tab.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-[0.65rem] ${
                activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-surface-200 text-surface-600'
              }`}>
                {tab.count}
              </span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
              )}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-10">
          {(activeTab === 'all' || activeTab === 'loose') && groupedData.loose?.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <div className="h-2 w-2 rounded-full bg-warning-500 animate-pulse" />
                <h3 className="font-semibold text-surface-900 font-display">Carga Suelta (Pendiente de Asignación)</h3>
                <Badge variant="warning">{groupedData.loose.length}</Badge>
              </div>
              <DataTable columns={columnsLoose} data={groupedData.loose} loading={loading} onRowClick={(row) => setSelectedPackage(row)} />
            </div>
          )}

          {(activeTab === 'all' || activeTab === 'shipments') && groupedData.shipments?.length > 0 && groupedData.shipments.map(ship => (
            <div key={ship.route.id} className="space-y-4 rounded-3xl border border-surface-100 bg-surface-50/40 p-5 shadow-sm hover:border-primary-100 transition-colors">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm text-primary-600 border border-surface-100">
                    <Truck size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-surface-950 text-xl tracking-tight font-display">
                      {ship.route.origin} → {ship.route.destination}
                    </h3>
                    <p className="text-sm text-surface-500 flex items-center gap-2 mt-1">
                      <span className="font-mono text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-lg text-xs font-bold ring-1 ring-primary-100 italic">
                        {ship.route.route_code || ship.route.id.substring(0, 8)}
                      </span>
                      <span className="text-surface-300">•</span>
                      <span className="font-medium">{ship.route.driver?.full_name || 'Sin chofer asignado'}</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={ship.route.status === 'en_transito' ? 'info' : 'neutral'}>
                    {ship.route.status === 'en_transito' ? 'En Tránsito' : 'Planeado'}
                  </Badge>
                  <p className="text-[0.65rem] text-surface-400 font-medium uppercase tracking-wider">
                    {ship.packages.length} paquete{ship.packages.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <DataTable columns={baseColumns} data={ship.packages} loading={loading} onRowClick={(row) => setSelectedPackage(row)} />
            </div>
          ))}

          {activeTab === 'delivered' && groupedData.historical && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <div className="h-2 w-2 rounded-full bg-success-500" />
                <h3 className="font-semibold text-surface-900 font-display">Archivo de Entregas</h3>
              </div>
              <DataTable columns={baseColumns} data={groupedData.historical} loading={loading} onRowClick={(row) => setSelectedPackage(row)} emptyMessage="No hay historial de entregas." />
            </div>
          )}

          {Object.keys(groupedData).every(k => !groupedData[k] || groupedData[k].length === 0) && (
            <div className="py-24 text-center">
              <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-surface-50 text-surface-200 mb-6">
                <Boxes size={48} />
              </div>
              <h3 className="text-xl font-semibold text-surface-950 italic">Área de carga vacía</h3>
              <p className="text-surface-500 mt-2 max-w-xs mx-auto">No se encontraron paquetes para este filtro. Intenta con otros criterios.</p>
            </div>
          )}
        </div>
      </section>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Registrar nuevo paquete">
        <PackageForm onSuccess={handleCreateSuccess} onCancel={() => setShowForm(false)} />
      </Modal>

      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Asignar Paquete a Despacho">
        {assignPackage && (
            <ShipmentAssignmentForm 
                pkg={assignPackage} 
                onSuccess={handleAssignSuccess} 
                onCancel={() => setShowAssignModal(false)} 
            />
        )}
      </Modal>

      <Modal isOpen={!!selectedPackage} onClose={() => setSelectedPackage(null)} title={`Paquete ${selectedPackage?.tracking_code || ''}`}>
        {selectedPackage && <PackageDetail pkg={selectedPackage} />}
      </Modal>
    </div>
  );
}

export default PackagesPage;
