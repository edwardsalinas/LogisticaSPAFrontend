import { useCallback, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiService from '../../../services/apiService';
import LogiCompanion from './LogiCompanion';
import { ChatContext } from '../useAssistantChat';
import useLogiAlerts from '../alerts/useLogiAlerts';
import { canGuide, useGuidedRun } from '../guided/GuidedRunProvider';
import { applyGuidedOutcome } from '../guided/outcome';
import { trackLogi } from '../logiEvents';
import { getSpeakPref } from '../speakPref';

const OPS = ['admin', 'logistics_operator'];

/**
 * Logi en la pantalla: el compañero que pasea y habla, más los avisos proactivos. Aquí se decide qué pasa al aceptar un aviso:
 *  - «Que Logi lo haga»: el servidor prepara la propuesta (la misma comprobación que el botón «Preparar asignación»), y Logi la
 *    hace a la vista de todos. Aceptar el aviso equivale a pulsar «Que Logi lo haga» en la tarjeta: el aviso ya mostró qué se va a hacer.
 *  - «Ver…»: lleva a la pantalla donde se atiende.
 */
export default function LogiHost({ role, isAiOpen, assistant, lastReply, wander, onTogglePause, onToggle, panelId, onOpenChat }) {
  const location = useLocation();
  const navigate = useNavigate();
  const guided = useGuidedRun();
  const chat = useContext(ChatContext);

  const alerts = useLogiAlerts({ allowed: OPS.includes(role), pathname: location.pathname, busy: isAiOpen || Boolean(guided?.active) });

  const accept = useCallback(async (alert) => {
    trackLogi('alert_accepted', alert.type);
    alerts.dismiss();
    const { action } = alert;
    if (action?.kind === 'navigate') { navigate(action.to); return; }
    if (action?.kind !== 'prepare_assign') return;
    try {
      const res = await apiService.prepareAssignment({ route_ref: action.route_ref, codes: action.codes });
      const proposal = res?.data?.action;
      if (!proposal) throw new Error('No se pudo preparar la asignación.');
      if (guided && canGuide(proposal)) {
        const out = await guided.start(proposal, { aloud: getSpeakPref() });
        applyGuidedOutcome({ out, action: proposal, chat });
      } else {
        onOpenChat?.(); // sin el motor de Logi: se abre el chat para revisar y confirmar con el botón
      }
    } catch (err) {
      toast.error('No se pudo preparar la asignación', { description: err?.message });
    }
  }, [alerts, guided, chat, navigate, onOpenChat]);

  const pending = !isAiOpen && (assistant.status === 'confirm' || assistant.status === 'unread');

  return (
    <LogiCompanion
      open={isAiOpen}
      status={assistant.status}
      text={assistant.text}
      reply={lastReply}
      wander={wander}
      onToggle={onToggle}
      panelId={panelId}
      onTogglePause={onTogglePause}
      alert={alerts.alert}
      onAlertAccept={accept}
      onAlertSnooze={alerts.snooze}
      onAlertMute={alerts.mute}
      badge={pending ? (
        <span
          aria-hidden="true"
          data-testid="assistant-badge"
          className={`absolute right-0 top-3 h-3.5 w-3.5 rounded-full border-2 border-white ${assistant.status === 'confirm' ? 'bg-amber-500' : 'bg-sky-500'}`}
        />
      ) : null}
    />
  );
}
