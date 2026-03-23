import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, PackageSearch, Route, Search, TimerReset, Boxes, Package, MapPin, ChevronRight, Activity, Filter, Info, Navigation } from 'lucide-react';
import Badge from '../../../components/atoms/Badge';
import Button from '../../../components/atoms/Button';
import SearchInput from '../../../components/atoms/SearchInput';
import EmptyState from '../../../components/molecules/EmptyState';
import Modal from '../../../components/molecules/Modal';
import Skeleton from '../../../components/atoms/Skeleton';
import apiService from '../../../services/apiService';
import TrackingForm from '../components/TrackingForm';
import TrackingHistory from '../components/TrackingHistory';
import TrackingMap from '../components/TrackingMap';
import useRole from '../../../app/useRole';

const statusMap = {
  pendiente: { label: 'Pendiente', variant: 'warning' },
  asignado: { label: 'Asignado', variant: 'info' },
  en_transito: { label: 'En tránsito', variant: 'info' },
  entregado: { label: 'Entregado', variant: 'success' },
};

function TrackingPage() {
  const { role, isClient } = useRole();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [completedCheckpointIds, setCompletedCheckpointIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  
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

  useEffect(() => {
    const fetchRouteData = async () => {
      if (!selectedPackageId) return;
      try {
        const pkg = packages.find(p => p.id === selectedPackageId);
        if (pkg?.route_id) {
          const [routeRes, logsRes] = await Promise.all([
            apiService.getRoute(pkg.route_id),
            apiService.getTrackingLogs(pkg.id)
          ]);
          setSelectedRoute(routeRes.data);
          
          // Detectar checkpoints alcanzados desde los logs
          const reached = logsRes.data
            ?.filter(log => {
               const s = log.status.toLowerCase();
               return s.includes('llegada') || s.includes('llegó') || s.includes('checkpoint') || s.includes('inició') || s.includes('partida');
            })
            .map(log => log.data?.checkpoint_id)
            .filter(Boolean) || [];
          setCompletedCheckpointIds(reached);
        } else {
          setSelectedRoute(null);
          setCompletedCheckpointIds([]);
        }
      } catch (err) {
        console.error('Error cargando detalles tácticos para el mapa:', err);
        setSelectedRoute(null);
      }
    };
    fetchRouteData();
  }, [selectedPackageId, packages]);

  const handleRegisterSuccess = async () => {
    setShowForm(false);
    await fetchPackages();
  };

  const filteredPackages = useMemo(() => {
    let result = packages;
    
    // Si es cliente, idealmente el backend ya filtra, pero reforzamos en UI 
    // (o permitimos buscar solo por tracking code si no hay sesión iniciada)
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((pkg) => 
        [pkg.tracking_code, pkg.origen, pkg.destino].some((value) => 
          String(value || '').toLowerCase().includes(term)
        )
      );
    }
    return result;
  }, [packages, searchTerm]);

  const selectedPackage = packages.find((pkg) => pkg.id === selectedPackageId);
  const activeCount = packages.filter((pkg) => pkg.status === 'en_transito' || pkg.status === 'asignado').length;

  return (
    <div className="relative h-[calc(100vh-120px)] w-full overflow-hidden rounded-[2.5rem] border border-surface-100 bg-surface-50 shadow-2xl">
      {/* 1. LAYER: LIVE MAP BACKGROUND */}
      <div className="absolute inset-0 z-0">
          <TrackingMap 
            pkg={selectedPackage} 
            route={selectedRoute} 
            completedCheckpointIds={completedCheckpointIds} 
          />
      </div>

      {/* 2. LAYER: FLOATING CONTROL SHEET (LEFT) */}
      <aside className={`absolute left-6 top-6 bottom-6 z-10 w-[24rem] transition-all duration-500 transform ${showSidebar ? 'translate-x-0' : '-translate-x-[120%]'}`}>
         <div className="h-full flex flex-col bg-white/80 backdrop-blur-xl rounded-[2.2rem] border border-white shadow-[0_32px_80px_-20px_rgba(15,23,42,0.15)] overflow-hidden">
            {/* Sidebar Header */}
            <div className="p-6 pb-4 border-b border-surface-100/50">
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                     <div className="h-10 w-10 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary-500/20">
                        <Navigation size={20} strokeWidth={2.5} />
                     </div>
                     <div>
                        <h2 className="font-display text-xl font-black text-surface-950 tracking-tight">Trazabilidad</h2>
                        <div className="flex items-center gap-1.5">
                           <div className="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse" />
                           <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Sistema Operativo</span>
                        </div>
                     </div>
                  </div>
                  <button onClick={() => setShowSidebar(false)} className="h-8 w-8 rounded-lg hover:bg-surface-100 flex items-center justify-center text-surface-400 transition-colors xl:hidden">
                     <ChevronRight size={18} className="rotate-180" />
                  </button>
               </div>
               
               <div className="relative group">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Buscar por código..." 
                    className="w-full pl-10 pr-4 py-3 bg-white/50 border border-surface-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>
            </div>

            {/* Sidebar List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
               {loading ? (
                 Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
               ) : filteredPackages.length > 0 ? (
                 filteredPackages.map((pkg) => {
                    const isSelected = selectedPackageId === pkg.id;
                    const status = statusMap[pkg.status] || { label: pkg.status, variant: 'neutral' };
                    
                    return (
                      <button 
                        key={pkg.id} 
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={`w-full group p-4 rounded-2xl border transition-all text-left relative overflow-hidden ${
                          isSelected 
                            ? 'bg-primary-600 border-primary-500 shadow-xl shadow-primary-500/20 translate-x-2' 
                            : 'bg-white/50 border-surface-100 hover:border-primary-200 hover:bg-white'
                        }`}
                      >
                         <div className="flex items-center justify-between mb-2">
                            <span className={`font-mono text-[10px] font-black italic px-2 py-0.5 rounded ${
                               isSelected ? 'bg-white/20 text-white' : 'bg-primary-50 text-primary-700'
                            }`}>
                               {pkg.tracking_code}
                            </span>
                            <Badge variant={isSelected ? 'info' : status.variant} className={isSelected ? '!bg-white/20 !text-white !border-none' : ''}>
                               {status.label}
                            </Badge>
                         </div>
                         <p className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-surface-900'}`}>
                            {pkg.origen} → {pkg.destino}
                         </p>
                         <div className={`mt-2 flex items-center justify-between ${isSelected ? 'text-white/70' : 'text-surface-400'}`}>
                            <span className="text-[10px] font-bold">Peso: {pkg.peso} kg</span>
                            <ChevronRight size={14} className={`transition-transform duration-300 ${isSelected ? 'translate-x-1' : 'group-hover:translate-x-1'}`} />
                         </div>
                         
                         {isSelected && (
                           <div className="absolute top-0 right-0 h-full w-1 bg-white/40" />
                         )}
                      </button>
                    )
                 })
               ) : (
                 <div className="py-20 text-center opacity-40 italic">
                    <PackageSearch size={40} className="mx-auto mb-3" />
                    <p className="text-sm font-bold uppercase tracking-tight">Sin resultados</p>
                 </div>
               )}
            </div>

            {/* Sidebar Footer Stats */}
            {!isClient && (
              <div className="p-5 bg-primary-600/5 border-t border-primary-100 flex items-center justify-around">
                 <div className="text-center">
                    <p className="text-[10px] font-black uppercase text-surface-400 tracking-tighter">Activos</p>
                    <p className="text-lg font-black text-primary-700">{activeCount}</p>
                 </div>
                 <div className="h-8 w-px bg-primary-100" />
                 <div className="text-center">
                    <p className="text-[10px] font-black uppercase text-surface-400 tracking-tighter">Total Hoy</p>
                    <p className="text-lg font-black text-primary-700">{packages.length}</p>
                 </div>
              </div>
            )}
         </div>
      </aside>

      {/* 3. LAYER: FLOATING ACTION BUTTONS (TOP RIGHT) */}
      <div className="absolute top-6 right-6 z-10 flex flex-col gap-3">
         {!isClient && (
           <Button size="lg" className="h-14 px-8 rounded-2xl shadow-xl shadow-primary-500/25 gap-3 font-black uppercase tracking-wider text-sm" onClick={() => setShowForm(true)}>
             <Activity size={20} strokeWidth={2.5} /> Registrar Evento
           </Button>
         )}
         {!showSidebar && (
            <Button variant="secondary" size="icon" className="h-14 w-14 rounded-2xl bg-white shadow-xl hover:bg-primary-50" onClick={() => setShowSidebar(true)}>
               <Filter size={20} />
            </Button>
         )}
      </div>

      {/* 4. LAYER: CONTEXTUAL TIMELINE (BOTTOM RIGHT) */}
      {selectedPackage && (
        <div className="absolute right-6 bottom-6 z-10 w-[26rem] max-h-[50%] overflow-hidden animate-in fade-in slide-in-from-right-10 duration-500">
           <div className="h-full bg-white/90 backdrop-blur-xl rounded-[2.2rem] border border-white shadow-[0_32px_80px_-20px_rgba(15,23,42,0.15)] flex flex-col">
              <div className="p-4 overflow-y-auto no-scrollbar">
                 <TrackingHistory packageId={selectedPackage.id} className="!border-none !bg-transparent !shadow-none !p-0 !backdrop-blur-none" />
              </div>
           </div>
        </div>
      )}

      {/* HUD Message for Client */}
      {isClient && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
           <div className="bg-surface-900/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl">
              <Info size={18} className="text-primary-400" />
              <p className="text-sm font-medium">Estás visualizando el seguimiento en tiempo real de tu carga.</p>
           </div>
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Registrar evento de seguimiento">
        <TrackingForm packages={packages} onSuccess={handleRegisterSuccess} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}

export default TrackingPage;
