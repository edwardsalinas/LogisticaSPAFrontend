import Skeleton from '../atoms/Skeleton';

function PageSkeleton({ stats = 4, layout = 'split', className = '' }) {
  return (
    <div className={`space-y-8 ${className}`}>
      <section className="rounded-[2rem] border border-white/70 bg-white/88 p-8 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-6 h-16 w-full max-w-3xl" />
        <Skeleton className="mt-3 h-5 w-full max-w-2xl" />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full sm:col-span-2 lg:col-span-1" />
        </div>
      </section>

      <section className={`grid grid-cols-1 gap-5 ${stats === 4 ? 'xl:grid-cols-4' : stats === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-2'}`}>
        {Array.from({ length: stats }).map((_, index) => (
          <div key={index} className="rounded-[1.6rem] border border-white/70 bg-white/88 p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
            <Skeleton className="h-11 w-11" />
            <Skeleton className="mt-5 h-4 w-28" />
            <Skeleton className="mt-3 h-9 w-24" />
            <Skeleton className="mt-4 h-4 w-full" />
          </div>
        ))}
      </section>

      {layout === 'split' && (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(20rem,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-[1.8rem] border border-white/70 bg-white/88 p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="mt-5 h-11 w-full" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-24 w-full" />)}
            </div>
          </div>
          <div className="rounded-[1.8rem] border border-white/70 bg-white/88 p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
            <Skeleton className="h-[32rem] w-full" />
          </div>
        </section>
      )}

      {layout === 'table' && (
        <section className="rounded-[1.8rem] border border-white/70 bg-white/88 p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-11 w-full lg:w-80" />
          </div>
          <div className="mt-6 space-y-3">
            {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)}
          </div>
        </section>
      )}

      {layout === 'map' && (
        <section className="rounded-[1.8rem] border border-white/70 bg-white/88 p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="mt-4 h-[34rem] w-full rounded-[1.6rem]" />
        </section>
      )}

      {layout === 'dashboard' && (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">
          <div className="rounded-[1.8rem] border border-white/70 bg-white/88 p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl">
            <Skeleton className="h-6 w-52" />
            <div className="mt-6 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-20 w-full" />)}
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-[1.8rem] border border-white/70 bg-white/88 p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl"><Skeleton className="h-72 w-full" /></div>
            <div className="rounded-[1.8rem] border border-white/70 bg-white/88 p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl"><Skeleton className="h-56 w-full" /></div>
          </div>
        </section>
      )}
    </div>
  );
}

export default PageSkeleton;