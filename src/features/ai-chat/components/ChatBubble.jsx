import ReactMarkdown from 'react-markdown';
import { Sparkles } from 'lucide-react';
import { AttachmentCard } from './AssistantCards';
import AiSuggestionButtons from './AiSuggestionButtons';

// Markdown seguro (react-markdown no interpreta HTML): negritas, listas y código con el estilo de la aplicación
const mdComponents = {
  p: (props) => <p className="whitespace-pre-wrap text-sm leading-relaxed [&:not(:first-child)]:mt-2" {...props} />,
  ul: (props) => <ul className="mt-2 list-disc space-y-1 pl-5 text-sm" {...props} />,
  ol: (props) => <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm" {...props} />,
  strong: (props) => <strong className="font-semibold text-surface-950" {...props} />,
  code: (props) => <code className="rounded bg-surface-100 px-1.5 py-0.5 font-mono text-[0.8em] text-surface-800" {...props} />,
  a: ({ children }) => <span className="font-semibold text-primary-700">{children}</span>, // sin enlaces externos desde el modelo
};

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
export default function ChatBubble({ message, onAsk, role, showFollowUps = false }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[1.35rem] rounded-br-md bg-[linear-gradient(135deg,#0b4ea2_0%,#137fec_100%)] px-4 py-3 text-white shadow-sm">
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
        <ReactMarkdown components={mdComponents}>{String(message.content ?? '')}</ReactMarkdown>
        {attachments.map((a, i) => <AttachmentCard key={`${a.kind}-${i}`} attachment={a} onAsk={onAsk} role={role} />)}
        {showFollowUps && <AiSuggestionButtons suggestions={followUps(attachments)} onSelect={onAsk} />}
      </div>
    </div>
  );
}
