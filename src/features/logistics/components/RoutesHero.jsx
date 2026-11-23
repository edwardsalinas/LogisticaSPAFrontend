import PageHeader from '../../../components/organisms/PageHeader';

export default function RoutesHero({ active, pending, completed }) {
  return (
    <PageHeader
      title="Programación de viajes"
      description="Programación, puntos de control y vehículos; elige un viaje para ver su mapa."
      stats={[
        { label: 'En curso', value: active },
        { label: 'Planeados', value: pending },
        { label: 'Finalizados', value: completed, tone: 'success' },
      ]}
    />
  );
}
