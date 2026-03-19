import { useState, useEffect } from 'react';
import Spinner from '../../../components/atoms/Spinner';
import Badge from '../../../components/atoms/Badge';
import DataTable from '../../../components/organisms/DataTable';
import StatCard from '../../../components/molecules/StatCard';
import api from '../../../services/api';

function FleetPage() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vehicles');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vRes, dRes] = await Promise.all([
          api.get('/fleet/vehicles'),
          api.get('/fleet/drivers'),
        ]);
        setVehicles(vRes.data || []);
        setDrivers(dRes.data || []);
      } catch (err) {
        console.error('Error cargando flota:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const vehicleColumns = [
    { key: 'plate_number', label: 'Placa' },
    { key: 'brand', label: 'Marca' },
    { key: 'model', label: 'Modelo' },
    { key: 'year', label: 'Año' },
    {
      key: 'status',
      label: 'Estado',
      render: (val) => (
        <Badge variant={val === 'active' ? 'success' : 'neutral'}>
          {val === 'active' ? 'Activo' : val || 'N/A'}
        </Badge>
      ),
    },
  ];

  const driverColumns = [
    { key: 'full_name', label: 'Nombre Completo' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Teléfono' },
    {
      key: 'role',
      label: 'Rol',
      render: (val) => <Badge variant="info">{val || 'driver'}</Badge>,
    },
  ];

  const activeVehicles = vehicles.filter((v) => v.status === 'active').length;
  const inactiveVehicles = vehicles.length - activeVehicles;
  const availability = vehicles.length > 0
    ? ((activeVehicles / vehicles.length) * 100).toFixed(1) + '%'
    : '0%';

  if (loading) return <Spinner size="lg" />;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard label="Vehículos Activos" value={activeVehicles} />
        <StatCard label="Vehículos Inactivos" value={inactiveVehicles} />
        <StatCard label="Disponibilidad Promedio" value={availability} />
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex border-b border-surface-200">
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'vehicles'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-surface-500 hover:text-surface-700'
              }`}
            onClick={() => setActiveTab('vehicles')}
          >
            Vehículos ({vehicles.length})
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'drivers'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-surface-500 hover:text-surface-700'
              }`}
            onClick={() => setActiveTab('drivers')}
          >
            Conductores ({drivers.length})
          </button>
        </div>

        <div className="p-6 border-b border-surface-200">
          <h2 className="text-lg font-semibold text-surface-800">
            Listado de {activeTab === 'vehicles' ? 'Flota' : 'Conductores'}
          </h2>
          <p className="text-sm text-surface-400 mt-1">
            Mostrando {activeTab === 'vehicles' ? vehicles.length : drivers.length} registros
          </p>
        </div>

        {activeTab === 'vehicles' ? (
          <DataTable columns={vehicleColumns} data={vehicles} />
        ) : (
          <DataTable columns={driverColumns} data={drivers} />
        )}
      </div>
    </div>
  );
}

export default FleetPage;
