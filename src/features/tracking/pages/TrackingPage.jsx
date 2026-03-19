import { useState, useEffect } from 'react';
import Button from '../../../components/atoms/Button';
import Spinner from '../../../components/atoms/Spinner';
import Modal from '../../../components/molecules/Modal';
import TrackingForm from '../components/TrackingForm';
import TrackingHistory from '../components/TrackingHistory';
import api from '../../../services/api';

function TrackingPage() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState(null);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await api.get('/logistics/packages');
      setPackages(res.data || []);
    } catch (err) {
      console.error('Error cargando paquetes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleRegisterSuccess = () => {
    setShowForm(false);
    setSelectedPackageId((prev) => prev);
  };

  if (loading) return <Spinner size="lg" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-surface-800">Registro de Trazabilidad</h2>
          <p className="text-sm text-surface-400 mt-1">Registra y consulta eventos de seguimiento de paquetes</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Registrar Evento</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-semibold text-surface-800 mb-3 text-sm uppercase tracking-wide">Paquetes</h3>
          <div className="flex flex-col gap-1 max-h-[600px] overflow-y-auto">
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackageId(pkg.id)}
                className={`text-left p-3 rounded-lg transition-colors text-sm ${selectedPackageId === pkg.id
                  ? 'bg-primary-50 text-primary-700 border border-primary-200'
                  : 'hover:bg-surface-50 text-surface-700'
                  }`}
              >
                <span className="font-medium">{pkg.tracking_code}</span>
                <span className="block text-xs text-surface-400 mt-0.5">
                  {pkg.origen} → {pkg.destino}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedPackageId ? (
            <TrackingHistory packageId={selectedPackageId} />
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <p className="text-surface-400">Selecciona un paquete para ver su historial de trazabilidad</p>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Registrar Evento de Seguimiento"
      >
        <TrackingForm
          packages={packages}
          onSuccess={handleRegisterSuccess}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}

export default TrackingPage;
