import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../../../components/atoms/Button';
import Badge from '../../../components/atoms/Badge';
import Spinner from '../../../components/atoms/Spinner';
import ProgressBar from '../../../components/atoms/ProgressBar';
import InfoCard from '../../../components/molecules/InfoCard';
import StatusTimeline from '../../../components/molecules/StatusTimeline';
import BaseMap from '../../../components/molecules/BaseMap';
import VehicleMarker from '../../../components/molecules/VehicleMarker';
import apiService from '../../../services/apiService';

/**
 * PackageDetailPage - Página completa de detalle de envío
 * Muestra información completa del paquete, mapa en vivo y cronograma
 */
function PackageDetailPage() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pkg, setPkg] = useState(null);
  const [trackingLogs, setTrackingLogs] = useState([]);

  // Datos mock para demostración (mientras no haya API real)
  const MOCK_PACKAGE = {
    id: packageId,
    tracking_code: 'SPA-7749202394',
    origen: 'La Paz',
    destino: 'Oruro',
    status: 'in_transit',
    peso: 45.5,
    description: 'Equipos electrónicos',
    priority: 'Express',
    sender: {
      name: 'ElectroBolivia S.R.L.',
      address: 'Av. 16 de Julio 1234, La Paz',
      contact: '+591 2 2201234',
    },
    receiver: {
      name: 'Comercializadora El Alto',
      address: 'C. Comercio 567, El Alto',
      contact: '+591 2 2805678',
    },
    dimensions: {
      length: 60,
      width: 40,
      height: 40,
    },
    content_type: 'Equipos electrónicos',
    current_location: {
      lat: -16.5800,
      lng: -68.2500,
    },
    estimated_delivery: '2026-03-20 16:00',
    progress: 65,
  };

  const MOCK_TIMELINE = [
    {
      label: 'Recolectado',
      date: '19 Mar, 08:30',
      location: 'La Paz - Almacén Central',
      completed: true,
      active: false,
    },
    {
      label: 'Procesado',
      date: '19 Mar, 10:15',
      location: 'Centro de Distribución',
      completed: true,
      active: false,
    },
    {
      label: 'En Tránsito',
      date: '19 Mar, 11:00',
      location: 'Ruta La Paz-Oruro',
      completed: false,
      active: true,
    },
    {
      label: 'Llegada a Destino',
      date: '—',
      location: 'Oruro - Terminal',
      completed: false,
      active: false,
    },
    {
      label: 'Entregado',
      date: '—',
      location: '—',
      completed: false,
      active: false,
    },
  ];

  useEffect(() => {
    const fetchPackageData = async () => {
      setLoading(true);
      try {
        // Intentar obtener datos reales (fallback a mock)
        const [pkgRes, logsRes] = await Promise.all([
          apiService.getPackages(),
          apiService.getTrackingLogs(packageId),
        ]);

        const packages = pkgRes.data || [];
        const foundPkg = packages.find((p) => p.id === packageId);

        setPkg(foundPkg || MOCK_PACKAGE);
        setTrackingLogs(logsRes.data || []);
      } catch (err) {
        console.error('Error cargando paquete:', err);
        setPkg(MOCK_PACKAGE);
      } finally {
        setLoading(false);
      }
    };

    fetchPackageData();
  }, [packageId]);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-xl font-semibold text-surface-800 mb-2">
          No se encontró el paquete
        </h2>
        <Button onClick={() => navigate('/logistics/packages')}>
          Volver a Paquetes
        </Button>
      </div>
    );
  }

  const statusConfig = {
    pending: { label: 'Pendiente', variant: 'warning' },
    in_transit: { label: 'En Tránsito', variant: 'info' },
    delivered: { label: 'Entregado', variant: 'success' },
    delayed: { label: 'Retrasado', variant: 'danger' },
  };

  const status = statusConfig[pkg.status] || { label: pkg.status, variant: 'neutral' };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col overflow-hidden">
      {/* ========================================
          HEADER
      ======================================== */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="secondary" size="sm" onClick={() => navigate('/logistics/packages')}>
              ← Volver
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-surface-900">
                  #{pkg.tracking_code}
                </h1>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <p className="text-sm text-surface-500 mt-1">
                {pkg.origen} → {pkg.destino}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">
              📤 Compartir
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              📄 Descargar PDF
            </Button>
          </div>
        </div>
      </div>

      {/* ========================================
          GRID DE INFORMACIÓN (2+2 layout)
      ======================================== */}
      <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Remitente */}
        <InfoCard title="Remitente" icon="📤">
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-surface-900">{pkg.sender?.name || pkg.origen}</p>
            <p className="text-surface-600">{pkg.sender?.address || 'Dirección no registrada'}</p>
            <p className="text-surface-500">{pkg.sender?.contact || '—'}</p>
          </div>
        </InfoCard>

        {/* Destinatario */}
        <InfoCard title="Destinatario" icon="📥">
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-surface-900">{pkg.receiver?.name || pkg.destino}</p>
            <p className="text-surface-600">{pkg.receiver?.address || 'Dirección no registrada'}</p>
            <p className="text-surface-500">{pkg.receiver?.contact || '—'}</p>
          </div>
        </InfoCard>

        {/* Especificaciones Técnicas (4 mini-cards) */}
        <InfoCard title="Especificaciones" icon="📦">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-surface-500 uppercase">Peso Total</p>
              <p className="text-lg font-bold text-surface-900">{pkg.peso || 0} kg</p>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase">Dimensiones</p>
              <p className="text-sm font-semibold text-surface-900">
                {pkg.dimensions?.length || 60}x{pkg.dimensions?.width || 40}x{pkg.dimensions?.height || 40} cm
              </p>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase">Contenido</p>
              <p className="text-sm font-semibold text-surface-900 truncate">
                {pkg.content_type || pkg.description || 'General'}
              </p>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase">Prioridad</p>
              <Badge variant={pkg.priority === 'Express' ? 'danger' : 'info'}>
                {pkg.priority || 'Estándar'}
              </Badge>
            </div>
          </div>
        </InfoCard>

        {/* Resumen de Entrega */}
        <InfoCard title="Resumen de Entrega" icon="📊">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-surface-500 uppercase">Fecha Estimada</p>
              <p className="text-sm font-bold text-surface-900">
                {pkg.estimated_delivery || '20 Mar, 16:00'}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-surface-500 uppercase">Progreso</p>
                <p className="text-xs font-bold text-surface-900">{pkg.progress || 65}%</p>
              </div>
              <ProgressBar value={pkg.progress || 65} size="md" variant="primary" />
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase">Estado Actual</p>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
          </div>
        </InfoCard>
      </div>

      {/* ========================================
          SECCIÓN CENTRAL: Mapa + Info
      ======================================== */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0 mb-4">
        {/* Mapa de ubicación en tiempo real */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-surface-200">
            <div>
              <h2 className="font-semibold text-surface-900">Ubicación en Tiempo Real</h2>
              <p className="text-sm text-surface-400 mt-0.5">
                Última actualización: hace 2 minutos
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-xs font-medium text-success">En Vivo</span>
            </div>
          </div>
          <div className="h-full min-h-[300px]">
            <BaseMap
              center={[pkg.current_location?.lat || -16.5, pkg.current_location?.lng || -68.15]}
              zoom={10}
              className="h-full w-full"
            >
              {pkg.current_location && (
                <VehicleMarker
                  position={[pkg.current_location.lat, pkg.current_location.lng]}
                  title={pkg.tracking_code}
                  subtitle="Ubicación actual"
                />
              )}
            </BaseMap>
          </div>
        </div>

        {/* Timeline / Cronograma */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-surface-200">
            <h2 className="font-semibold text-surface-900">Cronograma</h2>
            <p className="text-sm text-surface-400 mt-0.5">
              Seguimiento paso a paso
            </p>
          </div>
          <div className="p-4 overflow-y-auto max-h-[400px]">
            <StatusTimeline steps={MOCK_TIMELINE} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PackageDetailPage;
