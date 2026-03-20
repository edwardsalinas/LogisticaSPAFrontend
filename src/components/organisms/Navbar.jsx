import { LogOut } from 'lucide-react';
import { useAuth } from '../../app/AuthContext';

function Navbar({ title }) {
  const { logout } = useAuth();

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
