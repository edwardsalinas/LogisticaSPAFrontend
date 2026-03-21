import { useEffect, useState } from 'react';
import {
  Eye,
  Pencil,
  Power,
  ShieldCheck,
  Trash2,
  Truck,
  UserRound,
  Wrench,
} from 'lucide-react';
import Avatar from '../../../components/atoms/Avatar';
import Badge from '../../../components/atoms/Badge';
import Button from '../../../components/atoms/Button';
import SearchInput from '../../../components/atoms/SearchInput';
import ActionMenu from '../../../components/molecules/ActionMenu';
import Modal from '../../../components/molecules/Modal';
import Pagination from '../../../components/molecules/Pagination';

import DataTable from '../../../components/organisms/DataTable';
import PageSkeleton from '../../../components/organisms/PageSkeleton';
import { heroImages } from '../../../constants/heroImages';
import apiService from '../../../services/apiService';
import FleetHero from '../components/FleetHero';
import DriverForm from '../components/DriverForm';
import VehicleForm from '../components/VehicleForm';
const MOCK_VEHICLES = [
  { id: 'v-001', plate_number: 'INT-1234', brand: 'Volvo', model: 'FH16', year: 2023, type: 'truck', capacity_kg: 25000, status: 'active', driver: 'Juan Perez' },
  { id: 'v-002', plate_number: 'ABC-5678', brand: 'Mercedes', model: 'Actros', year: 2022, type: 'truck', capacity_kg: 22000, status: 'active', driver: 'Maria Lopez' },
  { id: 'v-003', plate_number: 'XYZ-9012', brand: 'Ford', model: 'Cargo', year: 2021, type: 'light_truck', capacity_kg: 12000, status: 'maintenance', driver: null },
  { id: 'v-004', plate_number: 'DEF-3456', brand: 'Scania', model: 'R450', year: 2023, type: 'trailer', capacity_kg: 30000, status: 'active', driver: 'Carlos Ruiz' },
  { id: 'v-005', plate_number: 'GHI-7890', brand: 'MAN', model: 'TGX', year: 2020, type: 'truck', capacity_kg: 20000, status: 'inactive', driver: null },
  { id: 'v-006', plate_number: 'JKL-2345', brand: 'Iveco', model: 'Stralis', year: 2022, type: 'van', capacity_kg: 8000, status: 'active', driver: 'Ana Flores' },
];

const MOCK_DRIVERS = [
  { id: 'd-001', full_name: 'Juan Perez', email: 'juan@transportes.bo', phone: '+591 70012345', license_number: 'LIC-123456', license_type: 'C', status: 'active' },
  { id: 'd-002', full_name: 'Maria Lopez', email: 'maria@transportes.bo', phone: '+591 70054321', license_number: 'LIC-234567', license_type: 'C', status: 'active' },
  { id: 'd-003', full_name: 'Carlos Ruiz', email: 'carlos@transportes.bo', phone: '+591 70098765', license_number: 'LIC-345678', license_type: 'D', status: 'active' },
  { id: 'd-004', full_name: 'Ana Flores', email: 'ana@transportes.bo', phone: '+591 70011223', license_number: 'LIC-456789', license_type: 'B', status: 'active' },
  { id: 'd-005', full_name: 'Luis Garcia', email: 'luis@transportes.bo', phone: '+591 70033445', license_number: 'LIC-567890', license_type: 'C', status: 'vacation' },
];

const statusMap = {
  active: { label: 'Activo', variant: 'success' },
  maintenance: { label: 'Mantenimiento', variant: 'warning' },
  inactive: { label: 'Inactivo', variant: 'danger' },
  vacation: { label: 'Vacaciones', variant: 'info' },
};

