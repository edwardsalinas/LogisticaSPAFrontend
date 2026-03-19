import { useState, useEffect } from 'react';
import Spinner from '../../../components/atoms/Spinner';
import api from '../../../services/api';

function TrackingHistory({ packageId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/tracking/logs/${packageId}`);
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

  if (loading) return <Spinner />;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="font-semibold text-surface-800 mb-4">Historial de Eventos</h3>

      {logs.length === 0 ? (
        <p className="text-sm text-surface-400">Sin eventos registrados para este paquete.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {logs.map((log, idx) => (
            <div key={idx} className="flex gap-3 items-start">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-primary-500 mt-1.5" />
                {idx < logs.length - 1 && (
                  <div className="w-0.5 h-12 bg-primary-200" />
                )}
              </div>
              <div className="pb-4 flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-surface-800">{log.status}</p>
                    <p className="text-xs text-surface-400 mt-0.5">
                      📍 {log.lat}, {log.lng}
                    </p>
                  </div>
                  <span className="text-xs text-surface-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('es-BO')}
                  </span>
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
