import React, { useEffect, useMemo, useState } from 'react';
import { routeName } from '../../../utils/routeLabel';
import { Boxes, MapPinned, PackageCheck, PackageSearch, Search, Truck, Link, PackagePlus, ChevronRight, ChevronDown, Package, Clock, Plus, Filter, Calendar as CalendarIcon, RefreshCw } from 'lucide-react';
import api from '../../../services/api';
import Badge from '../../../components/atoms/Badge';
import Button from '../../../components/atoms/Button';
import Modal from '../../../components/molecules/Modal';
import DataTable from '../../../components/organisms/DataTable';
import usePersistentState from '@/hooks/usePersistentState';
import { noteCreatedPackage, takeRequestedField, useFieldRequests, useRegisterPageEntity, useRegisterPageView, useRegisterScreenState, useSearchRequests, useTabRequests } from '../../ai-chat/pageContext';
import Skeleton from '../../../components/atoms/Skeleton';
import PackageDetail from '../components/PackageDetail';
import PackageForm from '../components/PackageForm';
import { GUIDED_EVENTS } from '../../ai-chat/guided/guidedForms';
import ShipmentAssignmentForm from '../components/ShipmentAssignmentForm';
import useRole from '../../../app/useRole';
import PackagesHero from '../components/PackagesHero';

const statusMap = {
  pendiente: { label: 'Pendiente', variant: 'warning' },
  asignado: { label: 'Asignado', variant: 'info' },
  en_transito: { label: 'En tránsito', variant: 'info' },
  entregado: { label: 'Entregado', variant: 'success' },
  completada: { label: 'Completada', variant: 'success' },
  finalizada: { label: 'Finalizada', variant: 'success' },
};

