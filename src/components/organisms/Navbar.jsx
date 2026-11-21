import { LogOut, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import { useAiMode } from '../../app/AiModeContext';

function Navbar({ title }) {
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
      <div className="mx-3 mt-3 flex min-h-16 items-center justify-between rounded-2xl border border-white/55 bg-white/78 px-4 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:mx-6 sm:mt-4 sm:h-16 sm:px-5 lg:mx-8">
        <div className="min-w-0">
          <p className="text-[0.56rem] uppercase tracking-[0.24em] text-surface-500 sm:text-[0.6rem]">Control logistico</p>
          <h1 className="truncate text-base font-bold tracking-tight text-surface-900 sm:text-lg">{title}</h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[0.68rem] font-semibold text-emerald-700 sm:flex">
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
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all duration-200 sm:px-3.5 ${aiMode ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-surface-200 bg-white text-surface-600 hover:bg-surface-50'}`}
          >
            <Sparkles size={16} strokeWidth={2.2} aria-hidden="true" />
            <span className="hidden sm:inline">Modo IA</span>
            <span aria-hidden="true" className={`relative inline-block h-5 w-9 rounded-full transition-colors ${aiMode ? 'bg-primary-500' : 'bg-surface-300'}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${aiMode ? 'left-[1.15rem]' : 'left-0.5'}`} />
            </span>
          </button>

          <button
            onClick={logout}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition-all duration-200 hover:bg-red-50 sm:px-3.5"
          >
            <LogOut size={16} strokeWidth={2.2} />
            <span className="hidden sm:inline">Cerrar sesion</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
