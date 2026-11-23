import PageHeader from '../../../components/organisms/PageHeader';

export default function FleetHero({ vehiclesCount, driversCount, availability, maintenanceCount }) {
  return (
    <PageHeader
      title="Vehículos y conductores"
      description="Estado operativo, capacidad y asignación de conductores en una sola vista."
      stats={[
        { label: 'Vehículos', value: vehiclesCount },
        { label: 'Libres', value: `${availability}%`, tone: 'success' },
        { label: 'En taller', value: maintenanceCount, tone: maintenanceCount > 0 ? 'warning' : 'default' },
        { label: 'Conductores', value: driversCount },
      ]}
    />
  );
}
