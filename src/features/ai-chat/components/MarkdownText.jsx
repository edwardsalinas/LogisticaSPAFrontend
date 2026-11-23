import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Markdown seguro (react-markdown no interpreta HTML): negritas, listas, tablas y código con el estilo de la aplicación.
// Vive en su propio archivo para cargarse bajo demanda: la librería no debe pesar en el paquete principal.
// remark-gfm agrega las tablas: sin él, una respuesta con tabla se vería como texto con barras ("| a | b |").
const mdComponents = {
  p: (props) => <p className="whitespace-pre-wrap text-sm leading-relaxed [&:not(:first-child)]:mt-2" {...props} />,
  ul: (props) => <ul className="mt-2 list-disc space-y-1 pl-5 text-sm" {...props} />,
  ol: (props) => <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm" {...props} />,
  strong: (props) => <strong className="font-semibold text-surface-950" {...props} />,
  code: (props) => <code className="rounded bg-surface-100 px-1.5 py-0.5 font-mono text-[0.8em] text-surface-800" {...props} />,
  a: ({ children }) => <span className="font-semibold text-primary-700">{children}</span>, // sin enlaces externos desde el modelo
  // Las tablas pueden ser más anchas que el mensaje (sobre todo en el celular): se desplazan sin romper la página
  table: (props) => (
    <div className="mt-2 overflow-x-auto rounded-xl border border-surface-200">
      <table className="w-full min-w-max border-collapse text-left text-sm" {...props} />
    </div>
  ),
  thead: (props) => <thead className="bg-surface-50" {...props} />,
  th: (props) => <th scope="col" className="border-b border-surface-200 px-3 py-2 text-xs font-semibold text-surface-700" {...props} />,
  td: (props) => <td className="border-b border-surface-100 px-3 py-2 align-top text-surface-800" {...props} />,
};

export default function MarkdownText({ children }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{String(children ?? '')}</ReactMarkdown>;
}
