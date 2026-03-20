/**
 * StatusTimeline - Timeline horizontal de estados de envío
 * @param {Array} steps - Array de pasos {label, date, location, completed, active}
 */
function StatusTimeline({ steps = [] }) {
  return (
    <div className="status-timeline">
      <div className="status-timeline__container">
        {steps.map((step, index) => {
          const isCompleted = step.completed;
          const isActive = step.active;
          const isPending = !isCompleted && !isActive;

          return (
            <div key={index} className="status-timeline__step">
              {/* Línea conectora (excepto último) */}
              {index < steps.length - 1 && (
                <div
                  className={`status-timeline__line ${
                    isCompleted ? 'status-timeline__line--completed' : ''
                  }`}
                />
              )}

              {/* Círculo del paso */}
              <div
                className={`status-timeline__dot ${
                  isCompleted
                    ? 'status-timeline__dot--completed'
                    : isActive
                    ? 'status-timeline__dot--active'
                    : 'status-timeline__dot--pending'
                }`}
              >
                {isCompleted && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
                {isActive && (
                  <div className="status-timeline__dot--pulse" />
                )}
              </div>

              {/* Información del paso */}
              <div className="status-timeline__info">
                <p
                  className={`status-timeline__label ${
                    isActive ? 'status-timeline__label--active' : ''
                  }`}
                >
                  {step.label}
                </p>
                {step.date && (
                  <p className="status-timeline__date">{step.date}</p>
                )}
                {step.location && (
                  <p className="status-timeline__location">{step.location}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StatusTimeline;
