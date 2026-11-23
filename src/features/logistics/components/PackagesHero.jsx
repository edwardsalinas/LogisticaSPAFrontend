import PageHeader from '../../../components/organisms/PageHeader';

export default function PackagesHero({ totalPackages, deliveredCount, transitCount, pendingCount, actions }) {
  return (
    <PageHeader
      title="Inventario de paquetes"
      description="Inventario con el flujo y la trazabilidad de cada envío."
      stats={[
        { label: 'Total', value: totalPackages },
        { label: 'Entregados', value: deliveredCount, tone: 'success' },
        { label: 'En ruta', value: transitCount },
        { label: 'Pendientes', value: pendingCount, tone: pendingCount > 0 ? 'warning' : 'default' },
      ]}
      actions={actions}
    />
  );
}
