import ReactMarkdown from 'react-markdown';

// Markdown seguro (react-markdown no interpreta HTML): negritas, listas y código con el estilo de la aplicación.
// Vive en su propio archivo para cargarse bajo demanda: la librería no debe pesar en el paquete principal.
const mdComponents = {
  p: (props) => <p className="whitespace-pre-wrap text-sm leading-relaxed [&:not(:first-child)]:mt-2" {...props} />,
  ul: (props) => <ul className="mt-2 list-disc space-y-1 pl-5 text-sm" {...props} />,
  ol: (props) => <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm" {...props} />,
  strong: (props) => <strong className="font-semibold text-surface-950" {...props} />,
  code: (props) => <code className="rounded bg-surface-100 px-1.5 py-0.5 font-mono text-[0.8em] text-surface-800" {...props} />,
  a: ({ children }) => <span className="font-semibold text-primary-700">{children}</span>, // sin enlaces externos desde el modelo
};

export default function MarkdownText({ children }) {
  return <ReactMarkdown components={mdComponents}>{String(children ?? '')}</ReactMarkdown>;
}