const vehicleTypeLabel = {
  truck: 'Camion pesado',
  light_truck: 'Camion ligero',
  trailer: 'Trailer',
  van: 'Van operativa',
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vRes, dRes] = await Promise.all([apiService.getVehicles(), apiService.getDrivers()]);
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

  const filterData = (data) => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((item) => Object.values(item).some((val) => String(val).toLowerCase().includes(term)));
  };

  const filteredVehicles = filterData(vehicles);
  const filteredDrivers = filterData(drivers);
  const totalPagesVehicles = Math.ceil(filteredVehicles.length / itemsPerPage) || 1;
  const totalPagesDrivers = Math.ceil(filteredDrivers.length / itemsPerPage) || 1;
  const paginatedVehicles = filteredVehicles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginatedDrivers = filteredDrivers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const activeVehicles = vehicles.filter((v) => v.status === 'active').length;
  const maintenanceVehicles = vehicles.filter((v) => v.status === 'maintenance').length;
  const availability = Math.round((activeVehicles / vehicles.length) * 100) || 0;

  const vehicleColumns = [
    {
      key: 'vehicle',
      label: 'Vehiculo',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
            <Truck size={18} strokeWidth={2.1} />
          </div>
          <div>
            <p className="font-semibold text-surface-900">{row.brand} {row.model}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-surface-400">{vehicleTypeLabel[row.type] || row.type}</p>
          </div>
        </div>
      ),
    },
    { key: 'plate_number', label: 'Placa' },
    { key: 'capacity_kg', label: 'Capacidad', render: (val) => <span>{Intl.NumberFormat('es-BO').format(val)} kg</span> },
    {
      key: 'driver',
      label: 'Conductor',
      render: (val) => val ? <div className="flex items-center gap-2"><Avatar name={val} size="sm" /><span className="text-sm text-surface-700">{val}</span></div> : <span className="text-sm text-surface-400">Sin asignar</span>,
    },
    { key: 'status', label: 'Estado', render: (val) => <Badge variant={statusMap[val]?.variant || 'neutral'} dot>{statusMap[val]?.label || val}</Badge> },
    {
      key: 'actions',
      label: 'Acciones',
      render: (_, row) => <ActionMenu options={[{ label: 'Ver detalles', icon: Eye, onClick: () => console.log('Ver', row.id) }, { label: 'Editar', icon: Pencil, onClick: () => console.log('Editar', row.id) }, { label: row.status === 'active' ? 'Desactivar' : 'Activar', icon: Power, onClick: () => console.log('Toggle', row.id) }, { label: 'Eliminar', icon: Trash2, variant: 'danger', onClick: () => console.log('Eliminar', row.id) }]} />,
    },
  ];

  const driverColumns = [
    {
      key: 'driver',
      label: 'Conductor',
      render: (_, row) => <div className="flex items-center gap-3"><Avatar name={row.full_name} size="md" /><div><p className="font-semibold text-surface-900">{row.full_name}</p><p className="text-xs text-surface-500">{row.email}</p></div></div>,
    },
    { key: 'phone', label: 'Telefono' },
    { key: 'license_number', label: 'Licencia' },
    { key: 'status', label: 'Estado', render: (val) => <Badge variant={statusMap[val]?.variant || 'neutral'} dot>{statusMap[val]?.label || val}</Badge> },
    {
      key: 'actions',
      label: 'Acciones',
      render: (_, row) => <ActionMenu options={[{ label: 'Ver perfil', icon: UserRound, onClick: () => console.log('Ver', row.id) }, { label: 'Editar', icon: Pencil, onClick: () => console.log('Editar', row.id) }, { label: 'Eliminar', icon: Trash2, variant: 'danger', onClick: () => console.log('Eliminar', row.id) }]} />,
    },
  ];

  if (loading) return <PageSkeleton stats={4} layout="split" />;

  return (
    <div className="space-y-8">
      <FleetHero vehiclesCount={vehicles.length} driversCount={drivers.length} availability={availability} maintenanceCount={maintenanceVehicles} />

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.82fr)]">
        <div className="rounded-[1.8rem] border border-white/70 bg-white/88 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-surface-100 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div><p className="text-[0.64rem] uppercase tracking-[0.24em] text-surface-500">Centro de datos</p><h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-surface-950">Vehiculos y conductores</h2></div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="rounded-2xl bg-surface-100 p-1"><button onClick={() => { setActiveTab('vehicles'); setCurrentPage(1); }} className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'vehicles' ? 'bg-white text-primary-700 shadow-sm' : 'text-surface-500'}`}>Vehiculos</button><button onClick={() => { setActiveTab('drivers'); setCurrentPage(1); }} className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'drivers' ? 'bg-white text-primary-700 shadow-sm' : 'text-surface-500'}`}>Conductores</button></div>
              <div className="w-full lg:w-80"><SearchInput value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} placeholder={`Buscar ${activeTab === 'vehicles' ? 'vehiculo, placa o marca' : 'conductor, email o licencia'}`} /></div>
              {activeTab === 'vehicles' ? <Button size="md" onClick={() => setShowVehicleForm(true)}>+ Agregar vehiculo</Button> : <Button size="md" onClick={() => setShowDriverForm(true)}>+ Registrar conductor</Button>}
            </div>
          </div>
          <div className="px-6 pt-5"><p className="text-sm text-surface-500">Mostrando {activeTab === 'vehicles' ? filteredVehicles.length : filteredDrivers.length} registros en la vista actual.</p></div>
          {activeTab === 'vehicles' ? <><DataTable columns={vehicleColumns} data={paginatedVehicles} /><div className="border-t border-surface-100 p-6"><Pagination currentPage={currentPage} totalPages={totalPagesVehicles} totalItems={filteredVehicles.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} /></div></> : <><DataTable columns={driverColumns} data={paginatedDrivers} /><div className="border-t border-surface-100 p-6"><Pagination currentPage={currentPage} totalPages={totalPagesDrivers} totalItems={filteredDrivers.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} /></div></>}
        </div>

        <aside className="space-y-5">
          <div className="rounded-[1.6rem] border border-white/70 bg-white/88 p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl"><p className="text-[0.64rem] uppercase tracking-[0.24em] text-surface-500">Actividad reciente</p><div className="mt-5 space-y-4"><div className="rounded-2xl border border-surface-100 bg-surface-50 p-4"><p className="text-sm font-semibold text-surface-900">Unidad #INT-1234 liberada para nueva ruta</p><p className="mt-1 text-xs text-surface-500">Hace 12 minutos</p></div><div className="rounded-2xl border border-surface-100 bg-surface-50 p-4"><p className="text-sm font-semibold text-surface-900">Mantenimiento preventivo para FL-2075</p><p className="mt-1 text-xs text-surface-500">Programado para manana</p></div></div></div>
          <div className="rounded-[1.6rem] bg-[linear-gradient(135deg,#0b4ea2_0%,#137fec_100%)] p-6 text-white shadow-[0_24px_54px_-36px_rgba(11,78,162,0.75)]"><p className="text-[0.64rem] uppercase tracking-[0.24em] text-sky-100/70">Consumo operativo</p><p className="mt-3 font-display text-4xl font-semibold tracking-[-0.05em]">4,280</p><p className="mt-1 text-sm text-sky-100/75">Litros de combustible en los ultimos 30 dias</p><div className="mt-6 rounded-2xl border border-white/14 bg-white/10 p-4 text-sm font-semibold">Eficiencia: +12% frente al periodo anterior</div></div>
          <div className="rounded-[1.6rem] border border-sky-100 bg-sky-50 p-6"><p className="text-[0.64rem] uppercase tracking-[0.24em] text-sky-700">Soporte</p><h3 className="mt-2 font-display text-xl font-semibold tracking-[-0.04em] text-primary-700">Operacion 24/7</h3><p className="mt-2 text-sm leading-relaxed text-surface-600">Accede a soporte prioritario para incidencias en ruta, mantenimiento o asignacion de unidades.</p><button className="mt-5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-primary-700 shadow-sm transition-colors hover:bg-sky-100">Contactar soporte</button></div>
        </aside>
      </section>

      <Modal isOpen={showVehicleForm} onClose={() => setShowVehicleForm(false)} title="Agregar nuevo vehiculo"><VehicleForm onSuccess={() => setShowVehicleForm(false)} onCancel={() => setShowVehicleForm(false)} /></Modal>
      <Modal isOpen={showDriverForm} onClose={() => setShowDriverForm(false)} title="Registrar nuevo conductor"><DriverForm onSuccess={() => setShowDriverForm(false)} onCancel={() => setShowDriverForm(false)} /></Modal>
    </div>
  );
}

export default FleetPage;

