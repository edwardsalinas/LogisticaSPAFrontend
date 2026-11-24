import { useEffect, useRef, useState } from 'react';
import { Activity, BellRing, GraduationCap, History, X } from 'lucide-react';
import Skeleton from '../../../components/atoms/Skeleton';
import AiSuggestionButtons from './AiSuggestionButtons';
import Announcer from './Announcer';
import AssistantAvatar from './AssistantAvatar';
import AssistantComposer, { useAssistantComposer } from './AssistantComposer';
import ChatBubble from './ChatBubble';
import ConversationHistory, { refreshConversationList } from './ConversationHistory';
import LogiActivity from './LogiActivity';
import { useGuidedRun } from '../guided/GuidedRunProvider';
import { applyGuidedOutcome } from '../guided/outcome';
import { savePrefs, useAlertPrefs } from '../alerts/alertPrefs';
import { setEnabled } from '../alerts/alertPolicy';
import useAssistantChat from '../useAssistantChat';
import { introForRole, suggestionsForRole } from '../suggestions';
import { prefersReducedMotion } from '../voice';

// Para «Enséñame»: un paquete de ejemplo con datos inventados; la demostración NUNCA guarda nada
const DEMO_PACKAGE = {
  id: 'demo-paquete', type: 'create_package', title: 'Demostración: registrar un paquete', lines: [],
  ui: { fill: { form: 'package', values: { origen: 'La Paz', destino: 'Oruro', peso: 5, recipient_name: 'María Ejemplo', recipient_phone: '70000000', description: 'Documentos de ejemplo' } } },
};
const OPS = ['admin', 'logistics_operator'];

const WELCOME_MESSAGE = {
  role: 'assistant',
  local: true,
  content: '¡Hola! Soy Logi, tu copiloto de LogisticaSPA. Pregúntame lo que necesites sobre tus envíos, como si le hablaras a un compañero de trabajo.',
};

/**
 * Panel flotante del asistente (Modo clásico). Comparte la conversación y las tarjetas con la vista del Modo IA.
 */
