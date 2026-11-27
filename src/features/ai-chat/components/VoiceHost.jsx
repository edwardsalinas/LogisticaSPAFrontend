import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import usePersistentState from '../../../hooks/usePersistentState';
import useAssistantChat from '../useAssistantChat';
import { useAiMode } from '../../../app/AiModeContext';
import useRole from '../../../app/useRole';
import { parseVoiceCommand } from '../guided/voiceCommands';
import { requestSearch, requestTab } from '../pageContext';
import { registerScreenRuntime } from '../screenCommands';
import { savePrefs, getPrefs } from '../alerts/alertPrefs';
import { setEnabled } from '../alerts/alertPolicy';
import { useVoiceDock, voiceDock } from '../voiceDock';
import VoiceMode from './VoiceMode';

/**
 * Anfitrión del chat de voz, en el layout. Por defecto es una barra compacta que deja ver la página (y a Logi trabajando);
 * la pantalla completa sigue disponible con el botón de expandir, y se recuerda. En la pantalla del Modo IA (que ya es
 * toda del asistente, incluido el Modo IA en la página principal) se abre completa.
 */
export default function VoiceHost({ onLogiWalk }) {
  const dock = useVoiceDock();
  const chat = useAssistantChat();
  const { pathname } = useLocation();
  const { aiMode } = useAiMode();
  const { role } = useRole();
  const navigate = useNavigate();
  const [wantFull, setWantFull] = usePersistentState('asistente:voz-completa', false);
  useEffect(() => voiceDock.registerHost(), []);
  useEffect(() => registerScreenRuntime(navigate, role), [navigate, role]); // las órdenes de pantalla del asistente («muéstrame los viajes de Oruro»)
  if (!dock.open) return null;
  // en la pantalla del asistente (y en el Modo IA, que convierte la página principal en el asistente) ya todo es del asistente: voz completa
  const full = wantFull || pathname === '/assistant' || (pathname === '/' && aiMode);
  /**
   * Órdenes de voz («llévame a Viajes», «cierra», «quédate quieto»…): se atienden aquí, sin gastar una consulta al asistente. Devuelve
   * null si la frase NO es una orden (entonces es para el asistente) o { say, close? } con lo que Logi responde en voz alta.
   */
  const onCommand = (text) => {
    const cmd = parseVoiceCommand(text, role);
    if (!cmd) return null;
    switch (cmd.kind) {
      case 'navigate':
        if (cmd.tab) requestTab(cmd.tab.page, cmd.tab.value);
        navigate(cmd.to);
        if (wantFull && cmd.to !== '/assistant') setWantFull(false); // se quiere ver la pantalla: de completa a barra compacta
        return { say: cmd.say };
      case 'filter':
        navigate(cmd.to);
        if (cmd.tab) requestTab(cmd.page, cmd.tab);
        requestSearch(cmd.page, cmd.text); // la tabla queda filtrada (o limpia, si fue «quita el filtro»)
        if (wantFull) setWantFull(false);
        return { say: cmd.say };
      case 'denied': return { say: `No tienes ${cmd.label} disponible con tu rol.` };
      case 'close': return { say: cmd.say, close: true };
      case 'walk': onLogiWalk?.(cmd.on); return { say: cmd.say };
      case 'alerts': savePrefs(setEnabled(getPrefs(), cmd.on)); return { say: cmd.say };
      default: return null;
    }
  };

  return <VoiceMode chat={chat} onCommand={onCommand} initialText={dock.initial} wake={dock.wake} compact={!full} onClose={voiceDock.close} onExpand={() => setWantFull(true)} onCompact={() => setWantFull(false)} />;
}
