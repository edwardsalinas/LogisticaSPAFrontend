import { lazy, memo, Suspense } from 'react';
import { Sparkles } from 'lucide-react';
import { AttachmentCard } from './AssistantCards';
import AiSuggestionButtons from './AiSuggestionButtons';
import { plainText } from '../voice';

// react-markdown pesa bastante y solo hace falta al mostrar una respuesta: se carga bajo demanda, no en el paquete principal.
// Mientras llega (una sola vez) se muestra el mismo texto sin formato, para que no salte el contenido.
const MarkdownText = lazy(() => import('./MarkdownText'));

// Preguntas de seguimiento tras la ficha de un paquete que sigue en curso
const followUps = (attachments = []) => {
  const pkg = attachments.find((a) => a.kind === 'package_tracking');
  if (!pkg || pkg.package.status === 'entregado') return [];
  const code = pkg.package.tracking_code;
  return [
    { label: '¿Cuándo llegará?', value: `¿Cuándo llegará el paquete ${code}?` },
    { label: '¿Quién lo lleva?', value: `¿Quién lleva el paquete ${code} y en qué vehículo?` },
    { label: '¿Dónde está ahora?', value: `¿Dónde está ahora el paquete ${code}?` },
  ];
};

/** Un mensaje del chat: texto (con markdown) y, en las respuestas del asistente, tarjetas con los datos. */
function ChatBubble({ message, onAsk, role, showFollowUps = false }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[1.35rem] rounded-br-md bg-brand-gradient px-4 py-3 text-white shadow-sm">
          <span className="sr-only">Tú: </span>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  const attachments = message.attachments ?? [];
  return (
    <div className="flex items-start gap-3" data-role="assistant">
      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600" aria-hidden="true"><Sparkles size={16} /></span>
      <div className={`min-w-0 max-w-[90%] flex-1 rounded-[1.35rem] rounded-tl-md border px-4 py-3 ${message.isError ? 'border-red-200 bg-red-50 text-red-800' : 'border-surface-100 bg-white text-surface-800 shadow-sm'}`}>
        <span className="sr-only">Asistente: </span>
        {message.streaming ? (
          // En vivo: texto plano (el markdown a medias, con ** sin cerrar, parpadea); al terminar se da formato
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {plainText(message.content)}
            <span aria-hidden="true" className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-primary-500 motion-reduce:animate-none" />
          </p>
        ) : (
        <Suspense fallback={<p className="whitespace-pre-wrap text-sm leading-relaxed">{plainText(message.content)}</p>}>
          <MarkdownText>{message.content}</MarkdownText>
        </Suspense>
        )}
        {!message.streaming && attachments.map((a, i) => <AttachmentCard key={`${a.kind}-${i}`} attachment={a} onAsk={onAsk} role={role} />)}
        {showFollowUps && !message.streaming && <AiSuggestionButtons suggestions={followUps(attachments)} onSelect={onAsk} />}
      </div>
    </div>
  );
}

// Memoizado: escribir en el campo de texto (o dictar) ya no vuelve a dibujar ni a interpretar toda la conversación
export default memo(ChatBubble);
