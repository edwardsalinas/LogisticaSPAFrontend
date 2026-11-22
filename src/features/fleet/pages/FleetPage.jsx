import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useVehicles, useDrivers } from '../../../hooks/queries/useFleet';
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
import Skeleton from '../../../components/atoms/Skeleton';

import DataTable from '../../../components/organisms/DataTable';
import { heroImages } from '../../../constants/heroImages';
import apiService from '../../../services/apiService';
import FleetHero from '../components/FleetHero';
import VehicleForm from '../components/VehicleForm';
// Estados de vehículo del backend (disponible, en_servicio, mantenimiento, retirado) y los de conductor
const statusMap = {
  disponible: { label: 'Disponible', variant: 'success' },
  en_servicio: { label: 'En servicio', variant: 'info' },
  mantenimiento: { label: 'Mantenimiento', variant: 'warning' },
  retirado: { label: 'Retirado', variant: 'danger' },
  active: { label: 'Activo', variant: 'success' },
  maintenance: { label: 'Mantenimiento', variant: 'warning' },
  inactive: { label: 'Inactivo', variant: 'danger' },
  vacation: { label: 'Vacaciones', variant: 'info' },
};

const AVAILABLE_STATUSES = ['disponible', 'en_servicio', 'active'];
const MAINTENANCE_STATUSES = ['mantenimiento', 'maintenance'];

const vehicleTypeLabel = {
  camion: 'Camion pesado',
  camion_ligero: 'Camion ligero',
  truck: 'Camion pesado',
  light_truck: 'Camion ligero',
  trailer: 'Trailer',
  van: 'Van operativa',
};

function FleetPage() {
  const [activeTab, setActiveTab] = useState('vehicles');
  const [searchTerm, setSearchTerm] = useState('');
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const { data: vData, isLoading: vLoading, isError: vError } = useVehicles();
  const { data: dData, isLoading: dLoading, isError: dError } = useDrivers();

  // Solo datos reales: si la API falla o no hay registros, las listas quedan vacías (sin datos de ejemplo)
  const vehicles = Array.isArray(vData) ? vData : [];
  const drivers = Array.isArray(dData) ? dData : [];
  const loading = vLoading || dLoading;

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

  const activeVehicles = vehicles.filter((v) => AVAILABLE_STATUSES.includes(v.status)).length;
  const maintenanceVehicles = vehicles.filter((v) => MAINTENANCE_STATUSES.includes(v.status)).length;
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
            <p className="text-xs uppercase tracking-[0.18em] text-surface-500">{vehicleTypeLabel[row.type] || row.type}</p>
          </div>
        </div>
      ),
    },
    { key: 'plate', label: 'Placa', render: (_, row) => <span>{row.plate_number || row.plate || '—'}</span> },
    { key: 'capacity_kg', label: 'Capacidad', render: (val) => <span>{Intl.NumberFormat('es-BO').format(val)} kg</span> },
    {
      key: 'driver',
      label: 'Conductor',
      render: (val) => val ? <div className="flex items-center gap-2"><Avatar name={val} size="sm" /><span className="text-sm text-surface-700">{val}</span></div> : <span className="text-sm text-surface-500">Sin asignar</span>,
    },
    { key: 'status', label: 'Estado', render: (val) => <Badge variant={statusMap[val]?.variant || 'neutral'} dot>{statusMap[val]?.label || val}</Badge> },
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
  ];

  return (
    <div className="space-y-8">
      {loading ? (
        <Skeleton className="h-[220px] w-full" />
      ) : (
        <FleetHero vehiclesCount={vehicles.length} driversCount={drivers.length} availability={availability} maintenanceCount={maintenanceVehicles} />
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.82fr)]">
        <div className="rounded-[1.8rem] border border-white/70 bg-white/88 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-surface-100 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div><p className="text-xs uppercase tracking-[0.24em] text-surface-500">Centro de datos</p><h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-surface-950">Vehiculos y conductores</h2></div>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="rounded-2xl bg-surface-100 p-1 flex"><button onClick={() => { setActiveTab('vehicles'); setCurrentPage(1); }} className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-all sm:flex-none ${activeTab === 'vehicles' ? 'bg-white text-primary-700 shadow-sm' : 'text-surface-500'}`}>Vehiculos</button><button onClick={() => { setActiveTab('drivers'); setCurrentPage(1); }} className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-all sm:flex-none ${activeTab === 'drivers' ? 'bg-white text-primary-700 shadow-sm' : 'text-surface-500'}`}>Conductores</button></div>
              <div className="w-full xl:w-80"><SearchInput value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} placeholder={`Buscar ${activeTab === 'vehicles' ? 'vehiculo o placa' : 'conductor o licencia'}`} /></div>
              {activeTab === 'vehicles' && <Button size="md" className="w-full sm:w-auto whitespace-nowrap" onClick={() => setShowVehicleForm(true)}>+ Agregar vehiculo</Button>}
            </div>
          </div>
          <div className="px-6 pt-5"><p className="text-sm text-surface-500">Mostrando {activeTab === 'vehicles' ? filteredVehicles.length : filteredDrivers.length} registros en la vista actual.</p></div>
          {activeTab === 'vehicles' ? <><DataTable columns={vehicleColumns} data={paginatedVehicles} loading={loading} /><div className="border-t border-surface-100 p-6"><Pagination currentPage={currentPage} totalPages={totalPagesVehicles} totalItems={filteredVehicles.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} /></div></> : <><DataTable columns={driverColumns} data={paginatedDrivers} loading={loading} /><div className="border-t border-surface-100 p-6"><Pagination currentPage={currentPage} totalPages={totalPagesDrivers} totalItems={filteredDrivers.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} /></div></>}
        </div>

        <aside className="space-y-5">
          <div className="rounded-[1.6rem] border border-white/70 bg-white/88 p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.24em] text-surface-500">Resumen de la flota</p>
            <div className="mt-5 space-y-3">
              {[
                { label: 'Vehiculos registrados', value: vehicles.length },
                { label: 'Disponibles o en servicio', value: activeVehicles },
                { label: 'En mantenimiento', value: maintenanceVehicles },
                { label: 'Conductores', value: drivers.length },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl border border-surface-100 bg-surface-50 px-4 py-3">
                  <p className="text-sm text-surface-600">{item.label}</p>
                  <p className="font-display text-xl font-semibold text-surface-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.6rem] border border-sky-100 bg-sky-50 p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-sky-700">Alta de conductores</p>
            <p className="mt-2 text-sm leading-relaxed text-surface-600">Los conductores se registran como usuarios con rol <strong>driver</strong> en Supabase Auth y sus datos se sincronizan automaticamente con la flota.</p>
          </div>
        </aside>
      </section>

      <Modal isOpen={showVehicleForm} onClose={() => setShowVehicleForm(false)} title="Agregar nuevo vehiculo"><VehicleForm onSuccess={() => { setShowVehicleForm(false); queryClient.invalidateQueries({ queryKey: ['vehicles'] }); }} onCancel={() => setShowVehicleForm(false)} /></Modal>
    </div>
  );
}

export default FleetPage;

