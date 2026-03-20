import AiAssistantPanel from '../components/AiAssistantPanel';

function AiChatPage() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-[linear-gradient(135deg,#0a1c34_0%,#102947_55%,#113f73_100%)] p-7 text-white shadow-[0_24px_70px_-40px_rgba(2,36,72,0.72)] sm:p-8">
        <p className="text-[0.64rem] uppercase tracking-[0.24em] text-sky-200/70">Asistente conversacional</p>
        <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold tracking-tight">
          Centro extendido del asistente operativo.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
          Esta vista mantiene el mismo modelo conversacional del chat flotante,
          pero con mas espacio para seguimiento y analisis.
        </p>
      </section>

      <AiAssistantPanel mode="page" />
    </div>
  );
}

export default AiChatPage;
