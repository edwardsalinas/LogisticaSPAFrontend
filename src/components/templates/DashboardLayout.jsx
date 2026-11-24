import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import AiAssistantPanel from '../../features/ai-chat/components/AiAssistantPanel';
import LogiHost from '../../features/ai-chat/components/LogiHost';
import VoiceHost from '../../features/ai-chat/components/VoiceHost';
import { useVoiceDock } from '../../features/ai-chat/voiceDock';
import { GuidedRunProvider } from '../../features/ai-chat/guided/GuidedRunProvider';
import CommandPalette from '../organisms/CommandPalette';
import Navbar from '../organisms/Navbar';
import Sidebar, { getNavItems } from '../organisms/Sidebar';
import { useAiMode } from '../../app/AiModeContext';
import useRole from '../../app/useRole';
import usePersistentState from '../../hooks/usePersistentState';
import useMediaQuery from '../../hooks/useMediaQuery';
import useAssistantChat from '../../features/ai-chat/useAssistantChat';
import { useAssistantStatus } from '../../features/ai-chat/assistantStatus';

const pageTitles = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/assistant': 'Asistente',
  '/logistics/packages': 'Paquetes',
  '/logistics/routes': 'Viajes',
  '/tracking': 'Trazabilidad',
  '/fleet': 'Flota',
  '/ai-chat': 'Asistente IA',
  '/analytics': 'Reportes',
  '/assistant/usage': 'Uso de la IA',
  '/driver': 'Mi viaje',
};

// Pantallas de detalle (p. ej. /logistics/packages/:id): llevan el título de su sección en lugar del genérico
const detailTitles = [
  ['/logistics/packages/', 'Paquetes'],
  ['/logistics/routes/', 'Viajes'],
  ['/tracking/', 'Tracking'],
];

const titleFor = (path) => pageTitles[path] || detailTitles.find(([prefix]) => path.startsWith(prefix))?.[1] || 'LogisticaSPA';

function DashboardLayout() {
  const location = useLocation();
  const { aiMode } = useAiMode();
  const { hasRole, role } = useRole();
  const onAssistantPage = location.pathname === '/assistant' || (location.pathname === '/' && aiMode);
  const title = onAssistantPage ? 'Asistente' : titleFor(location.pathname);
  // El panel del asistente sigue abierto al cambiar de pantalla (en escritorio) para poder ir a comprobar algo y volver
  // a la conversación; también se recuerda al recargar la pestaña.
  const [isAiOpen, setIsAiOpen] = usePersistentState('asistente:panel', false);
  const isWide = useMediaQuery('(min-width: 640px)');
  const chat = useAssistantChat();
  // Logi pasea por la pantalla; se puede dejar quieto desde el chat (se recuerda en esta pestaña)
  const [logiWalks, setLogiWalks] = usePersistentState('asistente:logi-camina', true);
  const lastReply = [...chat.messages].reverse().find((m) => m.role === 'assistant')?.content ?? '';
  const assistant = useAssistantStatus(chat, isAiOpen);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const showFloatingAssistant = !onAssistantPage;
  const aiPanelId = 'ai-assistant-panel';
  // Cuando Logi va a hacer una acción a la vista de todos, el panel se cierra para dejar el escenario libre
  const closePanelForLogi = useCallback(() => setIsAiOpen(false), [setIsAiOpen]);
  // Al hablar con Logi el panel de texto se cierra: queda la barra de voz y la página libre
  const voiceDock = useVoiceDock();
  useEffect(() => { if (voiceDock.open && !onAssistantPage) setIsAiOpen(false); }, [voiceDock.open, onAssistantPage, setIsAiOpen]);

  // En el celular el panel ocupa casi toda la pantalla: al navegar se cierra para dejar ver la pantalla de destino
  // (la conversación se conserva y vuelve al abrirlo)
  useEffect(() => {
    if (!isWide) setIsAiOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar al cambio de pantalla
  }, [location.pathname]);

  useEffect(() => {
    if (!isAiOpen) return undefined;
    // Escape cierra primero lo que esté encima (chat de voz, diálogos); el panel se cierra con la siguiente pulsación
    const onEsc = (e) => { if (e.key === 'Escape' && !document.querySelector('[role="dialog"], [data-logi-run]')) setIsAiOpen(false); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isAiOpen, setIsAiOpen]);

  // Ctrl+K (o Cmd+K) abre la paleta de comandos desde cualquier pantalla
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <GuidedRunProvider onBegin={closePanelForLogi}>
    <div className="app-shell flex min-h-screen bg-[radial-gradient(circle_at_top,rgba(19,127,236,0.08),transparent_34%),linear-gradient(180deg,#f5f8fc_0%,#eef3f9_100%)]">
      <a href="#main-content" className="skip-link">Saltar al contenido principal</a>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <VoiceHost />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[17rem]">
        <Navbar title={title} onOpenSearch={() => setPaletteOpen(true)} />
        <main id="main-content" tabIndex={-1} className="flex-1 px-4 pb-28 pt-24 outline-none sm:px-6 sm:pb-8 lg:px-8 lg:pb-20">
          <div className="motion-fade-up">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 lg:hidden" aria-label="Navegación principal móvil">
        <div className="mobile-bottom-nav no-scrollbar flex items-center gap-2 overflow-x-auto rounded-2xl border border-white/70 bg-white/88 px-2 py-2 shadow-lg backdrop-blur-2xl">
          {getNavItems(aiMode).filter((item) => hasRole(item.roles)).map((item) => {
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
          {/* Logi pasea por la parte baja (sobre el menú inferior en celular) y dice lo que el asistente tenga pendiente */}
          <LogiHost
            role={role}
            isAiOpen={isAiOpen}
            assistant={assistant}
            lastReply={lastReply}
            wander={logiWalks}
            onTogglePause={() => setLogiWalks((v) => !v)}
            onToggle={() => setIsAiOpen((prev) => !prev)}
            onOpenChat={() => setIsAiOpen(true)}
            panelId={aiPanelId}
          />
          <p role="status" className="sr-only">{isAiOpen ? '' : assistant.text}</p>

          {isAiOpen && (
            <>
              {/* Solo en celular el panel tapa la pantalla y necesita fondo. La capa deja libres la barra superior
                  (Modo IA, buscar, cerrar sesión) y la inferior (menú) para que sigan usándose con el chat abierto */}
              {!isWide && (
                <button
                  type="button"
                  className="fixed inset-x-0 bottom-24 top-[5.25rem] z-40 bg-slate-950/20"
                  onClick={() => setIsAiOpen(false)}
                  aria-label="Cerrar panel del asistente"
                />
              )}
              <div id={aiPanelId} className="fixed inset-x-4 bottom-24 top-20 z-50 sm:left-auto sm:right-6 sm:top-24 sm:w-[26rem] lg:right-8 lg:w-[28rem]">
                <AiAssistantPanel mode="panel" role={role} onClose={() => setIsAiOpen(false)} logiWalks={logiWalks} onToggleLogiWalk={() => setLogiWalks((v) => !v)} />
              </div>
            </>
          )}
        </>
      )}
    </div>
    </GuidedRunProvider>
  );
}

export default DashboardLayout;
