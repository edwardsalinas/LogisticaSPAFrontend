import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

// Datos mock para motivos de retraso
const MOCK_DATA = [
  { name: 'Tráfico', value: 156, color: '#ef4444' },
  { name: 'Clima', value: 98, color: '#f59e0b' },
  { name: 'Falla Mecánica', value: 87, color: '#3b82f6' },
  { name: 'Error Operativo', value: 87, color: '#10b981' },
];

/**
 * DelayReasonsChart - Gráfica de donut para motivos de retraso
 * @param {string} title - Título de la gráfica
 * @param {Array} data - Datos para la gráfica
 */
function DelayReasonsChart({ title = 'Motivos de Retraso', data = MOCK_DATA }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="delay-reasons-chart bg-white rounded-lg shadow-sm p-6 h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-surface-900">{title}</h3>
        <p className="text-sm text-surface-400 mt-1">
          Total: <span className="font-bold text-surface-900">{total}</span> retrasos
        </p>
      </div>

      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-sm text-surface-600">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default DelayReasonsChart;
