import { useState, useEffect } from 'react';
import Badge from '../../../components/atoms/Badge';
import Spinner from '../../../components/atoms/Spinner';
import api from '../../../services/api';

const statusSteps = [
  { key: 'pending', label: 'Recibido en Almacén', description: 'Procesado y listo para salida' },
  { key: 'assigned', label: 'Asignado a Ruta', description: 'Paquete asignado a una ruta de transporte' },
  { key: 'in_transit', label: 'En Tránsito', description: 'Hacia centro de distribución local' },
  { key: 'delivered', label: 'Entregado', description: 'Confirmación de entrega realizada' },
];

function PackageDetail({ pkg }) {
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get(`/tracking/logs/${pkg.id}`);
        setLogs(res.data || []);
      } catch (err) {
        console.error('Error cargando historial:', err);
        setLogs([]);
      } finally {
        setLoadingLogs(false);
      }
    };
    fetchLogs();
  }, [pkg.id]);

  const currentStepIndex = statusSteps.findIndex((s) => s.key === pkg.status);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-sm text-surface-400">Código</span>
          <p className="font-semibold text-surface-800">{pkg.tracking_code}</p>
        </div>
        <div>
          <span className="text-sm text-surface-400">Estado</span>
          <p><Badge variant={pkg.status === 'delivered' ? 'success' : 'info'}>{pkg.status}</Badge></p>
        </div>
        <div>
          <span className="text-sm text-surface-400">Origen</span>
          <p className="text-surface-700">{pkg.origen}</p>
        </div>
        <div>
          <span className="text-sm text-surface-400">Destino</span>
          <p className="text-surface-700">{pkg.destino}</p>
        </div>
        <div>
          <span className="text-sm text-surface-400">Peso</span>
          <p className="text-surface-700">{pkg.peso} kg</p>
        </div>
        <div>
          <span className="text-sm text-surface-400">Descripción</span>
          <p className="text-surface-700">{pkg.description || '—'}</p>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-surface-800 mb-4">Estado del Envío</h4>
        <div className="flex flex-col gap-1">
          {statusSteps.map((step, idx) => {
            const isCompleted = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div key={step.key} className="flex gap-3 items-start">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-3 h-3 rounded-full mt-1.5 ${
                      isCompleted ? 'bg-primary-500' : 'bg-surface-300'
                    } ${isCurrent ? 'ring-4 ring-primary-100' : ''}`}
                  />
                  {idx < statusSteps.length - 1 && (
                    <div className={`w-0.5 h-8 ${isCompleted ? 'bg-primary-500' : 'bg-surface-200'}`} />
                  )}
                </div>
                <div className="pb-4">
                  <p className={`text-sm font-medium ${isCompleted ? 'text-surface-800' : 'text-surface-400'}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-surface-400">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-surface-800 mb-3">Historial de Trazabilidad</h4>
        {loadingLogs ? (
          <Spinner size="sm" />
        ) : logs.length === 0 ? (
          <p className="text-sm text-surface-400">Sin eventos registrados.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {logs.map((log, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-surface-50 rounded-md">
                <div>
                  <p className="text-sm font-medium text-surface-700">{log.status}</p>
                  <p className="text-xs text-surface-400">
                    📍 {log.lat}, {log.lng}
                  </p>
                </div>
                <span className="text-xs text-surface-400">
                  {new Date(log.timestamp).toLocaleString('es-BO')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PackageDetail;
