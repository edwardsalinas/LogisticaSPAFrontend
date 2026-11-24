import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import apiService from '../../../services/apiService';
import { StatusBadge, timeAgo } from './AssistantCards';

/**
 * Registro de lo que se hizo con el asistente en esta sesión (lo que se confirmó o lo que Logi hizo a la vista de todos),
 * con enlace a lo que quedó y «Deshacer» donde se puede (el servidor vuelve a comprobar cada caso):
 *  - asignar paquetes: mientras sigan «asignados» y su viaje no haya salido;
 *  - crear un paquete: se anula (queda «cancelado») si sigue pendiente, sin viaje y con menos de 2 horas.
 * Registrar un evento o entregar no se puede devolver.
 */
const UNDO = {
  assign_package: { label: 'Deshacer la asignación', done: 'Vuelto a pendientes', toast: 'Asignación deshecha', detail: 'Los paquetes volvieron a pendientes.', call: (id) => apiService.unassignPackage(id) },
  create_package: { label: 'Deshacer: anular el paquete', done: 'Anulado', toast: 'Paquete anulado', detail: 'Quedó cancelado; el historial se conserva.', call: (id) => apiService.cancelPackage(id) },
};
const canUndo = (outcome) => Boolean(UNDO[outcome.type]) && (outcome.records?.length ?? 0) > 0;

export default function LogiActivity({ chat }) {
  const [undone, setUndone] = useState({}); // por hora de la acción: { status: 'working' | 'done' | 'error', message }
  const outcomes = [...(chat?.actionOutcomes?.values?.() ?? [])]
    .filter((o) => o.status === 'done' && o.at)
    .sort((a, b) => b.at - a.at);

  const undo = async (outcome) => {
    setUndone((u) => ({ ...u, [outcome.at]: { status: 'working' } }));
    const failed = [];
    for (const rec of outcome.records) {
      try {
        // en serie: así el servidor valida cada paquete por separado
        // eslint-disable-next-line no-await-in-loop
        await UNDO[outcome.type].call(rec.id);
      } catch (err) {
        failed.push(`${rec.tracking_code}: ${err?.message || 'no se pudo deshacer'}`);
      }
    }
    if (failed.length === 0) {
      setUndone((u) => ({ ...u, [outcome.at]: { status: 'done' } }));
      toast.success(UNDO[outcome.type].toast, { description: UNDO[outcome.type].detail });
    } else {
      setUndone((u) => ({ ...u, [outcome.at]: { status: 'error', message: failed.join(' · ') } }));
    }
  };

  if (outcomes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-surface-200 bg-surface-50 px-4 py-6 text-center text-sm text-surface-600">
        Todavía no hubo acciones en esta sesión. Cuando confirmes una acción o Logi la haga por ti, quedará anotada aquí.
      </div>
    );
  }

  return (
    <ul aria-label="Actividad de esta sesión" className="space-y-3">
      {outcomes.map((o) => {
        const u = undone[o.at];
        return (
          <li key={o.at} className="rounded-2xl border border-surface-200 bg-white p-3 shadow-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-surface-900">{o.title ?? 'Acción realizada'}</p>
                <p className="text-xs text-surface-600">{timeAgo(new Date(o.at).toISOString()) ?? ''}{o.message ? ` · ${o.message}` : ''}</p>
              </div>
            </div>
            {(o.records?.length ?? 0) > 0 && (
              <ul className="mt-2 space-y-1 border-t border-surface-100 pt-2">
                {o.records.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2"><span className="font-mono font-bold text-surface-800">{r.tracking_code}</span>{!u || u.status !== 'done' ? <StatusBadge status={r.status} /> : <span className="font-semibold text-surface-600">{UNDO[o.type]?.done}</span>}</span>
                    <Link to={`/logistics/packages/${r.id}`} className="inline-flex min-h-11 items-center px-1 font-semibold text-primary-700 hover:underline">Ver paquete</Link>
                  </li>
                ))}
              </ul>
            )}
            {canUndo(o) && u?.status !== 'done' && (
              <button
                type="button"
                onClick={() => undo(o)}
                disabled={u?.status === 'working'}
                className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-surface-200 bg-white px-3 text-xs font-semibold text-surface-700 hover:bg-surface-50 disabled:opacity-50"
              >
                <Undo2 size={14} aria-hidden="true" /> {u?.status === 'working' ? 'Deshaciendo…' : UNDO[o.type].label}
              </button>
            )}
            {u?.status === 'error' && <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{u.message}</p>}
          </li>
        );
      })}
    </ul>
  );
}
