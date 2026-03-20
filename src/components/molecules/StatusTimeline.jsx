import { Check, Clock3, MapPinned } from 'lucide-react';

function StatusTimeline({ steps = [] }) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const isCompleted = step.completed;
        const isActive = step.active;
        const tone = isCompleted ? 'bg-emerald-500 text-white border-emerald-500' : isActive ? 'bg-primary-500 text-white border-primary-500 ring-4 ring-primary-100' : 'bg-white text-surface-400 border-surface-200';
        const lineTone = isCompleted ? 'bg-emerald-200' : 'bg-surface-200';

        return (
          <div key={`${step.label}-${index}`} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full border ${tone}`}>
                {isCompleted ? <Check size={16} strokeWidth={2.5} /> : <span className="text-xs font-bold">{index + 1}</span>}
              </div>
              {index < steps.length - 1 && <div className={`mt-2 min-h-12 w-0.5 ${lineTone}`} />}
            </div>

            <div className="flex-1 rounded-[1.2rem] border border-surface-100 bg-surface-50 px-4 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className={`text-sm font-semibold ${isActive || isCompleted ? 'text-surface-950' : 'text-surface-500'}`}>{step.label}</p>
                  {step.location && <p className="mt-1 flex items-center gap-1.5 text-xs text-surface-500"><MapPinned size={13} strokeWidth={2.2} /> {step.location}</p>}
                </div>
                {step.date && <span className="inline-flex items-center gap-1.5 text-xs text-surface-400"><Clock3 size={13} strokeWidth={2.2} /> {step.date}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default StatusTimeline;