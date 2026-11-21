import { useEffect, useRef, useState } from 'react';
import Button from '../../../components/atoms/Button';
import Skeleton from '../../../components/atoms/Skeleton';
import AiSuggestionButtons from './AiSuggestionButtons';
import apiService from '../../../services/apiService';

const WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    'Hola. Soy el asistente logístico de LogisticaSPA. Puedo consultar el estado de un paquete a partir de su código de rastreo (TRK-...) y, si tu perfil lo permite, información de rutas.',
};

const COMMON_SUGGESTIONS = [
  { icon: 'PK', label: 'Consultar un paquete', value: '¿Cómo puedo consultar el estado de mi paquete?' },
  { icon: 'RT', label: 'Rutas en tránsito', value: '¿Qué rutas están en tránsito actualmente?' },
];

const MAX_MESSAGE_LENGTH = 1000;
const HISTORY_LIMIT = 10; // el backend acepta como máximo 10 mensajes previos

function AiAssistantPanel({ mode = 'panel', onClose = null }) {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);

  const isPanel = mode === 'panel';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (messageText = input) => {
    const text = messageText.trim();
    if (!text || loading) return;

    // Contexto: mensajes previos de la conversación (sin el saludo inicial ni los errores locales)
    const history = messages
      .filter((m) => m !== WELCOME_MESSAGE && !m.isError)
      .slice(-HISTORY_LIMIT)
      .map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    setShowSuggestions(false);

    try {
      const res = await apiService.post('/ai-agent/chat', { message: text, history });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.response }]);
    } catch (err) {
      const content =
        err.status === 429
          ? 'Has enviado muchos mensajes seguidos. Espera un minuto e inténtalo de nuevo.'
          : 'No pude procesar tu consulta en este momento. Inténtalo nuevamente.';
      setMessages((prev) => [...prev, { role: 'assistant', content, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (value) => {
    handleSend(value);
  };

  const handleNewConversation = () => {
    setMessages([
      { role: 'assistant', content: 'Nueva conversación iniciada. ¿Qué paquete o ruta quieres consultar?' },
    ]);
    setShowSuggestions(true);
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
            <p className="mt-1 text-xs text-surface-500">Consulta el estado de tus envíos en lenguaje natural.</p>
          </div>

          {onClose && (
            <button type="button" onClick={onClose} aria-label="Cerrar asistente" className="flex h-10 w-10 items-center justify-center rounded-xl border border-surface-200 bg-white text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-800">x</button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={handleNewConversation} className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary-700 transition-colors hover:bg-primary-100">Nueva consulta</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
        <div className="space-y-4" aria-live="polite">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[84%] rounded-[1.35rem] px-4 py-3 ${msg.role === 'user' ? 'rounded-br-md bg-[linear-gradient(135deg,#0b4ea2_0%,#137fec_100%)] text-white shadow-[0_18px_40px_-24px_rgba(19,127,236,0.75)]' : 'rounded-bl-md border border-surface-100 bg-surface-50 text-surface-800'}`}>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="w-[17rem] rounded-[1.35rem] rounded-bl-md border border-surface-100 bg-surface-50 px-4 py-4">
                <div className="flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.16em] text-surface-500">
                  <span className="h-2 w-2 rounded-full bg-primary-400 animate-pulse" />
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

      {showSuggestions && messages.length === 1 && (
        <div className="border-t border-surface-100 px-4 pb-4 pt-4 sm:px-5">
          <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-surface-500">Sugerencias rápidas</p>
          <AiSuggestionButtons suggestions={COMMON_SUGGESTIONS} onSelect={handleSuggestionClick} />
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
            className="min-h-[3.2rem] flex-1 resize-none rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-4 focus:ring-primary-100"
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