function AiAssistantPanel({ mode = 'panel', onClose = null, role, logiWalks = null, onToggleLogiWalk = null }) {
  const chat = useAssistantChat();
  const { loading, reset, conversationId, openConversation } = chat;
  // mismas herramientas que la pantalla del Modo IA: dictado, foto de guía, chat de voz y lectura en voz alta
  const composer = useAssistantComposer({ chat, role });
  const { setInput, ask, submit } = composer;
  const [showHistory, setShowHistory] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const guided = useGuidedRun(); // «Enséñame» (null fuera del layout)
  const alertPrefs = useAlertPrefs();
  const isStaff = OPS.includes(role);
  // el saludo no es parte de la conversación compartida: se muestra solo mientras está vacía
  const messages = chat.messages.length ? chat.messages : [WELCOME_MESSAGE];
  const messagesEndRef = useRef(null);

  const isPanel = mode === 'panel';
  const onlyWelcome = chat.messages.length === 0;
  // el robot refleja lo que hace: escribiendo la respuesta, pensando o en reposo
  const streaming = chat.messages.length > 0 && chat.messages[chat.messages.length - 1].streaming;
  const mood = streaming ? 'talking' : loading ? 'thinking' : 'idle';
  const suggestions = suggestionsForRole(role).filter((s) => !s.prefill).slice(0, 3);

  useEffect(() => {
    // con el chat vacío se ve el saludo desde arriba; el desplazamiento automático es solo para conversaciones reales
    if (onlyWelcome && !loading) return;
    messagesEndRef.current?.scrollIntoView?.({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [messages, loading, onlyWelcome]);

  // Tras cada respuesta el servidor guarda la conversación; se refresca la lista un instante después
  const wasLoading = useRef(false);
  useEffect(() => {
    if (wasLoading.current && !loading) {
      const t = setTimeout(refreshConversationList, 1500);
      wasLoading.current = loading;
      return () => clearTimeout(t);
    }
    wasLoading.current = loading;
    return undefined;
  }, [loading]);

  const openFromHistory = async (id) => {
    const ok = await openConversation(id);
    if (ok) { setShowHistory(false); setInput(''); }
  };

  const handleNewConversation = () => {
    reset([]);
    setShowHistory(false);
    setInput('');
  };

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-[1.6rem] border border-white/65 bg-white/88 shadow-[0_30px_80px_-42px_rgba(15,23,42,0.35)] backdrop-blur-2xl ${
        isPanel ? '' : 'min-h-[calc(100vh-8rem)]'
      }`}
    >
      <div className="border-b border-surface-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.96))] px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <AssistantAvatar mood={mood} size={52} />
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-tight text-primary-700">Logi, tu copiloto</h2>
              <p className="mt-1 text-xs text-surface-600 line-clamp-2">{introForRole(role)}</p>
            </div>
          </div>

          {onClose && (
            <button type="button" onClick={onClose} aria-label="Cerrar asistente" className="flex h-10 w-10 items-center justify-center rounded-xl border border-surface-200 bg-white text-surface-500 transition-colors hover:bg-surface-50">
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="no-scrollbar -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
          <button onClick={handleNewConversation} className="shrink-0 whitespace-nowrap rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-100">
            Nueva conversación
          </button>
          <button
            type="button"
            onClick={() => { setShowHistory((v) => !v); setShowActivity(false); }}
            aria-expanded={showHistory}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-surface-200 bg-white px-3 py-1.5 text-xs font-semibold text-surface-700 transition-colors hover:bg-surface-50"
          >
            <History size={13} aria-hidden="true" /> Historial
          </button>
          <button
            type="button"
            onClick={() => { setShowActivity((v) => !v); setShowHistory(false); }}
            aria-expanded={showActivity}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-surface-200 bg-white px-3 py-1.5 text-xs font-semibold text-surface-700 transition-colors hover:bg-surface-50"
          >
            <Activity size={13} aria-hidden="true" /> Actividad
          </button>
          {guided && isStaff && (
            <button
              type="button"
              onClick={async () => {
                const out = await guided.start(DEMO_PACKAGE, { demo: true });
                applyGuidedOutcome({ out, action: DEMO_PACKAGE, chat });
              }}
              title="Logi te muestra cómo se registra un paquete, paso a paso, sin guardar nada"
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-surface-200 bg-white px-3 py-1.5 text-xs font-semibold text-surface-700 transition-colors hover:bg-surface-50"
            >
              <GraduationCap size={13} aria-hidden="true" /> Enséñame a registrar un paquete
            </button>
          )}
          {onToggleLogiWalk && (
            <button
              type="button"
              onClick={onToggleLogiWalk}
              aria-pressed={!logiWalks}
              className="shrink-0 whitespace-nowrap rounded-full border border-surface-200 bg-white px-3 py-1.5 text-xs font-semibold text-surface-700 transition-colors hover:bg-surface-50"
            >
              {logiWalks ? 'Dejar quieto a Logi' : 'Que Logi pasee'}
            </button>
          )}
          {isStaff && (
            <button
              type="button"
              onClick={() => savePrefs(setEnabled(alertPrefs, !alertPrefs.enabled))}
              aria-pressed={alertPrefs.enabled}
              title="Logi te avisa de excepciones reales (retrasos, paquetes sueltos con viaje, viajes sin conductor), como mucho una vez por hora"
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-surface-200 bg-white px-3 py-1.5 text-xs font-semibold text-surface-700 transition-colors hover:bg-surface-50"
            >
              <BellRing size={13} aria-hidden="true" /> {alertPrefs.enabled ? 'Avisos de Logi: sí' : 'Avisos de Logi: no'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
        <Announcer messages={chat.messages} loading={loading} />
        {showActivity && (
          <div className="mb-4">
            <LogiActivity chat={chat} />
          </div>
        )}
        {showHistory && (
          <div className="mb-4">
            <ConversationHistory activeId={conversationId} onOpen={openFromHistory} onDeleted={() => { reset([]); setShowHistory(false); }} />
          </div>
        )}
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <ChatBubble key={msg.id ?? idx} message={msg} role={role} onAsk={ask} showFollowUps={idx === messages.length - 1 && !loading} />
          ))}

          {loading && !(messages.length > 0 && messages[messages.length - 1].streaming) && (
            <div className="flex justify-start">
              <div className="w-[17rem] rounded-[1.35rem] rounded-bl-md border border-surface-100 bg-surface-50 px-4 py-4">
                <div className="flex items-center gap-2 text-sm text-surface-600">
                  <span className="h-2 w-2 animate-pulse motion-reduce:animate-none rounded-full bg-primary-400" />
                  {chat.status || 'Pensando respuesta'}
                </div>
                <Skeleton className="mt-4 h-3 w-11/12" />
                <Skeleton className="mt-2 h-3 w-4/5" />
                <Skeleton className="mt-2 h-3 w-2/3" />
              </div>
            </div>
          )}

          {onlyWelcome && (
            <div className="pl-11">
              <p className="mb-2 text-sm font-medium text-surface-700">Sugerencias rápidas</p>
              <AiSuggestionButtons suggestions={suggestions.map((s) => ({ icon: s.icon, label: s.label, value: s.value }))} onSelect={submit} />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-surface-100 bg-white/85 px-4 py-4 sm:px-5">
        <AssistantComposer composer={composer} compact placeholder="Escribe el código de rastreo (TRK-...) o tu consulta..." />

        <p className="mt-2 text-center text-xs text-surface-600">Verifica información crítica antes de tomar decisiones operativas.</p>
      </div>
    </div>
  );
}

export default AiAssistantPanel;
