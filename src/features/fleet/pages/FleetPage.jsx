import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from '../../../components/atoms/Spinner';
import Badge from '../../../components/atoms/Badge';
import Button from '../../../components/atoms/Button';
import Avatar from '../../../components/atoms/Avatar';
import SearchInput from '../../../components/atoms/SearchInput';
import DataTable from '../../../components/organisms/DataTable';
import StatCard from '../../../components/molecules/StatCard';
import Modal from '../../../components/molecules/Modal';
import Pagination from '../../../components/molecules/Pagination';
import ActionMenu from '../../../components/molecules/ActionMenu';
import VehicleForm from '../components/VehicleForm';
import DriverForm from '../components/DriverForm';
import apiService from '../../../services/apiService';

// Datos mock para vehículos
const MOCK_VEHICLES = [
  { id: 'v-001', plate_number: 'INT-1234', brand: 'Volvo', model: 'FH16', year: 2023, type: 'truck', capacity_kg: 25000, status: 'active', driver: 'Juan Pérez' },
  { id: 'v-002', plate_number: 'ABC-5678', brand: 'Mercedes', model: 'Actros', year: 2022, type: 'truck', capacity_kg: 22000, status: 'active', driver: 'María López' },
  { id: 'v-003', plate_number: 'XYZ-9012', brand: 'Ford', model: 'Cargo', year: 2021, type: 'light_truck', capacity_kg: 12000, status: 'maintenance', driver: null },
  { id: 'v-004', plate_number: 'DEF-3456', brand: 'Scania', model: 'R450', year: 2023, type: 'trailer', capacity_kg: 30000, status: 'active', driver: 'Carlos Ruiz' },
  { id: 'v-005', plate_number: 'GHI-7890', brand: 'MAN', model: 'TGX', year: 2020, type: 'truck', capacity_kg: 20000, status: 'inactive', driver: null },
  { id: 'v-006', plate_number: 'JKL-2345', brand: 'Iveco', model: 'Stralis', year: 2022, type: 'van', capacity_kg: 8000, status: 'active', driver: 'Ana Flores' },
];

// Datos mock para conductores
const MOCK_DRIVERS = [
  { id: 'd-001', full_name: 'Juan Pérez', email: 'juan@transportes.bo', phone: '+591 70012345', license_number: 'LIC-123456', license_type: 'C', status: 'active' },
  { id: 'd-002', full_name: 'María López', email: 'maria@transportes.bo', phone: '+591 70054321', license_number: 'LIC-234567', license_type: 'C', status: 'active' },
  { id: 'd-003', full_name: 'Carlos Ruiz', email: 'carlos@transportes.bo', phone: '+591 70098765', license_number: 'LIC-345678', license_type: 'D', status: 'active' },
  { id: 'd-004', full_name: 'Ana Flores', email: 'ana@transportes.bo', phone: '+591 70011223', license_number: 'LIC-456789', license_type: 'B', status: 'active' },
  { id: 'd-005', full_name: 'Luis García', email: 'luis@transportes.bo', phone: '+591 70033445', license_number: 'LIC-567890', license_type: 'C', status: 'vacation' },
];

const statusMap = {
  active: { label: 'Activo', variant: 'success' },
  maintenance: { label: 'Mantenimiento', variant: 'warning' },
  inactive: { label: 'Inactivo', variant: 'danger' },
  vacation: { label: 'Vacaciones', variant: 'info' },
};

