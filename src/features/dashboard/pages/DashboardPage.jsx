import StatCard from '../../../components/molecules/StatCard';

function DashboardPage() {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Paquetes Totales" value="—" />
        <StatCard label="Rutas Activas" value="—" />
        <StatCard label="Vehículos" value="—" />
        <StatCard label="Conductores" value="—" />
      </div>
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-surface-800 mb-4">Actividad Reciente</h2>
        <p className="text-surface-400 text-sm">Los datos se cargarán cuando se conecte al backend.</p>
      </div>
    </div>
  );
}

export default DashboardPage;
