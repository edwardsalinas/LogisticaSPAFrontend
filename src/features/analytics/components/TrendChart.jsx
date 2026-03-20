import { lazy } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Datos mock para la gráfica
const MOCK_DATA = [
  { date: '01 Mar', esteMes: 120, mesPasado: 100 },
  { date: '05 Mar', esteMes: 145, mesPasado: 110 },
  { date: '10 Mar', esteMes: 180, mesPasado: 125 },
  { date: '15 Mar', esteMes: 220, mesPasado: 140 },
  { date: '20 Mar', esteMes: 265, mesPasado: 155 },
  { date: '25 Mar', esteMes: 310, mesPasado: 170 },
  { date: '30 Mar', esteMes: 358, mesPasado: 185 },
];

/**
 * TrendChart - Gráfica de líneas para tendencia de envíos
 * @param {string} title - Título de la gráfica
 * @param {Array} data - Datos para la gráfica
 */
function TrendChart({ title = 'Tendencia de Volumen de Envíos', data = MOCK_DATA }) {
  return (
    <div className="trend-chart bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-surface-900">{title}</h3>
        <p className="text-sm text-surface-400 mt-1">
          Comparativa de envíos: Este Mes vs. Mes Pasado
        </p>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="esteMes"
              name="Este Mes"
              stroke="#137fec"
              strokeWidth={3}
              dot={{ fill: '#137fec', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="mesPasado"
              name="Mes Pasado"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#94a3b8', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TrendChart;