function FleetPage() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vehicles');
  const [searchTerm, setSearchTerm] = useState('');
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vRes, dRes] = await Promise.all([
          apiService.getVehicles(),
          apiService.getDrivers(),
        ]);
        setVehicles(vRes.data || MOCK_VEHICLES);
        setDrivers(dRes.data || MOCK_DRIVERS);
      } catch (err) {
        console.error('Error cargando flota:', err);
        setVehicles(MOCK_VEHICLES);
        setDrivers(MOCK_DRIVERS);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filtrar datos según búsqueda
  const filterData = (data) => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((item) =>
      Object.values(item).some((val) =>
        String(val).toLowerCase().includes(term)
      )
    );
  };

  const filteredVehicles = filterData(vehicles);
  const filteredDrivers = filterData(drivers);

  // Paginación
  const totalPagesVehicles = Math.ceil(filteredVehicles.length / itemsPerPage);
  const totalPagesDrivers = Math.ceil(filteredDrivers.length / itemsPerPage);
  
  const paginatedVehicles = filteredVehicles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const paginatedDrivers = filteredDrivers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const activeVehicles = vehicles.filter((v) => v.status === 'active').length;
  const inactiveVehicles = vehicles.filter((v) => v.status !== 'active').length;
  const availability = Math.round((activeVehicles / vehicles.length) * 100) || 0;

  // Columnas para vehículos
  const vehicleColumns = [
    { 
      key: 'vehicle', 
      label: 'Vehículo',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-2xl">
            {row.type === 'truck' ? '🚛' : row.type === 'van' ? '🚐' : '🚚'}
          </div>
          <div>
            <p className="font-semibold text-surface-900">{row.brand} {row.model}</p>
            <p className="text-xs text-surface-500">{row.plate_number}</p>
          </div>
        </div>
      ),
    },
    { key: 'plate_number', label: 'Placa' },
    { 
      key: 'type', 
      label: 'Tipo',
      render: (val) => (
        <span className="text-sm text-surface-600">
          {val === 'truck' ? 'Camión Pesado' : val === 'van' ? 'Furgoneta' : val === 'light_truck' ? 'Camión Ligero' : 'Tráiler'}
        </span>
      ),
    },
    {
      key: 'driver',
      label: 'Conductor Asignado',
      render: (val) => (
        val ? (
          <div className="flex items-center gap-2">
            <Avatar name={val} size="sm" />
            <span className="text-sm text-surface-700">{val}</span>
          </div>
        ) : (
          <span className="text-sm text-surface-400">Sin asignar</span>
        )
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (val) => <Badge variant={statusMap[val]?.variant || 'neutral'}>{statusMap[val]?.label || val}</Badge>,
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (_, row) => (
        <ActionMenu
          options={[
            { label: 'Ver detalles', icon: '👁️', onClick: () => console.log('Ver', row.id) },
            { label: 'Editar', icon: '✏️', onClick: () => console.log('Editar', row.id) },
            { label: row.status === 'active' ? 'Desactivar' : 'Activar', icon: row.status === 'active' ? '❌' : '✅', onClick: () => console.log('Toggle', row.id) },
            { label: 'Eliminar', icon: '🗑️', variant: 'danger', onClick: () => console.log('Eliminar', row.id) },
          ]}
        />
      ),
    },
  ];

  // Columnas para conductores
  const driverColumns = [
    {
      key: 'driver',
      label: 'Conductor',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.full_name} size="md" />
          <div>
            <p className="font-semibold text-surface-900">{row.full_name}</p>
            <p className="text-xs text-surface-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', label: 'Teléfono' },
    { key: 'license_number', label: 'Licencia' },
    {
      key: 'status',
      label: 'Estado',
      render: (val) => <Badge variant={statusMap[val]?.variant || 'neutral'}>{statusMap[val]?.label || val}</Badge>,
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (_, row) => (
        <ActionMenu
          options={[
            { label: 'Ver perfil', icon: '👤', onClick: () => console.log('Ver', row.id) },
            { label: 'Editar', icon: '✏️', onClick: () => console.log('Editar', row.id) },
            { label: 'Eliminar', icon: '🗑️', variant: 'danger', onClick: () => console.log('Eliminar', row.id) },
          ]}
        />
      ),
    },
  ];

  if (loading) return <Spinner size="lg" />;

  return (
    <div>
      {/* ========================================
          HEADER
      ======================================== */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 mb-1">
              Gestión de Flota
            </h1>
            <p className="text-surface-500 text-sm">
              Administra vehículos y conductores de tu flota
            </p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'vehicles' ? (
              <Button onClick={() => setShowVehicleForm(true)}>
                + Agregar Nuevo Vehículo
              </Button>
            ) : (
              <Button onClick={() => setShowDriverForm(true)}>
                + Registrar Nuevo Conductor
              </Button>
            )}
          </div>
        </div>

        {/* StatCards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <StatCard
            label="Vehículos Activos"
            value={activeVehicles}
            icon="✅"
          />
          <StatCard
            label="Vehículos Inactivos"
            value={inactiveVehicles}
            icon="❌"
          />
          <StatCard
            label="Disponibilidad"
            value={`${availability}%`}
            icon="📊"
          />
        </div>

        {/* Tabs + Búsqueda */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveTab('vehicles'); setCurrentPage(1); }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'vehicles'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-surface-600 hover:bg-surface-100'
              }`}
            >
              🚛 Vehículos
            </button>
            <button
              onClick={() => { setActiveTab('drivers'); setCurrentPage(1); }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'drivers'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-surface-600 hover:bg-surface-100'
              }`}
            >
              👤 Conductores
            </button>
          </div>
          <div className="w-80">
            <SearchInput
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder={`Buscar ${activeTab === 'vehicles' ? 'vehículo...' : 'conductor...'}`}
            />
          </div>
        </div>
      </div>

      {/* ========================================
          TABLA
      ======================================== */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-surface-200">
          <p className="text-sm text-surface-500">
            Mostrando {activeTab === 'vehicles' ? filteredVehicles.length : filteredDrivers.length}{' '}
            {activeTab === 'vehicles' ? 'vehículos' : 'conductores'}
          </p>
        </div>

        {activeTab === 'vehicles' ? (
          <>
            <DataTable columns={vehicleColumns} data={paginatedVehicles} />
            <div className="p-6 border-t border-surface-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPagesVehicles}
                totalItems={filteredVehicles.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          </>
        ) : (
          <>
            <DataTable columns={driverColumns} data={paginatedDrivers} />
            <div className="p-6 border-t border-surface-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPagesDrivers}
                totalItems={filteredDrivers.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          </>
        )}
      </div>

      {/* ========================================
          MODALES
      ======================================== */}
      <Modal
        isOpen={showVehicleForm}
        onClose={() => setShowVehicleForm(false)}
        title="Agregar Nuevo Vehículo"
      >
        <VehicleForm
          onSuccess={() => {
            setShowVehicleForm(false);
            // Aquí iría la lógica para recargar datos
          }}
          onCancel={() => setShowVehicleForm(false)}
        />
      </Modal>

      <Modal
        isOpen={showDriverForm}
        onClose={() => setShowDriverForm(false)}
        title="Registrar Nuevo Conductor"
      >
        <DriverForm
          onSuccess={() => {
            setShowDriverForm(false);
            // Aquí iría la lógica para recargar datos
          }}
          onCancel={() => setShowDriverForm(false)}
        />
      </Modal>
    </div>
  );
}

export default FleetPage;
