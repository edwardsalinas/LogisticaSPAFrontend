function AiSuggestionButtons({ suggestions = [], onSelect }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion.value || suggestion.label)}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-primary-200 bg-white px-4 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-50 hover:border-primary-300"
        >
          {suggestion.icon && <suggestion.icon size={14} strokeWidth={2.2} aria-hidden="true" className="shrink-0 text-primary-600" />}
          {suggestion.label}
        </button>
      ))}
    </div>
  );
}

export default AiSuggestionButtons;
