import { Clock3, MapPinned, PackageSearch } from 'lucide-react';
import { useEffect, useState } from 'react';
import EmptyState from '../../../components/molecules/EmptyState';
import SectionLoader from '../../../components/molecules/SectionLoader';
import apiService from '../../../services/apiService';
function TrackingHistory({ packageId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await apiService.getTrackingLogs(packageId);
        setLogs(res.data || []);
      } catch (err) {
        console.error('Error cargando historial:', err);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [packageId]);

  if (loading) {
    return <SectionLoader eyebrow="Cargando historial" title="Preparando eventos de trazabilidad" description="Estamos recuperando los ultimos movimientos registrados para este paquete." className="min-h-[24rem]" />;
  }

  return (
    <div className="rounded-[1.8rem] border border-white/70 bg-white/88 p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700"><PackageSearch size={18} strokeWidth={2.2} /></div>
        <div>
          <p className="text-[0.64rem] uppercase tracking-[0.18em] text-surface-500">Seguimiento</p>
          <h3 className="font-display text-2xl font-semibold tracking-[-0.04em] text-surface-950">Historial de eventos</h3>
        </div>
      </div>

      {logs.length === 0 ? (
        <EmptyState eyebrow="Sin eventos" title="Todavia no hay trazabilidad registrada" description="Cuando el paquete comience a generar eventos, apareceran aqui en orden cronologico." className="min-h-[18rem] border-none bg-surface-50 shadow-none" />
      ) : (
        <div className="space-y-4">
          {logs.map((log, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="flex flex-col items-center"><div className="mt-1 h-3 w-3 rounded-full bg-primary-500" />{idx < logs.length - 1 && <div className="h-full w-0.5 min-h-12 bg-primary-200" />}</div>
              <div className="flex-1 rounded-[1.2rem] border border-surface-100 bg-surface-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-surface-900">{log.status}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-surface-500"><MapPinned size={13} strokeWidth={2.2} /> {log.lat}, {log.lng}</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-surface-400"><Clock3 size={13} strokeWidth={2.2} /> {new Date(log.timestamp).toLocaleString('es-BO')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TrackingHistory;