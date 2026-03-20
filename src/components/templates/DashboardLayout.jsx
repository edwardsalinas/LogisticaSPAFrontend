import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import AiAssistantPanel from '../../features/ai-chat/components/AiAssistantPanel';
import Navbar from '../organisms/Navbar';
import Sidebar, { navItems } from '../organisms/Sidebar';

const pageTitles = {
  '/': 'Dashboard',
  '/logistics/packages': 'Gestion de Paquetes',
  '/logistics/routes': 'Monitoreo de Rutas',
  '/tracking': 'Trazabilidad',
  '/fleet': 'Gestion de Flota',
  '/ai-chat': 'Asistente IA',
  '/analytics': 'Analitica',
};

function DashboardLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'LogisticaSPA';
  const [isAiOpen, setIsAiOpen] = useState(false);
  const showFloatingAssistant = location.pathname !== '/ai-chat';
  const aiPanelId = 'ai-assistant-panel';

  useEffect(() => {
    setIsAiOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell flex min-h-screen bg-[radial-gradient(circle_at_top,rgba(19,127,236,0.08),transparent_34%),linear-gradient(180deg,#f5f8fc_0%,#eef3f9_100%)]">
      <a href="#main-content" className="skip-link">Saltar al contenido principal</a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[17rem]">
        <Navbar title={title} />
        <main id="main-content" tabIndex={-1} className="flex-1 px-4 pb-28 pt-24 outline-none sm:px-6 sm:pb-8 lg:px-8 lg:pb-6">
          <div className="motion-fade-up">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 lg:hidden" aria-label="Navegacion principal movil">
        <div className="mobile-bottom-nav no-scrollbar flex items-center gap-2 overflow-x-auto rounded-[1.6rem] border border-white/70 bg-white/88 px-2 py-2 shadow-[0_24px_50px_-28px_rgba(15,23,42,0.28)] backdrop-blur-2xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `mobile-bottom-nav__item ${isActive ? 'mobile-bottom-nav__item--active' : ''}`}
              >
                {({ isActive }) => (
                  <>
                    <div className={`mobile-bottom-nav__icon ${isActive ? 'mobile-bottom-nav__icon--active' : ''}`}>
                      <Icon size={17} strokeWidth={2.2} />
                    </div>
                    <span className="mobile-bottom-nav__label">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {showFloatingAssistant && (
        <>
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-end px-4 pb-24 sm:px-6 sm:pb-4 lg:px-8 lg:pb-4">
            <button
              type="button"
              onClick={() => setIsAiOpen((prev) => !prev)}
              className={`pointer-events-auto flex items-center gap-3 rounded-[1.5rem] border px-4 py-3 text-left shadow-[0_22px_55px_-24px_rgba(2,36,72,0.35)] backdrop-blur-xl transition-all duration-300 ${
                isAiOpen
                  ? 'border-sky-300/70 bg-[#0a2745] text-white'
                  : 'bg-white/90 text-surface-900 border-white/75 hover:-translate-y-0.5 hover:bg-white'
              }`}
              aria-label={isAiOpen ? 'Cerrar asistente IA' : 'Abrir asistente IA'}
              aria-expanded={isAiOpen}
              aria-controls={aiPanelId}
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-300 ${isAiOpen ? 'bg-sky-400 text-[#06203b] rotate-[10deg]' : 'bg-[linear-gradient(135deg,#0b4ea2_0%,#137fec_100%)] text-white'}`}>
                <Sparkles size={18} strokeWidth={2.2} />
              </div>
              <div className="hidden min-w-0 sm:block">
                <p className={`text-[0.62rem] uppercase tracking-[0.24em] ${isAiOpen ? 'text-sky-100/70' : 'text-surface-500'}`}>
                  Copiloto operativo
                </p>
                <p className="text-sm font-semibold">
                  {isAiOpen ? 'Cerrar chat' : 'Abrir asistente'}
                </p>
              </div>
            </button>
          </div>

          {isAiOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[2px]"
                onClick={() => setIsAiOpen(false)}
                aria-label="Cerrar panel del asistente"
              />
              <div id={aiPanelId} className="fixed inset-x-4 bottom-24 top-20 z-50 sm:left-auto sm:right-6 sm:top-24 sm:w-[26rem] lg:right-8 lg:w-[28rem]">
                <AiAssistantPanel mode="panel" onClose={() => setIsAiOpen(false)} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default DashboardLayout;
