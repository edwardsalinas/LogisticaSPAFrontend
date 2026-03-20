import { Award, MoveRight } from 'lucide-react';
import Avatar from '../../../components/atoms/Avatar';
import ProgressBar from '../../../components/atoms/ProgressBar';

const MOCK_DRIVERS = [
  { id: 'd-001', name: 'Juan Perez', efficiency: 98.5, deliveries: 145, onTime: 143 },
  { id: 'd-002', name: 'Maria Lopez', efficiency: 97.2, deliveries: 138, onTime: 134 },
  { id: 'd-003', name: 'Carlos Ruiz', efficiency: 95.8, deliveries: 142, onTime: 136 },
  { id: 'd-004', name: 'Ana Flores', efficiency: 94.5, deliveries: 130, onTime: 123 },
  { id: 'd-005', name: 'Luis Garcia', efficiency: 93.1, deliveries: 125, onTime: 116 },
];

function DriversRankingTable({ title = 'Ranking de conductores', data = MOCK_DRIVERS }) {
  return (
    <div className="rounded-[1.8rem] border border-white/70 bg-white/88 p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-surface-500">Equipo</p>
          <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-surface-950">{title}</h3>
          <p className="mt-2 text-sm text-surface-500">Basado en entregas a tiempo y consistencia operacional.</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <Award size={20} strokeWidth={2.2} />
        </div>
      </div>

      <div className="space-y-3">
        {data.map((driver, index) => {
          const rank = index + 1;
          const progressTone = driver.efficiency >= 95 ? 'success' : driver.efficiency >= 90 ? 'primary' : 'warning';

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
                    <span className="text-sm font-semibold text-surface-500">{driver.efficiency}%</span>
                  </div>
                  <p className="mt-1 text-xs text-surface-500">{driver.deliveries} entregas · {driver.onTime} a tiempo</p>
                  <div className="mt-3">
                    <ProgressBar value={driver.efficiency} size="md" variant={progressTone} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 transition-colors hover:text-primary-800">
        Ver ranking completo
        <MoveRight size={16} strokeWidth={2.2} />
      </button>
    </div>
  );
}

export default DriversRankingTable;
