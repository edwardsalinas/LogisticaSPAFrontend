import Avatar from '../../../components/atoms/Avatar';
import ProgressBar from '../../../components/atoms/ProgressBar';

// Datos mock para ranking de conductores
const MOCK_DRIVERS = [
  { id: 'd-001', name: 'Juan Pérez', efficiency: 98.5, deliveries: 145, onTime: 143 },
  { id: 'd-002', name: 'María López', efficiency: 97.2, deliveries: 138, onTime: 134 },
  { id: 'd-003', name: 'Carlos Ruiz', efficiency: 95.8, deliveries: 142, onTime: 136 },
  { id: 'd-004', name: 'Ana Flores', efficiency: 94.5, deliveries: 130, onTime: 123 },
  { id: 'd-005', name: 'Luis García', efficiency: 93.1, deliveries: 125, onTime: 116 },
];

/**
 * DriversRankingTable - Tabla de ranking de conductores con barras de eficiencia
 * @param {string} title - Título de la tabla
 * @param {Array} data - Datos de conductores
 */
function DriversRankingTable({ title = 'Rendimiento de Conductores (Top 5)', data = MOCK_DRIVERS }) {
  return (
    <div className="drivers-ranking-table bg-white rounded-lg shadow-sm p-6 h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-surface-900">{title}</h3>
        <p className="text-sm text-surface-400 mt-1">
          Basado en entregas a tiempo y eficiencia operacional
        </p>
      </div>

      <div className="space-y-4">
        {data.map((driver, index) => {
          const rank = index + 1;
          const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

          return (
            <div
              key={driver.id}
              className="drivers-ranking-table__row flex items-center gap-4 p-3 rounded-lg hover:bg-surface-50 transition-colors"
            >
              {/* Rank */}
              <div className="w-8 text-center text-xl">
                {medal}
              </div>

              {/* Conductor */}
              <div className="flex items-center gap-3 flex-1">
                <Avatar name={driver.name} size="md" />
                <div>
                  <p className="font-semibold text-surface-900">{driver.name}</p>
                  <p className="text-xs text-surface-500">
                    {driver.deliveries} entregas • {driver.onTime} a tiempo
                  </p>
                </div>
              </div>

              {/* Eficiencia */}
              <div className="w-32">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-surface-500">Eficiencia</span>
                  <span className="text-sm font-bold text-surface-900">{driver.efficiency}%</span>
                </div>
                <ProgressBar
                  value={driver.efficiency}
                  size="md"
                  variant={
                    driver.efficiency >= 95 ? 'success' :
                    driver.efficiency >= 90 ? 'primary' : 'warning'
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DriversRankingTable;
