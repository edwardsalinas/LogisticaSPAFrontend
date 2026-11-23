import { Award } from 'lucide-react';
import Avatar from '../../../components/atoms/Avatar';
import ProgressBar from '../../../components/atoms/ProgressBar';

function DriversRankingTable({ title = 'Ranking de conductores', data = [] }) {
  return (
    <div className="rounded-[1.8rem] border border-white/70 bg-white/88 p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-surface-500">Equipo</p>
          <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-surface-950">{title}</h3>
          <p className="mt-2 text-sm text-surface-500">Entregas del rango por conductor; el porcentaje es de entregas antes de la llegada estimada de la ruta.</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <Award size={20} strokeWidth={2.2} />
        </div>
      </div>

      {data.length === 0 && <p className="text-sm text-surface-500">Aún no hay entregas con conductor asignado en el rango elegido.</p>}

      <div className="space-y-3">
        {data.map((driver, index) => {
          const rank = index + 1;
          const hasEfficiency = driver.efficiency !== null && driver.efficiency !== undefined;
          const progressTone = !hasEfficiency ? 'primary' : driver.efficiency >= 95 ? 'success' : driver.efficiency >= 90 ? 'primary' : 'warning';

          return (
            <div key={driver.id} className="flex items-center gap-4 rounded-[1.2rem] border border-surface-100 bg-surface-50/85 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-bold text-primary-700 shadow-sm">
                {rank}
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={driver.name} size="md" className="ring-2 ring-white" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-surface-900">{driver.name}</p>
                    <span className="text-sm font-semibold text-surface-500">{hasEfficiency ? `${driver.efficiency}%` : 'Sin medir'}</span>
                  </div>
                  <p className="mt-1 text-xs text-surface-500">{driver.deliveries} entregas · {driver.onTime} a tiempo</p>
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
