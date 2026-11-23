import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import apiService from '../../../services/apiService';
import { useConfirm } from '../../../components/molecules/ConfirmDialog';
import { relativeTime } from '../time';

// Quien guarda una conversación avisa aquí y todas las listas visibles se actualizan
const subscribers = new Set();
export const refreshConversationList = () => subscribers.forEach((reload) => reload());

/** Lista de conversaciones guardadas del usuario (solo las suyas). */
export function useConversationList() {
  const [state, setState] = useState({ data: [], loading: true, error: false });
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await apiService.getAiConversations();
      if (alive.current) setState({ data: res?.data ?? [], loading: false, error: false });
    } catch {
      if (alive.current) setState((s) => ({ ...s, loading: false, error: true }));
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    load();
    subscribers.add(load);
    return () => { alive.current = false; subscribers.delete(load); };
  }, [load]);

  return { ...state, reload: load };
}

/**
 * Conversaciones anteriores: abrirlas para continuar o borrarlas.
 * `compact` muestra pocas, y no ocupa espacio si no hay ninguna o no se pudo cargar (pantalla de inicio del asistente).
 */
export default function ConversationHistory({ activeId = null, onOpen, onDeleted, limit, compact = false }) {
  const [askConfirm, confirmDialog] = useConfirm();
  const { data: conversations, loading, error, reload } = useConversationList();

  const remove = async (c) => {
    const ok = await askConfirm({
      title: 'Eliminar conversación',
      message: `Se eliminará "${c.title}" con todos sus mensajes. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await apiService.deleteAiConversation(c.id);
      if (c.id === activeId) onDeleted?.(c.id);
    } finally {
      refreshConversationList();
    }
  };

  const shown = limit ? conversations.slice(0, limit) : conversations;
  if (compact && !loading && (error || shown.length === 0)) return null;

  return (
    <section aria-label="Conversaciones anteriores" className={compact ? 'mt-8' : 'rounded-2xl border border-surface-200 bg-white p-2 shadow-sm'}>
      {compact && <h3 className="mb-2 px-1 text-sm font-semibold text-surface-700">Conversaciones recientes</h3>}
      {loading && <p className="px-3 py-3 text-sm text-surface-600">Cargando el historial…</p>}
      {error && (
        <p role="alert" className="px-3 py-3 text-sm text-red-700">
          No se pudo cargar el historial.{' '}
          <button type="button" onClick={reload} className="font-semibold underline">Reintentar</button>
        </p>
      )}
      {!loading && !error && shown.length === 0 && <p className="px-3 py-3 text-sm text-surface-600">Todavía no tienes conversaciones guardadas.</p>}
      <ul className="space-y-1">
        {shown.map((c) => (
          <li key={c.id} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onOpen?.(c.id)}
              aria-current={c.id === activeId ? 'true' : undefined}
              className={`flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 text-left transition-colors hover:bg-surface-50 ${c.id === activeId ? 'bg-primary-50' : ''}`}
            >
              <MessageSquare size={16} aria-hidden="true" className="shrink-0 text-primary-600" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-surface-900">{c.title}</span>
                <span className="block text-xs text-surface-600">{relativeTime(c.updated_at)}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => remove(c)}
              aria-label={`Eliminar la conversación "${c.title}"`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-surface-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      {confirmDialog}
    </section>
  );
}