function PackagesPage() {
  const { hasRole, isClient } = useRole();
  const [packages, setPackages] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignPackage, setAssignPackage] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [searchTerm, setSearchTerm] = usePersistentState('paquetes:busqueda', '');
  const [activeTab, setActiveTab] = usePersistentState('paquetes:pestana', 'all'); // 'all' o 'delivered' (histórico)
  const [contextualRoute, setContextualRoute] = useState(null);
  // el asistente sabe qué pestaña ves y, si abriste la ficha de un paquete, cuál es («este paquete»)
  useRegisterPageView(activeTab);
  useTabRequests('packages', setActiveTab, ['all', 'delivered']); // «muéstrame los paquetes entregados»
  useFieldRequests('packages', { date: (v) => { const [y, m, d] = String(v).split('-').map(Number); if (y && m && d) setSelectedDate(new Date(y, m - 1, d)); } });
  useSearchRequests('packages', setSearchTerm); // «muéstrame el paquete que acabas de crear»: la tabla se filtra por su código
  useRegisterPageEntity(selectedPackage?.tracking_code ? { type: 'package', ref: selectedPackage.tracking_code } : null);
  const [expandedShipments, setExpandedShipments] = useState(new Set());
  const [selectedDate, setSelectedDate] = useState(() => {
    const ask = takeRequestedField('packages', 'date'); // «muéstrame los despachos del lunes» (Logi)
    const [y, m, d] = String(ask ?? '').split('-').map(Number);
    return y && m && d ? new Date(y, m - 1, d) : new Date();
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const resetToToday = () => setSelectedDate(new Date());
  
  const stepDate = (days) => {
    setSelectedDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return next;
    });
  };

  const fetchData = async (silent = false) => {
    if (silent) setIsRefreshing(true);
    else setLoading(true);

    try {
      const [pkgRes, routeRes] = await Promise.all([
        api.get('/logistics/packages'),
        api.get('/logistics/routes')
      ]);
      setPackages(pkgRes.data || []);
      setRoutes(routeRes.data || []);
    } catch (err) {
      console.error('Error cargando datos:', err);
      // No reseteamos a vacio si es un refresh para no perder el estado anterior
      if (!silent) {
        setPackages([]);
        setRoutes([]);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Carga inicial (Full Skeleton)
  useEffect(() => {
    fetchData(false);
  }, []);

  // Cambio de fecha (Background Refresh)
  useEffect(() => {
    // Evitamos el primer trigger innecesario ya que el fetchData(false) ya se ejecuta al montar
    if (!loading) {
       fetchData(true);
    }
  }, [selectedDate]);

  const handleCreateSuccess = (created) => {
    noteCreatedPackage(created);
    setShowForm(false);
    setContextualRoute(null);
    fetchData();
  };

  const handleAssignSuccess = () => {
    setShowAssignModal(false);
    setAssignPackage(null);
    fetchData();
  };

  // Logi (asistente) hace una acción a la vista de todos: al terminar refresca la lista y cierra el formulario; si lo detienen, solo lo cierra
  useEffect(() => {
    const closeForms = () => { setShowForm(false); setContextualRoute(null); setShowAssignModal(false); setAssignPackage(null); };
    const onChanged = () => { closeForms(); fetchData(true); };
    window.addEventListener(GUIDED_EVENTS.changed, onChanged);
    window.addEventListener(GUIDED_EVENTS.cancelForm, closeForms);
    return () => {
      window.removeEventListener(GUIDED_EVENTS.changed, onChanged);
      window.removeEventListener(GUIDED_EVENTS.cancelForm, closeForms);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchData solo usa setters de estado
  }, []);

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

  const filteredPackages = useMemo(() => {
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    return packages.filter(p => {
      // Si tiene ruta, filtramos por la fecha de la ruta
      if (p.route_id && p.transport_routes) {
        const depTime = new Date(p.transport_routes.departure_time);
        return depTime >= dayStart && depTime <= dayEnd;
      }
      // Si es carga suelta, filtramos por fecha de creación
      const createdAt = new Date(p.created_at);
      return createdAt >= dayStart && createdAt <= dayEnd;
    });
  }, [packages, selectedDate]);

  const totalPackages = filteredPackages.length;
  const delivered = filteredPackages.filter((p) => p.status === 'entregado').length;
  const transitCount = filteredPackages.filter((p) => p.status === 'en_transito' || p.status === 'asignado').length;
  const pendingCount = filteredPackages.filter((p) => p.status === 'pendiente').length;

  const groupedData = useMemo(() => {
    let result = packages;

    if (searchTerm) {
      const plain = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const term = plain(searchTerm.trim());
      result = result.filter((pkg) =>
        [pkg.tracking_code, pkg.origen, pkg.destino, pkg.recipient_name, pkg.sender_name, String(pkg.status || '').replace(/_/g, ' ')].some((value) => plain(value).includes(term))
      );
    }

    // 1. Mapear todas las rutas
    const shipmentsMap = {};
    routes.forEach(r => {
      shipmentsMap[r.id] = { route: r, packages: [] };
    });

    // 2. Distribuir paquetes asignados
    result.filter(p => p.route_id).forEach(pkg => {
      if (shipmentsMap[pkg.route_id]) {
        shipmentsMap[pkg.route_id].packages.push(pkg);
      }
    });

    // 3. Carga suelta (Solo pendiente de entrega)
    const loose = result.filter(p => !p.route_id && p.status !== 'entregado');

    const searching = Boolean(searchTerm.trim()); // con un filtro puesto solo se ven los despachos donde hay coincidencias

    if (activeTab === 'delivered') {
      // Historial: Rutas finalizadas o con paquetes entregados
      const historicalShipments = Object.values(shipmentsMap)
        .filter(ship => {
          if ((isClient || searching) && ship.packages.length === 0) return false;
          const isFinished = ['completada', 'finalizada', 'completed', 'entregado'].includes(ship.route.status?.toLowerCase());
          const hasDelivered = ship.packages.some(p => p.status === 'entregado');
          return isFinished || hasDelivered;
        })
        .sort((a, b) => new Date(b.route.departure_time || 0) - new Date(a.route.departure_time || 0));

      return { loose, shipments: historicalShipments };
    }

    // Tablero Operativo: Filtrado por Fecha (selectedDate)
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    const activeShipments = Object.values(shipmentsMap).filter(ship => {
      if ((isClient || searching) && ship.packages.length === 0) return false;
      if (!ship.route.departure_time) return true;
      const d = new Date(ship.route.departure_time);
      return d >= dayStart && d <= dayEnd;
    });

    return {
      loose,
      shipments: activeShipments
    };
  }, [packages, routes, searchTerm, activeTab, selectedDate]);

  // Logi sabe qué filtros hay puestos y cuántos paquetes se ven (y algunos códigos), para «bórrame el filtro» o «¿cuántos hay?»
  const shownPackages = [...groupedData.shipments.flatMap((sh) => sh.packages), ...groupedData.loose];
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  useRegisterScreenState(loading ? null : {
    filters: { search: searchTerm.trim(), ...(activeTab === 'all' ? { date: ymd(selectedDate) } : {}) },
    visible: { count: shownPackages.length, codes: shownPackages.slice(0, 5).map((p) => p.tracking_code).filter(Boolean) },
  });

  const baseColumns = [
    {
      key: 'tracking_code',
      label: 'Paquete',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700 font-mono text-xs font-bold ring-1 ring-primary-100">
            {val.substring(0, 4)}
          </div>
          <div>
            <p className="font-bold text-surface-900 text-sm">{val}</p>
            <p className="text-xs text-surface-500 font-medium truncate max-w-[150px]">{row.description || 'Sin descripción'}</p>
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
        <PackagesHero
          totalPackages={totalPackages}
          deliveredCount={delivered}
          transitCount={transitCount}
          pendingCount={pendingCount}
          actions={!isClient && (
            // En pantallas medianas el panel "Carga suelta" queda debajo de la tabla: la acción principal sube a la cabecera
            <Button size="md" data-logi="nuevo-paquete" className="gap-2 whitespace-nowrap font-bold max-sm:min-h-11 2xl:hidden" onClick={() => setShowForm(true)}>
              <PackagePlus size={18} strokeWidth={2.5} /> Nuevo Registro Global
            </Button>
          )}
        />
      )}

      <section className="flex flex-col 2xl:flex-row gap-8 items-start">
        {/* LEFT: UNIFIED SHIPMENT BOARD (70%) */}
        <div className="flex-1 w-full min-w-0 space-y-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-xl shadow-primary-500/20">
                <Truck size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-surface-950 tracking-tight">
                   {activeTab === 'delivered' ? 'Historial de Despachos' : 'Panel de Despachos'}
                </h2>
               
               {isRefreshing && (
                 <div className="mt-4 flex items-center gap-2 px-3 py-1 bg-primary-100/50 text-primary-700 text-xs font-bold rounded-full w-fit animate-pulse">
                   <Clock size={12} />
                   ACTUALIZANDO DATOS...
                 </div>
               )}
            </div>
          </div>
            
            <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
               {/* SMART DATE STEPPER (Only for active tab) */}
               {activeTab !== 'delivered' && (
                 <div className="flex items-center bg-white border border-surface-200 rounded-2xl p-1 shadow-sm mr-2 ring-1 ring-surface-100">
                    <button type="button" aria-label="Día anterior" onClick={() => stepDate(-1)} className="h-11 w-11 sm:h-8 sm:w-8 flex items-center justify-center rounded-xl hover:bg-surface-50 text-surface-500 hover:text-primary-600 transition-all">
                       <ChevronRight size={18} className="rotate-180" />
                    </button>
                    
                    <div className="px-4 py-1 flex flex-col items-center min-w-[140px]">
                       <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-surface-950">
                             {selectedDate.toLocaleDateString('es-BO', { day: '2-digit', month: 'long' })}
                          </span>
                          {selectedDate.toDateString() === new Date().toDateString() && (
                             <Badge variant="info" className="py-0 px-1.5">HOY</Badge>
                          )}
                       </div>
                       {selectedDate.toDateString() !== new Date().toDateString() ? (
                          <button onClick={resetToToday} className="text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md hover:bg-primary-100 transition-all">
                             Volver a hoy
                          </button>
                       ) : (
                          <span className="text-xs font-medium text-surface-600 -mt-0.5">Vista operativa</span>
                       )}
                    </div>

                    <button type="button" aria-label="Día siguiente" onClick={() => stepDate(1)} className="h-11 w-11 sm:h-8 sm:w-8 flex items-center justify-center rounded-xl hover:bg-surface-50 text-surface-500 hover:text-primary-600 transition-all">
                       <ChevronRight size={18} />
                    </button>
                    <div className="h-6 w-px bg-surface-100 mx-1" />
                    <label className="h-11 w-11 sm:h-8 sm:w-8 flex items-center justify-center rounded-xl hover:bg-surface-50 text-surface-500 cursor-pointer relative">
                       <Clock size={16} aria-hidden="true" /><input type="date" aria-label="Elegir otra fecha" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setSelectedDate(new Date(e.target.value + 'T00:00:00'))} />
                    </label>
                 </div>
               )}

              <div className="group relative w-full sm:w-auto">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Buscar paquete, viaje o ruta..." 
                  aria-label="Buscar viaje o ruta"
                  className="pl-9 pr-4 py-2 max-sm:min-h-11 bg-white border border-surface-200 rounded-xl text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none w-full sm:w-44 lg:w-48"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="secondary" size="md" onClick={() => setActiveTab(activeTab === 'delivered' ? 'all' : 'delivered')} className="h-10 px-5 rounded-xl font-bold gap-2">
                {activeTab === 'delivered' ? <Truck size={18}/> : <PackageSearch size={18}/>}
                {activeTab === 'delivered' ? 'Operativos' : 'Histórico'}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-surface-200 bg-white shadow-sm">
             <table className="w-full border-collapse">
               <thead>
                 <tr className="bg-white border-b border-surface-200">
                   <th className="w-14 px-4 py-3"></th>
                   <th className="px-4 py-3 text-left text-xs font-semibold text-surface-600">Viaje / Ruta</th>
                   <th className="px-4 py-3 text-left text-xs font-semibold text-surface-600 text-center">Fecha</th>
                   <th className="hidden px-4 py-3 text-left text-xs font-semibold text-surface-600 md:table-cell">Responsable</th>
                   <th className="px-4 py-3 text-center text-xs font-semibold text-surface-600">Estado</th>
                   <th className="hidden px-4 py-3 text-center text-xs font-semibold text-surface-600 md:table-cell">Manifiesto</th>
                   <th className="px-4 py-3 text-right text-xs font-semibold text-surface-600 pr-10">Acciones</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-surface-100">
                 {groupedData.shipments?.length > 0 ? groupedData.shipments.map(ship => {
                   const isExpanded = expandedShipments.has(ship.route.id);
                   const route = ship.route;
                   const isPast = route.departure_time && new Date(route.departure_time) < new Date().setHours(0,0,0,0);
                   
                   return (
                     <React.Fragment key={route.id}>
                       <tr className={`hover:bg-primary-50/40 transition-all cursor-pointer group ${isExpanded ? 'bg-primary-50/20' : ''} ${isPast && activeTab !== 'delivered' ? 'opacity-50 saturate-50' : ''}`} onClick={() => toggleExpansion(route.id)}>
                         <td className="px-4 py-5 text-center">
                            <div className={`transition-all duration-300 transform ${isExpanded ? 'rotate-90 text-primary-600' : 'text-surface-500'}`}>
                               <ChevronRight size={20} strokeWidth={3} />
                            </div>
                         </td>
                         <td className="px-4 py-5">
                            <div className="flex flex-col">
                               <span className="font-bold text-surface-900 group-hover:text-primary-700 transition-colors">
                                 {route.origin} → {route.destination}
                               </span>
                               <span className="text-xs font-semibold text-primary-600">
                                 {routeName(route) !== `${route.origin} → ${route.destination}` ? routeName(route) : (route.driver?.full_name || 'Sin conductor')}
                                 <span className="md:hidden"> · {ship.packages.length} paq.</span>
                               </span>
                            </div>
                         </td>
                         <td className="px-4 py-5 text-center">
                            <div className="flex flex-col items-center">
                               <span className="font-bold text-surface-900 text-sm">
                                 {route.departure_time ? new Date(route.departure_time).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit' }) : '--'}
                               </span>
                               <span className="text-xs font-semibold text-primary-700">
                                 {route.departure_time ? new Date(route.departure_time).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : 'S/H'}
                               </span>
                            </div>
                         </td>
                         <td className="hidden px-4 py-5 md:table-cell">
                            <span className="text-sm text-surface-600 font-medium">{route.driver?.full_name || 'Sin conductor'}</span>
                         </td>
                         <td className="px-4 py-5 text-center">
                            {(() => {
                              const isDelayed = route.status === 'planeada' && route.departure_time && new Date(route.departure_time) < new Date();
                              return (
                                <Badge variant={['completada', 'finalizada', 'completed', 'entregado'].includes(route.status?.toLowerCase()) ? 'success' : (route.status === 'en_transito' ? 'info' : (isDelayed ? 'danger' : 'neutral'))}>
                                   {['completada', 'finalizada', 'completed', 'entregado'].includes(route.status?.toLowerCase()) ? 'Finalizado' : (route.status === 'en_transito' ? 'En Ruta' : (isDelayed ? 'Atrasado' : 'Standby'))}
                                </Badge>
                              );
                            })()}
                         </td>
                         <td className="hidden px-4 py-5 text-center text-sm font-bold text-surface-900 md:table-cell">
                            {ship.packages.length}
                         </td>
                         <td className="px-4 py-5 text-right pr-8">
                            {!isClient && (
<Button variant="secondary" size="xs" className="h-8 max-sm:min-h-11 px-4 rounded-xl text-xs font-bold gap-1.5 border-primary-200 text-primary-700 bg-white hover:bg-primary-600 hover:text-white transition-all shadow-sm disabled:opacity-30 disabled:grayscale disabled:pointer-events-none" disabled={(isPast && activeTab !== 'delivered') || ['completada', 'finalizada', 'completed', 'entregado'].includes(route.status?.toLowerCase())} onClick={(e) => { e.stopPropagation(); handleOpenContextualForm(route); }}>
                               <PackagePlus size={14} strokeWidth={2.5} /> {['completada', 'finalizada', 'completed', 'entregado'].includes(route.status?.toLowerCase()) ? 'Cerrado' : 'Cargar'}
                            </Button>
                            )}
                         </td>
                       </tr>
                       
                       {isExpanded && (
                         <tr className="bg-surface-50/50">
                            <td colSpan="7" className="px-2 pb-6 pt-2 sm:px-10 sm:pb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                               <div className="rounded-3xl border border-primary-100 bg-white shadow-[0_15px_40px_-20px_rgba(30,58,138,0.15)] overflow-hidden">
                                  <DataTable 
                                    columns={baseColumns} 
                                    data={ship.packages} 
                                    loading={loading} 
                                    onRowClick={(row) => setSelectedPackage(row)}
                                    emptyMessage="Este despacho no tiene carga vinculada."
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
                          <p className="mt-4 font-display text-xl font-bold italic tracking-tight">
                             {activeTab === 'delivered' ? 'Sin historial disponible' : 'Sin despachos activos para esta fecha'}
                          </p>
                        </div>
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
          </div>
        </div>

        {/* RIGHT: LOOSE CARGO PANEL (30%) */}
        <aside className="w-full 2xl:w-[26rem] 2xl:shrink-0 space-y-5">
           <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-warning-500 text-white flex items-center justify-center shadow-xl shadow-warning-500/20">
                  <Package size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold text-surface-950 tracking-tight">Carga Suelta</h2>
                  <p className="text-xs text-surface-500 font-medium">Pendiente de asignación</p>
                </div>
              </div>
              <Badge variant="warning" className="h-7 px-3">{groupedData.loose?.length || 0}</Badge>
           </div>
           
           <div className="rounded-[2.2rem] border border-surface-100 bg-white p-5 shadow-xl shadow-surface-200/20 h-fit max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
              {/* registrar paquetes es del personal: al cliente el backend se lo rechazaría (403) */}
              {!isClient && (
                <Button size="lg" data-logi="nuevo-paquete" className="max-2xl:hidden w-full h-14 mb-6 gap-3 text-sm font-bold shadow-xl shadow-primary-500/25 rounded-2xl" onClick={() => setShowForm(true)}>
                  <PackagePlus size={20} strokeWidth={2.5} /> Nuevo Registro Global
                </Button>
              )}

              <div className="space-y-4">
                {groupedData.loose?.length > 0 ? (
                  groupedData.loose.map(pkg => (
                    <div key={pkg.id} className="group p-5 bg-surface-50 rounded-[1.8rem] border border-surface-100 hover:border-primary-400 hover:bg-white transition-all cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 duration-300" onClick={() => setSelectedPackage(pkg)}>
                       <div className="flex items-center justify-between mb-3">
                          <span className="font-mono text-xs font-bold text-primary-600 bg-primary-100/50 px-3 py-1 rounded-lg ring-1 ring-primary-200 uppercase tracking-tighter italic">
                             {pkg.tracking_code}
                          </span>
                          <span className="text-xs font-bold text-surface-900 bg-white px-2 py-1 rounded-md shadow-sm border border-surface-100">
                             {pkg.peso} kg
                          </span>
                       </div>
                       <p className="font-bold text-surface-950 text-base mb-1 tracking-tight">{pkg.origen} → {pkg.destino}</p>
                       <p className="text-xs text-surface-500 truncate italic font-medium">{pkg.description || 'Sin detalles adicionales'}</p>
                       
                       <div className="mt-4 flex items-center justify-between pt-4 border-t border-surface-100/80">
                          <div className="flex items-center gap-2">
                             <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                             <span className="text-xs font-bold uppercase text-surface-500 tracking-widest">En Almacén</span>
                          </div>
                          <Button variant="secondary" size="xs" data-logi-vincular={pkg.tracking_code} className="h-8 px-4 text-xs font-bold uppercase gap-2 opacity-0 group-hover:opacity-100 transition-all rounded-xl border-primary-200 text-primary-700 bg-white hover:bg-primary-50" onClick={(e) => { e.stopPropagation(); setAssignPackage(pkg); setShowAssignModal(true); }}>
                             <Link size={12} strokeWidth={2.5} /> Vincular
                          </Button>
                       </div>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center">
                    <Boxes size={40} strokeWidth={1.5} className="mx-auto text-surface-400" aria-hidden="true" />
                    <p className="mt-3 text-sm font-semibold text-surface-800">No hay carga suelta</p>
                    <p className="mx-auto mt-1 max-w-xs text-sm text-surface-600">Los paquetes sin viaje aparecen aquí hasta que los cargues a uno.</p>
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
