import { LogOut, Search, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import { useAiMode } from '../../app/AiModeContext';

function Navbar({ title, onOpenSearch }) {
  const { logout } = useAuth();
  const { aiMode, toggleAiMode } = useAiMode();
  const navigate = useNavigate();

  // Al activar el Modo IA se pasa directamente al asistente
  const handleToggleAiMode = () => {
    toggleAiMode();
    if (!aiMode) navigate('/');
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-30 lg:left-[17rem]">
      <div className="mx-3 mt-3 flex min-h-16 items-center justify-between rounded-2xl border border-white/55 bg-white/78 px-4 shadow-sm backdrop-blur-xl sm:mx-6 sm:mt-4 sm:h-16 sm:px-5 lg:mx-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <h1 className="truncate whitespace-nowrap text-base font-bold tracking-tight text-surface-900 sm:text-lg">{title}</h1>
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Buscar o ir a (Ctrl+K)"
            aria-keyshortcuts="Control+K"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-surface-200 bg-white px-2.5 py-2 text-sm text-surface-600 sm:min-h-0 sm:min-w-0 transition-colors hover:bg-surface-100 sm:px-3"
          >
            <Search size={16} strokeWidth={2.2} aria-hidden="true" />
            <span className="hidden whitespace-nowrap md:inline lg:hidden xl:inline">Buscar o ir a…</span>
            <kbd className="hidden rounded border border-surface-200 bg-surface-50 px-1.5 text-xs font-medium text-surface-600 xl:inline">Ctrl K</kbd>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:flex lg:hidden xl:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Sistema operativo
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={aiMode}
            aria-label="Modo IA"
            title={aiMode ? 'Modo IA activado: la aplicación abre en el asistente' : 'Activa el Modo IA para abrir la aplicación en el asistente'}
            onClick={handleToggleAiMode}
            className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-semibold transition-all duration-200 sm:min-h-0 sm:px-3.5 ${aiMode ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-surface-200 bg-white text-surface-600 hover:bg-surface-50'}`}
          >
            <Sparkles size={16} strokeWidth={2.2} aria-hidden="true" />
            <span className="hidden whitespace-nowrap sm:inline">Modo IA</span>
            <span aria-hidden="true" className={`relative inline-block h-5 w-9 rounded-full transition-colors ${aiMode ? 'bg-primary-500' : 'bg-surface-300'}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${aiMode ? 'left-[1.15rem]' : 'left-0.5'}`} />
            </span>
          </button>

          <button
            onClick={logout}
            aria-label="Cerrar sesión"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-surface-200 bg-white px-3 py-2 text-sm font-semibold text-surface-700 sm:min-h-0 sm:min-w-0 transition-all duration-200 hover:bg-surface-100 sm:px-3.5"
          >
            <LogOut size={16} strokeWidth={2.2} />
            <span className="hidden whitespace-nowrap sm:inline lg:hidden xl:inline">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
