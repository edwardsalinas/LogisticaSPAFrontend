import React, { useEffect, useMemo, useState } from 'react';
import { Boxes, MapPinned, PackageCheck, PackageSearch, Search, Truck, Link, PackagePlus, ChevronRight, ChevronDown, Package, Clock } from 'lucide-react';
import api from '../../../services/api';
import Badge from '../../../components/atoms/Badge';
import Button from '../../../components/atoms/Button';
import Modal from '../../../components/molecules/Modal';
import DataTable from '../../../components/organisms/DataTable';
import Skeleton from '../../../components/atoms/Skeleton';
import PackageDetail from '../components/PackageDetail';
import PackageForm from '../components/PackageForm';
import ShipmentAssignmentForm from '../components/ShipmentAssignmentForm';
import useRole from '../../../app/useRole';
import PackagesHero from '../components/PackagesHero';

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
  const [activeTab, setActiveTab] = useState('all'); // Handles 'all' vs 'delivered' (Historical)
  const [contextualRoute, setContextualRoute] = useState(null);
  const [expandedShipments, setExpandedShipments] = useState(new Set());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const resetToToday = () => setSelectedDate(new Date());
  
  const stepDate = (days) => {
    setSelectedDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return next;
    });
  };

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
  }, [selectedDate]);

  const handleCreateSuccess = () => {
    setShowForm(false);
    setContextualRoute(null);
    fetchData();
  };

  const handleAssignSuccess = () => {
    setShowAssignModal(false);
    setAssignPackage(null);
    fetchData();
  };

  const handleOpenContextualForm = (route) => {
    setContextualRoute(route);
    setShowForm(true);
  };

  const toggleExpansion = (id) => {
    setExpandedShipments(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalPackages = packages.length;
  const delivered = packages.filter((p) => p.status === 'entregado').length;
  const transitCount = packages.filter((p) => p.status === 'en_transito' || p.status === 'asignado').length;
  const pendingCount = packages.filter((p) => p.status === 'pendiente').length;

  const groupedData = useMemo(() => {
    let result = packages;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((pkg) =>
        [pkg.tracking_code, pkg.origen, pkg.destino].some((value) => String(value || '').toLowerCase().includes(term))
      );
    }

    if (activeTab === 'delivered') {
      return { historical: result.filter(p => p.status === 'entregado') };
    }

    const loose = result.filter(p => !p.route_id && p.status !== 'entregado');
    const assigned = result.filter(p => p.route_id && p.status !== 'entregado');

    const shipmentsMap = {};
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    routes.filter(r => {
      if (r.status === 'completada') return false;
      if (!r.departure_time) return true; // Si no tiene fecha, mostrar siempre? O filtrar?
      const d = new Date(r.departure_time);
      return d >= dayStart && d <= dayEnd;
    }).forEach(r => {
      shipmentsMap[r.id] = { route: r, packages: [] };
    });

    assigned.forEach(pkg => {
      if (shipmentsMap[pkg.route_id]) {
        shipmentsMap[pkg.route_id].packages.push(pkg);
      }
    });

    return {
      loose,
      shipments: Object.values(shipmentsMap)
    };
  }, [packages, routes, searchTerm, activeTab]);

  const baseColumns = [
    {
      key: 'tracking_code',
      label: 'Paquete',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700 font-mono text-[10px] font-bold ring-1 ring-primary-100">
            {val.substring(0, 4)}
          </div>
          <div>
            <p className="font-bold text-surface-900 text-sm">{val}</p>
            <p className="text-[10px] text-surface-400 font-medium truncate max-w-[150px]">{row.description || 'Sin descripción'}</p>
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
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {loading ? (
        <Skeleton className="h-[180px] w-full" />
      ) : (
        <PackagesHero totalPackages={totalPackages} deliveredCount={delivered} transitCount={transitCount} pendingCount={pendingCount} />
      )}

      <section className="flex flex-col xl:flex-row gap-8 items-start">
        {/* LEFT: UNIFIED SHIPMENT BOARD (70%) */}
        <div className="flex-1 w-full space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-xl shadow-primary-500/20">
                <Truck size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="font-display text-2xl font-black text-surface-950 tracking-tight">Panel de Despachos</h2>
                <p className="text-xs text-surface-500 font-medium">Gestiona carga asignada y rutas en tránsito</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
               {/* SMART DATE STEPPER */}
               <div className="flex items-center bg-white border border-surface-200 rounded-2xl p-1 shadow-sm mr-2 ring-1 ring-surface-100">
                  <button onClick={() => stepDate(-1)} className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-surface-50 text-surface-400 hover:text-primary-600 transition-all">
                     <ChevronRight size={18} className="rotate-180" />
                  </button>
                  
                  <div className="px-4 py-1 flex flex-col items-center min-w-[140px]">
                     <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-surface-950">
                           {selectedDate.toLocaleDateString('es-BO', { day: '2-digit', month: 'long' })}
                        </span>
                        {selectedDate.toDateString() === new Date().toDateString() && (
                           <Badge variant="info" className="py-0 px-1.5 h-4 !text-[8px]">HOY</Badge>
                        )}
                     </div>
                     {/* Replace static text with "Volver a hoy" button only when NOT on today */}
                     {selectedDate.toDateString() !== new Date().toDateString() ? (
                        <button 
                          onClick={resetToToday} 
                          className="text-[9px] font-black text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md hover:bg-primary-100 transition-all uppercase tracking-tighter"
                        >
                           Volver a hoy
                        </button>
                     ) : (
                        <span className="text-[9px] font-black text-surface-300 uppercase tracking-tighter -mt-0.5">Vista Operativa</span>
                     )}
                  </div>

                  <button onClick={() => stepDate(1)} className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-surface-50 text-surface-400 hover:text-primary-600 transition-all">
                     <ChevronRight size={18} />
                  </button>
                  
                  <div className="h-6 w-px bg-surface-100 mx-1" />
                  
                  <label className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-surface-50 text-surface-400 cursor-pointer relative">
                     <Clock size={16} />
                     <input 
                        type="date" 
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => setSelectedDate(new Date(e.target.value + 'T00:00:00'))}
                     />
                  </label>
               </div>

              <div className="relative group">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Buscar viaje o ruta..." 
                  className="pl-9 pr-4 py-2 bg-white border border-surface-200 rounded-xl text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none w-44 lg:w-48"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="secondary" size="md" onClick={() => setActiveTab(activeTab === 'delivered' ? 'all' : 'delivered')} className="h-10 px-5 rounded-xl font-bold gap-2">
                {activeTab === 'delivered' ? <PackageCheck size={18}/> : <PackageSearch size={18}/>}
                {activeTab === 'delivered' ? 'Operativos' : 'Histórico'}
              </Button>
            </div>
          </div>

          {activeTab === 'delivered' ? (
             <div className="rounded-[2rem] border border-surface-100 bg-white p-6 shadow-sm">
                <DataTable 
                  columns={baseColumns} 
                  data={groupedData.historical || []} 
                  loading={loading} 
                  onRowClick={(row) => setSelectedPackage(row)} 
                  emptyMessage="No hay historial de entregas." 
                />
             </div>
          ) : (
            <div className="rounded-[2.2rem] border border-surface-100 bg-white shadow-xl shadow-surface-200/20 overflow-hidden">
               <table className="w-full border-collapse">
                 <thead>
                   <tr className="bg-surface-50/50 border-b border-surface-100">
                     <th className="w-14 px-4 py-5"></th>
                     <th className="px-4 py-5 text-left text-[0.68rem] font-bold text-surface-400 uppercase tracking-widest">Viaje / Ruta</th>
                     <th className="px-4 py-5 text-left text-[0.68rem] font-bold text-surface-400 uppercase tracking-widest text-center">Fecha</th>
                     <th className="px-4 py-5 text-left text-[0.68rem] font-bold text-surface-400 uppercase tracking-widest">Responsable</th>
                     <th className="px-4 py-5 text-center text-[0.68rem] font-bold text-surface-400 uppercase tracking-widest">Estado</th>
                     <th className="px-4 py-5 text-center text-[0.68rem] font-bold text-surface-400 uppercase tracking-widest">Manifiesto</th>
                     <th className="px-4 py-5 text-right text-[0.68rem] font-bold text-surface-400 uppercase tracking-widest pr-10">Acciones</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-surface-100">
                   {groupedData.shipments?.length > 0 ? groupedData.shipments.map(ship => {
                     const isExpanded = expandedShipments.has(ship.route.id);
                     const route = ship.route;
                     
                     return (
                       <React.Fragment key={route.id}>
                         <tr className={`hover:bg-primary-50/40 transition-all cursor-pointer group ${isExpanded ? 'bg-primary-50/20' : ''}`} onClick={() => toggleExpansion(route.id)}>
                           <td className="px-4 py-5 text-center">
                              <div className={`transition-all duration-300 transform ${isExpanded ? 'rotate-90 text-primary-600' : 'text-surface-300'}`}>
                                 <ChevronRight size={20} strokeWidth={3} />
                              </div>
                           </td>
                           <td className="px-4 py-5">
                              <div className="flex flex-col">
                                 <span className="font-bold text-surface-900 group-hover:text-primary-700 transition-colors">
                                   {route.origin} → {route.destination}
                                 </span>
                                 <span className="text-[10px] font-mono font-black text-primary-500 tracking-tighter uppercase">
                                   {route.route_code || route.id.substring(0, 8)}
                                 </span>
                              </div>
                           </td>
                           <td className="px-4 py-5 text-center">
                              <div className="flex flex-col items-center">
                                 <span className="font-bold text-surface-900 text-sm">
                                   {route.departure_time ? new Date(route.departure_time).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit' }) : '--'}
                                 </span>
                                 <span className="text-[10px] font-black text-primary-500 uppercase tracking-tighter">
                                   {route.departure_time ? new Date(route.departure_time).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : 'S/H'}
                                 </span>
                              </div>
                           </td>
                           <td className="px-4 py-5">
                              <span className="text-sm text-surface-600 font-medium">{route.driver?.full_name || 'Sin conductor'}</span>
                           </td>
                           <td className="px-4 py-5 text-center">
                              <Badge variant={route.status === 'en_transito' ? 'info' : 'neutral'}>
                                 {route.status === 'en_transito' ? 'Ruta' : 'Standby'}
                              </Badge>
                           </td>
                           <td className="px-4 py-5 text-center text-sm font-bold text-surface-900">
                              {ship.packages.length}
                           </td>
                           <td className="px-4 py-5 text-right pr-8">
                              <Button variant="secondary" size="xs" className="h-8 px-4 rounded-xl text-[10px] font-black uppercase tracking-tight gap-1.5 border-primary-200 text-primary-700 bg-white hover:bg-primary-600 hover:text-white transition-all shadow-sm" onClick={(e) => { e.stopPropagation(); handleOpenContextualForm(route); }}>
                                 <PackagePlus size={14} strokeWidth={2.5} /> Cargar
                              </Button>
                           </td>
                         </tr>
                         
                         {isExpanded && (
                           <tr className="bg-surface-50/50">
                              <td colSpan="7" className="px-10 pb-8 pt-2 animate-in fade-in slide-in-from-top-4 duration-500">
                                 <div className="rounded-3xl border border-primary-100 bg-white shadow-[0_15px_40px_-20px_rgba(30,58,138,0.15)] overflow-hidden">
                                    <DataTable 
                                      columns={baseColumns} 
                                      data={ship.packages} 
                                      loading={loading} 
                                      onRowClick={(row) => setSelectedPackage(row)}
                                      emptyMessage="Este despacho aún no tiene carga asignada."
                                    />
                                 </div>
                              </td>
                           </tr>
                         )}
                       </React.Fragment>
                     );
                   }) : (
                     <tr>
                       <td colSpan="7" className="py-24 text-center">
                          <div className="flex flex-col items-center opacity-25 grayscale">
                            <Truck size={64} strokeWidth={1} />
                            <p className="mt-4 font-display text-xl font-bold italic tracking-tight">Sin despachos activos</p>
                          </div>
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
            </div>
          )}
        </div>

        {/* RIGHT: LOOSE CARGO PANEL (30%) */}
        <aside className="w-full xl:w-[30rem] space-y-5">
           <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-warning-500 text-white flex items-center justify-center shadow-xl shadow-warning-500/20">
                  <Package size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-black text-surface-950 tracking-tight">Carga Suelta</h2>
                  <p className="text-xs text-surface-500 font-medium">Pendiente de asignación</p>
                </div>
              </div>
              <Badge variant="warning" className="h-7 px-3">{groupedData.loose?.length || 0}</Badge>
           </div>
           
           <div className="rounded-[2.2rem] border border-surface-100 bg-white p-5 shadow-xl shadow-surface-200/20 h-fit max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
              <Button size="lg" className="w-full h-14 mb-6 gap-3 text-sm font-black uppercase tracking-wider shadow-xl shadow-primary-500/25 rounded-2xl" onClick={() => setShowForm(true)}>
                <PackagePlus size={20} strokeWidth={2.5} /> Nuevo Registro Global
              </Button>

              <div className="space-y-4">
                {groupedData.loose?.length > 0 ? (
                  groupedData.loose.map(pkg => (
                    <div key={pkg.id} className="group p-5 bg-surface-50 rounded-[1.8rem] border border-surface-100 hover:border-primary-400 hover:bg-white transition-all cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 duration-300" onClick={() => setSelectedPackage(pkg)}>
                       <div className="flex items-center justify-between mb-3">
                          <span className="font-mono text-[10px] font-black text-primary-600 bg-primary-100/50 px-3 py-1 rounded-lg ring-1 ring-primary-200 uppercase tracking-tighter italic">
                             {pkg.tracking_code}
                          </span>
                          <span className="text-[11px] font-black text-surface-900 bg-white px-2 py-1 rounded-md shadow-sm border border-surface-100">
                             {pkg.peso} kg
                          </span>
                       </div>
                       <p className="font-black text-surface-950 text-base mb-1 tracking-tight">{pkg.origen} → {pkg.destino}</p>
                       <p className="text-xs text-surface-500 truncate italic font-medium">{pkg.description || 'Sin detalles adicionales'}</p>
                       
                       <div className="mt-4 flex items-center justify-between pt-4 border-t border-surface-100/80">
                          <div className="flex items-center gap-2">
                             <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                             <span className="text-[10px] font-black uppercase text-surface-400 tracking-widest">En Almacén</span>
                          </div>
                          <Button variant="secondary" size="xs" className="h-8 px-4 text-[10px] font-black uppercase gap-2 opacity-0 group-hover:opacity-100 transition-all rounded-xl border-primary-200 text-primary-700 bg-white hover:bg-primary-50" onClick={(e) => { e.stopPropagation(); setAssignPackage(pkg); setShowAssignModal(true); }}>
                             <Link size={12} strokeWidth={2.5} /> Vincular
                          </Button>
                       </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center opacity-20 flex flex-col items-center gap-4">
                    <Boxes size={56} strokeWidth={1} />
                    <p className="text-sm font-bold uppercase tracking-[0.2em]">Almacén Vacío</p>
                  </div>
                )}
              </div>
           </div>
        </aside>
      </section>

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setContextualRoute(null); }} title="Registrar nuevo paquete">
        <PackageForm 
          onSuccess={handleCreateSuccess} 
          onCancel={() => { setShowForm(false); setContextualRoute(null); }} 
          initialRouteId={contextualRoute?.id}
          initialOrigin={contextualRoute?.origin}
          initialDestination={contextualRoute?.destination}
        />
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
