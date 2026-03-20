function AiSuggestionButtons({ suggestions = [], onSelect }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion.value || suggestion.label)}
          className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-3.5 py-2 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-50 hover:border-primary-300"
        >
          {suggestion.icon && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-50 px-1 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-primary-600">
              {suggestion.icon}
            </span>
          )}
          {suggestion.label}
        </button>
      ))}
    </div>
  );
}

export default AiSuggestionButtons;
