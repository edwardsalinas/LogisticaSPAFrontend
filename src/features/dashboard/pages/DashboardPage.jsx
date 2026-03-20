import { useState, useEffect } from 'react';
import StatCard from '../../../components/molecules/StatCard';
import Spinner from '../../../components/atoms/Spinner';
import Badge from '../../../components/atoms/Badge';
import Avatar from '../../../components/atoms/Avatar';
import ProgressBar from '../../../components/atoms/ProgressBar';
import apiService from '../../../services/apiService';

// Datos mock para la tabla de despachos (mientras el backend no tenga endpoint)
const MOCK_SHIPMENTS = [
  {
    id: '#LOG-7842',
    destination: 'La Paz → Oruro',
    operator: { name: 'Juan Pérez', initials: 'JP' },
    status: 'in_transit',
    progress: 65,
  },
  {
    id: '#LOG-7843',
    destination: 'Santa Cruz → Cochabamba',
    operator: { name: 'María López', initials: 'ML' },
    status: 'delivered',
    progress: 100,
  },
  {
    id: '#LOG-7844',
    destination: 'Sucre → Potosí',
    operator: { name: 'Carlos Ruiz', initials: 'CR' },
    status: 'pending',
    progress: 15,
  },
  {
    id: '#LOG-7845',
    destination: 'Tarija → Santa Cruz',
    operator: { name: 'Ana Flores', initials: 'AF' },
    status: 'in_transit',
    progress: 45,
  },
  {
    id: '#LOG-7846',
    destination: 'Oruro → La Paz',
    operator: { name: 'Luis García', initials: 'LG' },
    status: 'delayed',
    progress: 30,
  },
];

const STATUS_MAP = {
  pending: { label: 'Pendiente', variant: 'warning' },
  in_transit: { label: 'En Tránsito', variant: 'info' },
  delivered: { label: 'Entregado', variant: 'success' },
  delayed: { label: 'Retrasado', variant: 'danger' },
};

function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentPackages, setRecentPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pkgRes, routesRes, vehiclesRes, driversRes] = await Promise.all([
          apiService.getPackages(),
          apiService.getRoutes(),
          apiService.getVehicles(),
          apiService.getDrivers(),
        ]);

        const packages = pkgRes.data || [];
        const routes = routesRes.data || [];
        const vehicles = vehiclesRes.data || [];
        const drivers = driversRes.data || [];

        setStats({
          totalPackages: packages.length,
          activeRoutes: routes.filter((r) => r.status === 'active').length,
          totalVehicles: vehicles.length,
          totalDrivers: drivers.length,
        });

        setRecentPackages(packages.slice(0, 5));
      } catch (err) {
        console.error('Error cargando dashboard:', err);
        // Usar datos mock si falla la API
        setStats({ totalPackages: 24, activeRoutes: 8, totalVehicles: 42, totalDrivers: 38 });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Spinner size="lg" />;

  return (
    <div>
      {/* ========================================
          HEADER
      ======================================== */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900 mb-1">
          Resumen Operativo
        </h1>
        <p className="text-surface-500 text-sm">
          Vista general de tu operación logística en tiempo real
        </p>
      </div>

      {/* ========================================
          STATCARDS (4 columnas)
      ======================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Entregas Hoy"
          value={stats?.totalPackages || 0}
          icon="📦"
          change={12.5}
          changeLabel="vs ayer"
        />
        <StatCard
          label="En Tránsito"
          value={stats?.activeRoutes || 0}
          icon="🚛"
          change={8.2}
          changeLabel="vs ayer"
        />
        <StatCard
          label="Distancia Total"
          value="8,420 km"
          icon="📍"
          change={5.2}
          changeLabel="vs ayer"
        />
        <StatCard
          label="SLA Cumplido"
          value="98.4%"
          icon="✅"
          change={2.1}
          changeLabel="vs ayer"
        />
      </div>

      {/* ========================================
          GRID INFERIOR (5 columnas: 3 tabla + 2 mapa)
      ======================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ========================================
            COLUMNA IZQUIERDA - Tabla de Despachos (3 cols)
        ======================================== */}
        <div className="lg:col-span-3 bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-between p-6 border-b border-surface-200">
            <div>
              <h2 className="text-lg font-semibold text-surface-900">Últimos Despachos</h2>
              <p className="text-sm text-surface-400 mt-1">Mostrando {MOCK_SHIPMENTS.length} despachos recientes</p>
            </div>
            <div className="flex gap-2">
              <button className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                Ver todos
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50">
                <tr>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wide px-6 py-3">
                    ID Pedido
                  </th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wide px-6 py-3">
                    Destino
                  </th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wide px-6 py-3">
                    Operador
                  </th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wide px-6 py-3">
                    Estado
                  </th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wide px-6 py-3">
                    Progreso
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {MOCK_SHIPMENTS.map((shipment) => {
                  const statusConfig = STATUS_MAP[shipment.status] || { label: shipment.status, variant: 'neutral' };
                  return (
                    <tr key={shipment.id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-surface-900">{shipment.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-surface-600">{shipment.destination}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Avatar name={shipment.operator.name} size="sm" />
                          <span className="text-sm text-surface-700">{shipment.operator.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-24">
                          <ProgressBar
                            value={shipment.progress}
                            size="sm"
                            variant={
                              shipment.progress === 100 ? 'success' :
                              shipment.progress >= 50 ? 'primary' : 'warning'
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================
            COLUMNA DERECHA - Mapa en Vivo (2 cols)
        ======================================== */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-surface-200">
            <div>
              <h2 className="text-lg font-semibold text-surface-900">Mapa en Vivo</h2>
              <p className="text-sm text-surface-400 mt-1">Unidades activas en tiempo real</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-xs font-medium text-success">Active</span>
            </div>
          </div>

          <div className="relative h-[400px] bg-surface-100">
            {/* Mapa placeholder - se integrará con BaseMap después */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🗺️</div>
                <p className="text-surface-500 text-sm mb-2">Mapa de vehículos activos</p>
                <p className="text-surface-400 text-xs">
                  {stats?.totalVehicles || 0} vehículos en ruta
                </p>
              </div>
            </div>

            {/* Overlay con stats */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🚛</div>
                    <div>
                      <p className="text-lg font-bold text-surface-900">{stats?.totalVehicles || 0}</p>
                      <p className="text-xs text-surface-500">Vehículos Activos</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-success" />
                      <span className="text-xs text-surface-600">En hora</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-warning" />
                      <span className="text-xs text-surface-600">Retraso</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
