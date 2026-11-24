import { Award } from 'lucide-react';
import Avatar from '../../../components/atoms/Avatar';
import ProgressBar from '../../../components/atoms/ProgressBar';

function DriversRankingTable({ title = 'Ranking de conductores', data = [] }) {
  return (
    <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-semibold tracking-[-0.03em] text-surface-950">{title}</h3>
          <p className="mt-1 text-sm text-surface-600">Entregas del rango por conductor; el porcentaje es de entregas antes de la llegada estimada de la ruta.</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
          <Award size={20} strokeWidth={2.2} />
        </div>
      </div>

      {data.length === 0 && <p className="text-sm text-surface-600">Aún no hay entregas con conductor asignado en el rango elegido.</p>}

      <div className="space-y-3">
        {data.map((driver, index) => {
          const rank = index + 1;
          const hasEfficiency = driver.efficiency !== null && driver.efficiency !== undefined;
          const progressTone = !hasEfficiency ? 'primary' : driver.efficiency >= 95 ? 'success' : driver.efficiency >= 90 ? 'primary' : 'warning';

          return (
            <div key={driver.id} className="flex items-center gap-4 rounded-xl border border-surface-200 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-100 text-sm font-semibold text-surface-800">
                {rank}
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={driver.name} size="md" className="ring-2 ring-white" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-surface-900">{driver.name}</p>
                    <span className="text-sm font-semibold text-surface-800">{hasEfficiency ? `${driver.efficiency}%` : 'Sin medir'}</span>
                  </div>
                  <p className="mt-1 text-xs text-surface-600">{driver.deliveries} entregas · {driver.onTime} a tiempo</p>
                  <div className="mt-3">
                    <ProgressBar value={hasEfficiency ? driver.efficiency : 0} size="md" variant={progressTone} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

export default DriversRankingTable;
