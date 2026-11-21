import { useEffect, useRef, useState } from 'react';
import Button from '../../../components/atoms/Button';
import Skeleton from '../../../components/atoms/Skeleton';
import AiSuggestionButtons from './AiSuggestionButtons';
import ChatBubble from './ChatBubble';
import useAssistantChat, { MAX_MESSAGE_LENGTH } from '../useAssistantChat';
import { introForRole, suggestionsForRole } from '../suggestions';

const WELCOME_MESSAGE = {
  role: 'assistant',
  local: true,
  content: 'Hola. Soy el asistente logístico de LogisticaSPA. Pregúntame lo que necesites sobre tus envíos en lenguaje natural.',
};

/**
 * Panel flotante del asistente (Modo clásico). Comparte la conversación y las tarjetas con la vista del Modo IA.
 */
function AiAssistantPanel({ mode = 'panel', onClose = null, role }) {
  const { messages, loading, send, reset } = useAssistantChat([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const isPanel = mode === 'panel';
  const onlyWelcome = messages.length === 1;
  const suggestions = suggestionsForRole(role).filter((s) => !s.prefill).slice(0, 3);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (text = input) => {
    if (!String(text).trim() || loading) return;
    setInput('');
    await send(text);
  };

  const handleNewConversation = () => {
    reset([{ role: 'assistant', local: true, content: 'Nueva conversación iniciada. ¿Qué quieres consultar?' }]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-[1.6rem] border border-white/65 bg-white/88 shadow-[0_30px_80px_-42px_rgba(15,23,42,0.35)] backdrop-blur-2xl ${
        isPanel ? '' : 'min-h-[calc(100vh-8rem)]'
      }`}
    >
      <div className="border-b border-surface-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.96))] px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.62rem] uppercase tracking-[0.24em] text-surface-500">Asistente operativo</p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-primary-700">Copiloto IA LogisticaSPA</h2>
            <p className="mt-1 text-xs text-surface-500">{introForRole(role)}</p>
          </div>

          {onClose && (
            <button type="button" onClick={onClose} aria-label="Cerrar asistente" className="flex h-10 w-10 items-center justify-center rounded-xl border border-surface-200 bg-white text-surface-500 transition-colors hover:bg-surface-50">
              ✕
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={handleNewConversation} className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-100">
            Nueva conversación
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
        <div className="space-y-4" aria-live="polite">
          {messages.map((msg, idx) => (
            <ChatBubble key={idx} message={msg} role={role} onAsk={handleSend} showFollowUps={idx === messages.length - 1 && !loading} />
          ))}

          {loading && (
            <div className="flex justify-start" role="status">
              <div className="w-[17rem] rounded-[1.35rem] rounded-bl-md border border-surface-100 bg-surface-50 px-4 py-4">
                <div className="flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.16em] text-surface-500">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary-400" />
                  Pensando respuesta
                </div>
                <Skeleton className="mt-4 h-3 w-11/12" />
                <Skeleton className="mt-2 h-3 w-4/5" />
                <Skeleton className="mt-2 h-3 w-2/3" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {onlyWelcome && (
        <div className="border-t border-surface-100 px-4 pb-4 pt-4 sm:px-5">
          <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-surface-500">Sugerencias rápidas</p>
          <AiSuggestionButtons suggestions={suggestions.map((s) => ({ icon: s.icon, label: s.label, value: s.value }))} onSelect={handleSend} />
        </div>
      )}

      <div className="border-t border-surface-100 bg-white/85 px-4 py-4 sm:px-5">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={MAX_MESSAGE_LENGTH}
            aria-label="Mensaje para el asistente"
            placeholder="Escribe el código de rastreo (TRK-...) o tu consulta..."
            className="min-h-[3.2rem] flex-1 resize-none rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm outline-none transition-all focus:border-primary-400 focus:bg-white"
            disabled={loading}
            rows={1}
          />

          <Button onClick={() => handleSend()} disabled={loading || !input.trim()} className="min-w-[6.5rem] self-end">Enviar</Button>
        </div>

        <p className="mt-2 text-center text-[0.72rem] text-surface-400">Verifica información crítica antes de tomar decisiones operativas.</p>
      </div>
    </div>
  );
}

export default AiAssistantPanel;
