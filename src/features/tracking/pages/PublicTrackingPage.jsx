import React, { useState } from 'react';
import { Search, Package, MapPin, Clock, ArrowLeft, Navigation, ShieldCheck, Truck, Boxes, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../../services/apiService';
import Badge from '../../../components/atoms/Badge';
import Button from '../../../components/atoms/Button';

const statusMapValue = {
  pendiente: { label: 'Pendiente', variant: 'warning' },
  asignado: { label: 'Asignado', variant: 'info' },
  in_transit: { label: 'En tránsito', variant: 'info' },
  en_transito: { label: 'En tránsito', variant: 'info' },
  entregado: { label: 'Entregado', variant: 'success' },
  delivered: { label: 'Entregado', variant: 'success' },
};

const getHistoryLabel = (status) => {
  if (!status) return 'Estado desconocido';
  const cleanStatus = status.trim().toLowerCase();
  if (cleanStatus.includes(':') || cleanStatus.includes('Llegó') || cleanStatus.length > 20) return status;
  const mapped = statusMapValue[cleanStatus];
  return mapped ? mapped.label : status;
};

function PublicTrackingPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);
    setTrackingData(null);

    try {
      const res = await apiService.getPublicTracking(code.trim());
      setTrackingData(res.data);
    } catch (err) {
      console.error('Error en rastreo público:', err);
      setError('No se encontró ningún paquete con ese código o hubo un problema de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#040d1a] selection:bg-primary-500/30 font-sans text-slate-200">
      {/* BACKGROUND DECORATION */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 lg:py-24">
        {/* HEADER */}
        <header className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                  <Truck size={20} className="text-white" strokeWidth={2.5} />
               </div>
               <span className="text-xl font-black tracking-tight text-white uppercase">Logistica<span className="text-primary-400">SPA</span></span>
            </div>
            <button 
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Volver al Login
            </button>
        </header>

        <section className="text-center mb-16">
           <h1 className="text-4xl lg:text-6xl font-black text-white tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
              Rastreo de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-blue-500">Carga Activa</span>
           </h1>
           <p className="text-slate-400 max-w-xl mx-auto text-lg font-medium leading-relaxed italic animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              Ingresa tu código de seguimiento para conocer la ubicación y el estado en tiempo real de tu envío.
           </p>
        </section>

        {/* SEARCH BOX */}
        <div className="max-w-2xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-200">
           <form onSubmit={handleSearch} className="relative group">
              <div className="absolute inset-0 bg-primary-500/20 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center bg-white/5 border border-white/10 p-2 rounded-[2rem] shadow-2xl backdrop-blur-md focus-within:border-primary-500/50 transition-all">
                 <div className="pl-6 text-slate-500 group-focus-within:text-primary-400 transition-colors">
                    <Navigation size={24} strokeWidth={2.5} />
                 </div>
                 <input 
                   type="text" 
                   placeholder="Ej: TRK-171112233..." 
                   className="flex-1 bg-transparent border-none outline-none px-4 py-4 text-xl font-bold text-white placeholder:text-slate-600 tracking-wider"
                   value={code}
                   onChange={(e) => setCode(e.target.value)}
                 />
                 <button 
                   type="submit" 
                   disabled={loading}
                   className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-[1.6rem] px-8 py-4 font-black uppercase tracking-widest text-sm shadow-xl shadow-primary-500/20 transition-all active:scale-95 flex items-center gap-2"
                 >
                    {loading ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={18} strokeWidth={3} />}
                    <span className="hidden sm:inline">Rastrear</span>
                 </button>
              </div>
           </form>
           {error && (
             <p className="mt-4 text-center text-rose-400 font-bold animate-in zoom-in duration-300">{error}</p>
           )}
        </div>

        {/* RESULTS */}
        {trackingData && (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-12 duration-1000">
              {/* Información General */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-400">
                    <UserRound size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Remitente</p>
                    <p className="text-sm font-semibold text-white">{trackingData.package.sender_name || 'Cliente Registrado'}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-success-500/10 flex items-center justify-center text-success-400">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Destinatario</p>
                    <p className="text-sm font-semibold text-white">{trackingData.package.recipient_name || 'No especificado'}</p>
                  </div>
                </div>
              </div>

              {/* OVERVIEW CARD */}
              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl shadow-2xl">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-8 border-b border-white/5">
                  <div className="space-y-1">
                     <p className="text-[0.65rem] uppercase tracking-[0.3em] text-primary-400 font-black">Estado del Envío</p>
                     <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-black text-white">{statusMapValue[trackingData.package.status.trim().toLowerCase()]?.label || trackingData.package.status}</h2>
                        <div className="h-2 w-2 rounded-full bg-success-500 animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.5)]" />
                     </div>
                  </div>
                  <div className="bg-white/5 px-6 py-4 rounded-3xl border border-white/10">
                     <p className="text-[0.6rem] uppercase tracking-widest text-slate-500 mb-1 font-bold">Código de Rastreo</p>
                     <p className="text-xl font-mono font-black text-primary-400 tracking-tighter italic">{trackingData.package.tracking_code}</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4">
                  <div className="flex items-start gap-5 group">
                     <div className="h-14 w-14 rounded-2.5xl bg-primary-600/10 flex items-center justify-center text-primary-400 border border-primary-500/20 group-hover:bg-primary-600 group-hover:text-white transition-all duration-500">
                        <MapPin size={28} />
                     </div>
                     <div>
                        <p className="text-[0.65rem] uppercase tracking-widest text-slate-500 font-black mb-1">Ruta</p>
                        <p className="text-xl font-bold text-white tracking-tight">{trackingData.package.origen} <span className="text-slate-600 mx-2">→</span> {trackingData.package.destino}</p>
                     </div>
                  </div>
                  <div className="flex items-start gap-5 group">
                     <div className="h-14 w-14 rounded-2.5xl bg-blue-600/10 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                        <Boxes size={28} />
                     </div>
                     <div>
                        <p className="text-[0.65rem] uppercase tracking-widest text-slate-500 font-black mb-1">Carga</p>
                        <p className="text-xl font-bold text-white tracking-tight">{trackingData.package.peso} kg <span className="text-xs text-slate-600 ml-2 uppercase tracking-widest">Peso Bruto</span></p>
                     </div>
                  </div>
               </div>
            </div>

            {/* TIMELINE CARD */}
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl shadow-2xl overflow-hidden relative">
               <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                  <Clock size={120} />
               </div>
               
               <h3 className="text-xl font-black text-white tracking-tight mb-8 flex items-center gap-3">
                  <Clock size={20} className="text-primary-400" />
                  Línea de Tiempo Operativa
               </h3>

               {trackingData.history.length > 0 ? (
                 <div className="space-y-6 relative">
                    <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary-500 via-primary-500/20 to-transparent" />
                    
                    {trackingData.history.map((log, idx) => (
                       <div key={idx} className="flex gap-6 animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${idx * 150}ms` }}>
                          <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#06111f] border border-white/10 text-primary-400 shadow-xl group hover:border-primary-500 transition-colors">
                             <div className={`h-2.5 w-2.5 rounded-full ${idx === 0 ? 'bg-primary-500 animate-pulse' : 'bg-slate-600'}`} />
                          </div>
                          <div className="flex-1 bg-white/5 border border-white/5 rounded-2.5xl p-5 hover:border-white/10 transition-all group">
                             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <p className="text-base font-bold text-white group-hover:text-primary-400 transition-colors leading-tight">
                                   {getHistoryLabel(log.status.trim())}
                                </p>
                                <div className="flex items-center gap-2 text-slate-500 text-xs font-mono">
                                   <Clock size={12} />
                                   {new Date(log.timestamp).toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </div>
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
               ) : (
                 <div className="py-12 text-center text-slate-500 italic space-y-4">
                    <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                       <ShieldCheck size={32} className="opacity-20" />
                    </div>
                    <p>El paquete ha sido registrado con éxito. Próximamente comenzará su tránsito operativo.</p>
                 </div>
               )}
            </div>

            <div className="text-center pt-8 opacity-40">
               <p className="text-xs font-bold uppercase tracking-[0.4em] text-slate-500">Seguridad Garantizada • LogisticaSPA Cloud</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PublicTrackingPage;
