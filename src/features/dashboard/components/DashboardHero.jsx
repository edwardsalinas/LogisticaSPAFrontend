import PageHeader from '../../../components/organisms/PageHeader';

// Sin dato no se inventa una cifra: se muestra "—" (antes aparecía "+0%" o "0%" aunque no hubiera nada que medir)
const orDash = (value, format = (v) => v) => (value === null || value === undefined ? '—' : format(value));

export default function DashboardHero({ stats }) {
  return (
    <PageHeader
      title="Estado de la operación hoy"
      description="Entregas, flota y alertas en una sola vista, para detectar a tiempo qué requiere atención."
      stats={[
        { label: 'Carga de hoy', value: orDash(stats?.packagesToday ?? 0) },
        { label: 'En curso', value: orDash(stats?.activeRoutes ?? 0) },
        { label: 'A tiempo', value: orDash(stats?.sla, (v) => `${v}%`), tone: 'success' },
        { label: 'Flota activa', value: orDash(stats?.totalVehicles ?? 0), hint: 'vehículos' },
        { label: 'Conductores', value: orDash(stats?.totalDrivers ?? 0) },
        { label: 'Km recorridos', value: orDash(stats?.totalDistance, (v) => `${v.toLocaleString()}k`) },
        { label: 'Rendimiento', value: orDash(stats?.performance), hint: 'frente al corte' },
      ]}
    />
  );
}
