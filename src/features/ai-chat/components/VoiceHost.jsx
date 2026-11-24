import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import usePersistentState from '../../../hooks/usePersistentState';
import useAssistantChat from '../useAssistantChat';
import { useVoiceDock, voiceDock } from '../voiceDock';
import VoiceMode from './VoiceMode';

/**
 * Anfitrión del chat de voz, en el layout. Por defecto es una barra compacta que deja ver la página (y a Logi trabajando);
 * la pantalla completa sigue disponible con el botón de expandir, y se recuerda. En la pantalla del Modo IA (que ya es
 * toda del asistente) se abre completa.
 */
export default function VoiceHost() {
  const dock = useVoiceDock();
  const chat = useAssistantChat();
  const { pathname } = useLocation();
  const [wantFull, setWantFull] = usePersistentState('asistente:voz-completa', false);
  useEffect(() => voiceDock.registerHost(), []);
  if (!dock.open) return null;
  const full = wantFull || pathname === '/assistant';
  return <VoiceMode chat={chat} compact={!full} onClose={voiceDock.close} onExpand={() => setWantFull(true)} onCompact={() => setWantFull(false)} />;
}
