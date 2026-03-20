import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/atoms/Button';
import Badge from '../../../components/atoms/Badge';
import Spinner from '../../../components/atoms/Spinner';
import SearchInput from '../../../components/atoms/SearchInput';
import StatCard from '../../../components/molecules/StatCard';
import Modal from '../../../components/molecules/Modal';
import RouteForm from '../components/RouteForm';
import RouteCard from '../components/RouteCard';
import RouteInfoPanel from '../components/RouteInfoPanel';
import MapLegend from '../../../components/molecules/MapLegend';
import BaseMap from '../../../components/molecules/BaseMap';
import RoutePath from '../../../components/molecules/RoutePath';
import CheckpointMarker from '../../../components/molecules/CheckpointMarker';
import VehicleMarker from '../../../components/molecules/VehicleMarker';
import apiService from '../../../services/apiService';

// Datos mock para rutas (mientras el backend no tenga endpoint completo)
const MOCK_ROUTES = [
  {
    id: 'route-001',
    route_code: 'RT-001',
    origin: 'La Paz',
    destination: 'Oruro',
    driver_name: 'Juan Pérez',
    vehicle_brand: 'Volvo',
    plate_number: 'INT-1234',
    status: 'active',
    progress: 65,
    next_checkpoint: 'Centro Logístico El Alto',
    eta: '14:30',
    eta_minutes: 25,
    remaining_distance: 45.2,
    driver_phone: '+591 70012345',
    checkpoints: [
      { id: 'cp-001', name: 'Terminal La Paz', lat: -16.5000, lng: -68.1193, sequence_order: 1 },
      { id: 'cp-002', name: 'Checkpoint El Alto', lat: -16.5100, lng: -68.1500, sequence_order: 2 },
      { id: 'cp-003', name: 'Puesto Viacha', lat: -16.6500, lng: -68.3100, sequence_order: 3 },
      { id: 'cp-004', name: 'Terminal Oruro', lat: -17.9833, lng: -67.1500, sequence_order: 4 },
    ],
    vehicle_position: { lat: -16.5800, lng: -68.2500 },
  },
  {
    id: 'route-002',
    route_code: 'RT-002',
    origin: 'Santa Cruz',
    destination: 'Cochabamba',
    driver_name: 'María López',
    vehicle_brand: 'Mercedes',
    plate_number: 'ABC-5678',
    status: 'delayed',
    progress: 45,
    next_checkpoint: 'Sacaba',
    eta: '16:00',
    eta_minutes: 90,
    remaining_distance: 78.5,
    driver_phone: '+591 70054321',
    checkpoints: [
      { id: 'cp-005', name: 'Terminal Santa Cruz', lat: -17.7833, lng: -63.1821, sequence_order: 1 },
      { id: 'cp-006', name: 'Colomi', lat: -17.4167, lng: -66.2833, sequence_order: 2 },
      { id: 'cp-007', name: 'Terminal Cochabamba', lat: -17.3895, lng: -66.1568, sequence_order: 3 },
    ],
    vehicle_position: { lat: -17.5500, lng: -65.8000 },
  },
  {
    id: 'route-003',
    route_code: 'RT-003',
    origin: 'Sucre',
    destination: 'Potosí',
    driver_name: 'Carlos Ruiz',
    vehicle_brand: 'Ford',
    plate_number: 'XYW-9012',
    status: 'pending',
    progress: 0,
    next_checkpoint: 'Por asignar',
    eta: '—',
    eta_minutes: 0,
    remaining_distance: 0,
    driver_phone: '+591 70098765',
    checkpoints: [],
    vehicle_position: null,
  },
];

const statusMap = {
  active: { label: 'Activa', variant: 'success' },
  pending: { label: 'Pendiente', variant: 'warning' },
  completed: { label: 'Completada', variant: 'neutral' },
  delayed: { label: 'Retrasada', variant: 'danger' },
};

function RoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await apiService.getRoutes();
      // Combinar datos reales con mock para demostración
      const realRoutes = res.data || [];
      setRoutes(realRoutes.length > 0 ? realRoutes : MOCK_ROUTES);
    } catch (err) {
      console.error('Error cargando rutas:', err);
      setRoutes(MOCK_ROUTES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleCreateSuccess = () => {
    setShowForm(false);
    fetchRoutes();
  };

  // Filtrar rutas por búsqueda
  const filteredRoutes = routes.filter(
    (route) =>
      route.route_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.origin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.destination?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const totalRoutes = routes.length;
  const active = routes.filter((r) => r.status === 'active').length;
  const completed = routes.filter((r) => r.status === 'completed').length;
  const delayed = routes.filter((r) => r.status === 'delayed').length;

  if (loading) return <Spinner size="lg" />;

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* ========================================
          HEADER
      ======================================== */}
      <div className="mb-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 mb-1">
              Monitoreo de Rutas
            </h1>
            <p className="text-surface-500 text-sm">
              Seguimiento en tiempo real de rutas activas
            </p>
          </div>
          <Button onClick={() => setShowForm(true)}>+ Nueva Ruta</Button>
        </div>

        {/* StatCards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Total Rutas"
            value={totalRoutes}
            icon="🗺️"
          />
          <StatCard
            label="Rutas Activas"
            value={active}
            icon="🚛"
          />
          <StatCard
            label="Completadas"
            value={completed}
            icon="✅"
          />
        </div>
      </div>

      {/* ========================================
          LAYOUT DUAL (Lista + Mapa)
      ======================================== */}
      <div className="flex-1 flex gap-6 min-h-0">

        {/* ========================================
            PANEL IZQUIERDO - Lista de Rutas (30%)
        ======================================== */}
        <div className="w-[380px] flex-shrink-0 flex flex-col bg-white rounded-lg shadow-sm">
          {/* Header de lista */}
          <div className="p-4 border-b border-surface-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-surface-900">Rutas Activas</h2>
              <Badge variant="info">{filteredRoutes.length}</Badge>
            </div>
            <SearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por ID, conductor o destino..."
            />
          </div>

          {/* Lista scrolleable de RouteCards */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredRoutes.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                isSelected={selectedRoute?.id === route.id}
                onClick={() => setSelectedRoute(route)}
              />
            ))}
            {filteredRoutes.length === 0 && (
              <div className="text-center py-8 text-surface-400 text-sm">
                No se encontraron rutas
              </div>
            )}
          </div>
        </div>

        {/* ========================================
            PANEL DERECHO - Mapa (70%)
        ======================================== */}
        <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden relative">
          {selectedRoute ? (
            <>
              <BaseMap
                center={[
                  selectedRoute.vehicle_position?.lat || -16.5,
                  selectedRoute.vehicle_position?.lng || -68.15,
                ]}
                zoom={9}
                className="h-full w-full"
              >
                {/* Ruta y checkpoints */}
                {selectedRoute.checkpoints && selectedRoute.checkpoints.length > 0 && (
                  <>
                    <RoutePath checkpoints={selectedRoute.checkpoints} />
                    {selectedRoute.checkpoints.map((cp) => (
                      <CheckpointMarker key={cp.id} checkpoint={cp} />
                    ))}
                  </>
                )}

                {/* Posición del vehículo */}
                {selectedRoute.vehicle_position && (
                  <VehicleMarker
                    position={[selectedRoute.vehicle_position.lat, selectedRoute.vehicle_position.lng]}
                    title={selectedRoute.route_code}
                    subtitle={`${selectedRoute.driver_name} - ${selectedRoute.plate_number}`}
                  />
                )}
              </BaseMap>

              {/* Leyenda del mapa */}
              <MapLegend />

              {/* Panel de información overlay */}
              <RouteInfoPanel
                route={selectedRoute}
                onClose={() => setSelectedRoute(null)}
              />
            </>
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center text-surface-400">
              <div className="text-6xl mb-4">🗺️</div>
              <p className="text-lg font-medium text-surface-600 mb-2">
                Selecciona una ruta para ver el mapa
              </p>
              <p className="text-sm">
                Haz click en cualquier tarjeta de la lista
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal para crear ruta */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Crear Ruta de Transporte"
      >
        <RouteForm onSuccess={handleCreateSuccess} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}

export default RoutesPage;
