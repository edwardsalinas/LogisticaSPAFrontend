import PageHeader from '../../../components/organisms/PageHeader';

const dash = (value, suffix = '') => (value === null || value === undefined ? '—' : `${value}${suffix}`);

// Menos de una hora se muestra en minutos ("0 h" no dice nada)
export const formatDuration = (hours) => {
  if (hours === null || hours === undefined) return '—';
  return hours < 1 ? `${Math.round(hours * 60)} min` : `${hours} h`;
};

export default function AnalyticsHero({ totals }) {
  const incidents = totals?.incidents ?? 0;
  return (
    <PageHeader
      title="Rendimiento de la operación"
      description="Volumen, cumplimiento, demoras y rendimiento del equipo."
      stats={[
        { label: 'Envíos totales', value: dash(totals?.shipments ?? 0) },
        { label: 'A tiempo', value: dash(totals?.onTimePct, '%'), tone: 'success' },
        { label: 'Entrega promedio', value: formatDuration(totals?.avgDeliveryHours) },
        { label: 'Siniestros', value: dash(incidents), tone: incidents > 0 ? 'danger' : 'default' },
      ]}
    />
  );
}
