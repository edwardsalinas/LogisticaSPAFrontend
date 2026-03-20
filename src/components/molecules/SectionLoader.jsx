import Skeleton from '../atoms/Skeleton';

function SectionLoader({
  eyebrow = 'Cargando',
  title = 'Preparando contenido',
  description = 'Estamos reuniendo la informacion necesaria para esta vista.',
  className = '',
}) {
  return (
    <div className={`rounded-[1.6rem] border border-white/70 bg-white/88 p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl ${className}`}>
      <div className="max-w-xl">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-5 h-8 w-full max-w-md" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
        <Skeleton className="mt-2 h-4 w-5/6 max-w-lg" />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-[1.35rem] border border-surface-100 bg-surface-50/80 p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-2xl" />
              <div className="flex-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-2 h-3 w-20" />
              </div>
            </div>
            <Skeleton className="mt-5 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-4/5" />
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-3 text-[0.64rem] uppercase tracking-[0.2em] text-surface-500">
        <span>{eyebrow}</span>
        <span className="h-px w-12 bg-surface-200" />
        <span>{title}</span>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-surface-500">{description}</p>
    </div>
  );
}

export default SectionLoader;
