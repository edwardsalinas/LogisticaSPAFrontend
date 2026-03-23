import { useState, useEffect } from 'react';
import { CalendarRange, Clock, Trash2, Zap, Loader2 } from 'lucide-react';
import Button from '../../../components/atoms/Button';
import apiService from '../../../services/apiService';
import clsx from 'clsx';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function SchedulePanel() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await apiService.getSchedules();
      setSchedules(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSchedules(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este cronograma?')) return;
    try {
      await apiService.deleteSchedule(id);
      fetchSchedules();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-display font-bold text-surface-900 tracking-tight flex items-center gap-2">
            <CalendarRange size={22} className="text-primary-600" /> Cronogramas Semanales
          </h3>
          <p className="text-sm text-surface-500 mt-1">
            Gestiona aquí los cronogramas recurrentes. El sistema genera automáticamente los despachos para los próximos 30 días.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-surface-400">Cargando cronogramas...</div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-10 bg-surface-50 rounded-2xl border border-dashed border-surface-200">
          <CalendarRange size={36} className="mx-auto text-surface-300 mb-3" />
          <p className="text-surface-500 font-medium">No hay cronogramas configurados</p>
          <p className="text-surface-400 text-sm mt-1">Usa "Crear Ruta" → Programación Semanal para añadir uno.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schedules.map(sch => {
            const dayTimes = sch.day_times || {};
            const activeDays = Object.keys(dayTimes).map(Number).sort();
            const allSameTime = new Set(Object.values(dayTimes)).size <= 1;

            return (
              <div key={sch.id} className="group bg-white border border-surface-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative">
                <button
                  onClick={() => handleDelete(sch.id)}
                  className="absolute top-4 right-4 p-1.5 text-surface-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>

                {sch.label && <p className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-1">{sch.label}</p>}
                <p className="font-semibold text-surface-900">{sch.origin} → {sch.destination}</p>

                <div className="mt-3 space-y-1">
                  {allSameTime && activeDays.length > 0 ? (
                    <div className="flex items-center gap-2 text-sm text-surface-500">
                      <Clock size={14} />
                      <span className="font-mono font-semibold text-surface-700">{Object.values(dayTimes)[0]}</span>
                      <span className="text-xs">todos los días</span>
                    </div>
                  ) : (
                    activeDays.map(day => (
                      <div key={day} className="flex items-center gap-2 text-xs text-surface-500">
                        <span className="w-10 font-semibold text-surface-600">{DAY_NAMES[day]}</span>
                        <span className="font-mono font-semibold text-surface-700">{dayTimes[String(day)]}</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-1.5 mt-3">
                  {DAY_NAMES.map((name, idx) => (
                    <span key={idx} className={clsx("w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg", dayTimes[String(idx)] ? "bg-primary-100 text-primary-700" : "bg-surface-50 text-surface-300")}>
                      {name[0]}
                    </span>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-surface-100 text-xs text-surface-400 space-y-1">
                  {sch.vehicles && <p>🚛 {sch.vehicles.plate} - {sch.vehicles.brand} {sch.vehicles.model}</p>}
                  {sch.drivers && <p>👤 {sch.drivers.full_name || sch.drivers.email}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
