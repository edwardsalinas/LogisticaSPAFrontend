import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, History, RotateCcw } from 'lucide-react';
import { useAuth } from '../../../app/AuthContext';
import useRole from '../../../app/useRole';
import Skeleton from '../../../components/atoms/Skeleton';
import Announcer from '../components/Announcer';
import ConversationHistory, { refreshConversationList } from '../components/ConversationHistory';
import AssistantAvatar from '../components/AssistantAvatar';
import ChatBubble from '../components/ChatBubble';
import BlurText from '@/components/BlurText';
import ShinyText from '@/components/ShinyText';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import useMediaQuery from '@/hooks/useMediaQuery';
import AssistantComposer, { useAssistantComposer } from '../components/AssistantComposer';
import { prefersReducedMotion } from '../voice';
import useAssistantChat from '../useAssistantChat';
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
  const chat = useAssistantChat();
  const { messages, loading, status, conversationId, reset, openConversation } = chat;
  const composer = useAssistantComposer({ chat, role });
  const { input, setInput, ask, submit } = composer;
  const streaming = messages.length > 0 && !!messages[messages.length - 1].streaming; // ya hay texto en pantalla
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 767px)');
  // Si llegamos desde la paleta de comandos (Ctrl+K), la pregunta queda escrita; el usuario decide si la envía
  useEffect(() => {
    const prefill = location.state?.prefill;
    if (typeof prefill === 'string' && prefill) setInput(prefill);
  }, [location.state]);
  const [slow, setSlow] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const endRef = useRef(null);

  // Tras cada respuesta, el servidor guarda la conversación; se refresca la lista un instante después
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

  const name = displayName(user);
  const empty = messages.length === 0;

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'end' });
  }, [messages, loading]);

  // Si la respuesta tarda, se avisa para que no parezca que se colgó
  useEffect(() => {
    if (!loading) { setSlow(false); return undefined; }
    const t = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(t);
  }, [loading]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9.5rem)] w-full max-w-3xl flex-col">
      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <AssistantAvatar size={88} mood="idle" />
          {/* El texto completo va en un span solo para lectores de pantalla; la animación se apaga con prefers-reduced-motion */}
          <div role="heading" aria-level={2} className="mt-6 flex justify-center text-3xl font-bold tracking-tight text-surface-950 sm:text-4xl">
            <BlurText text={name ? `Hola, ${name}` : 'Hola'} animateBy="words" delay={120} stepDuration={0.3} blur={6} distance={16} className="justify-center" />
          </div>
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
                <s.icon size={20} strokeWidth={2} aria-hidden="true" className="shrink-0 text-primary-600" />
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          <div className="w-full text-left">
            <ConversationHistory compact limit={4} activeId={conversationId} onOpen={openFromHistory} onDeleted={() => reset([])} />
          </div>
          {role === 'admin' && (
            <Link to="/assistant/usage" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-primary-700 hover:bg-primary-50">
              <BarChart3 size={16} aria-hidden="true" /> Ver el uso de la IA
            </Link>
          )}
        </div>
      ) : (
        <div className="flex-1 space-y-5 pb-6 pt-2">
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setShowHistory((v) => !v)} aria-expanded={showHistory} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-surface-200 bg-white px-4 text-xs font-semibold text-surface-600 hover:bg-surface-50">
              <History size={13} aria-hidden="true" /> Historial
            </button>
            {role === 'admin' && (
              <Link to="/assistant/usage" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-surface-200 bg-white px-4 text-xs font-semibold text-surface-600 hover:bg-surface-50">
                <BarChart3 size={13} aria-hidden="true" /> Uso de la IA
              </Link>
            )}
            <button type="button" onClick={() => { reset([]); setInput(''); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-surface-200 bg-white px-4 text-xs font-semibold text-surface-600 hover:bg-surface-50">
              <RotateCcw size={13} aria-hidden="true" /> Nueva conversación
            </button>
          </div>
          {showHistory && !isMobile && <ConversationHistory activeId={conversationId} onOpen={openFromHistory} onDeleted={() => { reset([]); setShowHistory(false); }} />}
          {isMobile && (
            <Drawer open={showHistory} onOpenChange={setShowHistory}>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Historial de conversaciones</DrawerTitle>
                  <DrawerDescription className="sr-only">Elige una conversación anterior para retomarla.</DrawerDescription>
                </DrawerHeader>
                <div className="max-h-[65vh] overflow-y-auto px-4 pb-6">
                  <ConversationHistory activeId={conversationId} onOpen={openFromHistory} onDeleted={() => { reset([]); setShowHistory(false); }} />
                </div>
              </DrawerContent>
            </Drawer>
          )}
          <Announcer messages={messages} loading={loading} />
          <div className="space-y-5">
            {messages.map((m, i) => (
              <ChatBubble key={m.id ?? i} message={m} role={role} onAsk={ask} showFollowUps={i === messages.length - 1 && !loading} />
            ))}
            {loading && !streaming && (
              <div className="flex items-start gap-3">
                <AssistantAvatar size={36} mood="thinking" className="mt-0.5" />
                <div className="w-72 rounded-2xl rounded-tl-md border border-surface-100 bg-white px-4 py-4 shadow-sm">
                  <p className="text-xs font-semibold tracking-[0.04em]"><ShinyText text={status || 'Consultando…'} color="#475569" shineColor="#1d4ed8" speed={2.4} /></p>
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
        <AssistantComposer composer={composer} />
        <p className="mt-2 text-center text-xs text-surface-600">Si te pido hacer algo, preparo la acción y solo se ejecuta cuando tú la confirmas. Verifica lo crítico antes de decidir.</p>
      </div>
    </div>
  );
}

export default AssistantHome;
