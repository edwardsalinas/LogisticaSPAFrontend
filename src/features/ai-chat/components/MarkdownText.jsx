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

// Algunos modelos escriben guiones "especiales" (U+2010, U+2011, U+2012, U+2212) dentro de los códigos (TRK\u20111795\u2011AB):
// se ven iguales, pero al copiar el código y buscarlo no coincide con el real. Entre letras o números se vuelven un guion normal.
export const normalizeHyphens = (text) => text.replace(/(?<=[A-Za-z0-9])[\u2010\u2011\u2012\u2212](?=[A-Za-z0-9])/g, '-');

export default function MarkdownText({ children }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{normalizeHyphens(String(children ?? ''))}</ReactMarkdown>;
}
