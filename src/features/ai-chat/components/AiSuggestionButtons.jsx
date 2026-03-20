/**
 * AiSuggestionButtons - Botones de respuesta rápida para sugerencias del AI
 * @param {Array} suggestions - Array de sugerencias {label, value}
 * @param {function} onSelect - Callback al seleccionar una sugerencia
 */
function AiSuggestionButtons({ suggestions = [], onSelect }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="ai-suggestion-buttons flex flex-wrap gap-2 mt-3">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion.value || suggestion.label)}
          className="ai-suggestion-buttons__btn px-4 py-2 text-sm font-medium text-primary-500 bg-white border border-primary-200 rounded-full hover:bg-primary-50 hover:border-primary-300 transition-colors"
        >
          {suggestion.icon && <span className="mr-1.5">{suggestion.icon}</span>}
          {suggestion.label}
        </button>
      ))}
    </div>
  );
}

export default AiSuggestionButtons;
