import { useState } from 'react';
import Button from '../../../components/atoms/Button';
import StatCard from '../../../components/molecules/StatCard';
import DateRangePicker from '../../../components/molecules/DateRangePicker';
import TrendChart from '../components/TrendChart';
import DelayReasonsChart from '../components/DelayReasonsChart';
import DriversRankingTable from '../components/DriversRankingTable';

/**
 * AnalyticsPage - Panel Analítico de Envíos
 * Muestra gráficas, estadísticas y ranking de conductores
 */
function AnalyticsPage() {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date(),
  });

  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
  };

  const handleExport = () => {
    console.log('Exportando datos...', dateRange);
    alert('Funcionalidad de exportación: Los datos se descargarían en CSV/PDF');
  };

  const handleFilter = () => {
    console.log('Aplicando filtros...', dateRange);
    alert('Filtros aplicados para el rango: ' + dateRange.from.toLocaleDateString() + ' - ' + dateRange.to.toLocaleDateString());
  };

  return (
    <div className="h-full overflow-y-auto bg-surface-50">
      {/* ========================================
          HEADER
      ======================================== */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 mb-1">
              Panel de Control de Envíos
            </h1>
            <p className="text-surface-500 text-sm">
              Análisis detallado del rendimiento operacional
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleFilter}>
              🔍 Filtros
            </Button>
            <Button variant="secondary" onClick={handleExport}>
              📥 Exportar Datos
            </Button>
          </div>
        </div>

        {/* DateRangePicker */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
        </div>

        {/* StatCards (4 columnas) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            label="Envíos Totales"
            value="12,482"
            icon="📦"
            change={12}
            changeLabel="vs período anterior"
          />
          <StatCard
            label="Entregas a Tiempo"
            value="94.2%"
            icon="✅"
            change={3.5}
            changeLabel="vs período anterior"
          />
          <StatCard
            label="Demoras Promedio"
            value="2.4 hrs"
            icon="⏱️"
            change={-8.2}
            changeLabel="vs período anterior"
          />
          <StatCard
            label="Incidencias Críticas"
            value="14"
            icon="⚠️"
            change={-25}
            changeLabel="vs período anterior"
          />
        </div>
      </div>

      {/* ========================================
          GRÁFICA DE TENDENCIAS (ancho completo)
      ======================================== */}
      <div className="mb-8">
        <TrendChart />
      </div>

      {/* ========================================
          GRID INFERIOR (2 columnas)
      ======================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Motivos de Retraso */}
        <div>
          <DelayReasonsChart />
        </div>

        {/* Ranking de Conductores */}
        <div>
          <DriversRankingTable />
        </div>
      </div>

      {/* ========================================
          FOOTER
      ======================================== */}
      <div className="text-center py-6 border-t border-surface-200">
        <p className="text-sm text-surface-400">
          Última actualización: {new Date().toLocaleString('es-BO', { 
            dateStyle: 'long', 
            timeStyle: 'short' 
          })}
        </p>
        <p className="text-xs text-surface-400 mt-1">
          Los datos se actualizan automáticamente cada 5 minutos
        </p>
      </div>
    </div>
  );
}

export default AnalyticsPage;
