import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Send, Sparkles } from 'lucide-react';
import { useAuth } from '../../../app/AuthContext';
import useRole from '../../../app/useRole';
import Skeleton from '../../../components/atoms/Skeleton';
import ChatBubble from '../components/ChatBubble';
import useAssistantChat, { MAX_MESSAGE_LENGTH } from '../useAssistantChat';
import { introForRole, suggestionsForRole } from '../suggestions';

export const displayName = (user) => {
  const full = user?.user_metadata?.full_name || user?.user_metadata?.name;
  if (full) return String(full).split(' ')[0];
  const local = String(user?.email ?? '').split('@')[0];
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : '';
};

const SLOW_AFTER_MS = 8000;

/**
 * Vista "IA primero": la conversación con el asistente es la pantalla principal.
 * Se muestra como inicio cuando el usuario activa el Modo IA, y siempre está disponible en /assistant.
 */
function AssistantHome() {
  const { user } = useAuth();
  const { role } = useRole();
  const { messages, loading, send, reset } = useAssistantChat([]);
  const [input, setInput] = useState('');
  const [slow, setSlow] = useState(false);
  const endRef = useRef(null);

  const name = displayName(user);
  const empty = messages.length === 0;

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  // Si la respuesta tarda, se avisa para que no parezca que se colgó
  useEffect(() => {
    if (!loading) { setSlow(false); return undefined; }
    const t = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(t);
  }, [loading]);

  const submit = async (text = input) => {
    if (!String(text).trim() || loading) return;
    setInput('');
    await send(text);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const composer = (
    <div className="rounded-[1.6rem] border border-surface-200 bg-white p-2 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.35)] focus-within:border-primary-400">
      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={MAX_MESSAGE_LENGTH}
          aria-label="Mensaje para el asistente"
          placeholder="Pregunta lo que necesites: ¿dónde está mi paquete?"
          rows={1}
          disabled={loading}
          className="max-h-40 min-h-[3rem] flex-1 resize-none rounded-2xl bg-transparent px-4 py-3 text-base outline-none placeholder:text-surface-400 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => submit()}
          disabled={loading || !input.trim()}
          className="flex h-12 items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#0b4ea2_0%,#137fec_100%)] px-5 text-sm font-bold text-white shadow-sm transition-opacity disabled:opacity-40"
        >
          <Send size={16} aria-hidden="true" /> Enviar
        </button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9.5rem)] w-full max-w-3xl flex-col">
      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#0b4ea2_0%,#137fec_100%)] text-white shadow-lg shadow-primary-500/25">
            <Sparkles size={28} aria-hidden="true" />
          </span>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-surface-950 sm:text-4xl">{name ? `Hola, ${name}` : 'Hola'}</h2>
          <p className="mt-2 text-lg text-surface-600">¿En qué te puedo ayudar hoy?</p>
          <p className="mt-3 max-w-xl text-sm text-surface-500">{introForRole(role)}</p>

          <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
            {suggestionsForRole(role).map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => (s.prefill ? setInput(s.value) : submit(s.value))}
                className="flex items-center gap-3 rounded-2xl border border-surface-200 bg-white px-4 py-3.5 text-left text-sm font-medium text-surface-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
              >
                <span className="text-xl" aria-hidden="true">{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-5 pb-6 pt-2">
          <div className="flex justify-end">
            <button type="button" onClick={() => { reset([]); setInput(''); }} className="inline-flex items-center gap-1.5 rounded-full border border-surface-200 bg-white px-3 py-1.5 text-xs font-semibold text-surface-600 hover:bg-surface-50">
              <RotateCcw size={13} aria-hidden="true" /> Nueva conversación
            </button>
          </div>
          <div className="space-y-5" aria-live="polite">
            {messages.map((m, i) => (
              <ChatBubble key={i} message={m} role={role} onAsk={submit} showFollowUps={i === messages.length - 1 && !loading} />
            ))}
            {loading && (
              <div className="flex items-start gap-3" role="status">
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600"><Sparkles size={16} className="animate-pulse" /></span>
                <div className="w-72 rounded-[1.35rem] rounded-tl-md border border-surface-100 bg-white px-4 py-4 shadow-sm">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-surface-500">Consultando…</p>
                  <Skeleton className="mt-3 h-3 w-11/12" />
                  <Skeleton className="mt-2 h-3 w-3/5" />
                  {slow && <p className="mt-3 text-xs text-surface-500">Sigo trabajando en tu consulta, puede tardar unos segundos más.</p>}
                </div>
              </div>
            )}
          </div>
          <div ref={endRef} />
        </div>
      )}

      <div className="sticky bottom-20 z-10 bg-gradient-to-t from-[#eef3f9] via-[#eef3f9]/95 to-transparent pb-2 pt-4 lg:bottom-4">
        {composer}
        <p className="mt-2 text-center text-xs text-surface-400">El asistente solo consulta información: no modifica datos. Verifica lo crítico antes de decidir.</p>
      </div>
    </div>
  );
}

export default AssistantHome;
