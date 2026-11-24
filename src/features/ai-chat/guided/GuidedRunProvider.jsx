import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import apiService from '../../../services/apiService';
import { useSpeechSynthesis } from '../useVoice';
import { prefersReducedMotion, stripForSpeech } from '../voice';
import { getSpeakPref } from '../speakPref';
import { emitGuided, getGuidedForm, GUIDED_EVENTS, StopError } from './guidedForms';
import createPackage from './choreographies/createPackage';
import assignPackages, { MAX_GUIDED_ITEMS } from './choreographies/assignPackages';
import registerEvent, { MAX_GUIDED_EVENT_ITEMS } from './choreographies/registerEvent';
import LogiGuide from './LogiGuide';

/** Una coreografía por tipo de acción. Cada una se prueba y se mantiene por separado. */
const CHOREOGRAPHIES = { create_package: createPackage, assign_package: assignPackages, register_tracking_event: registerEvent };

/** Tope de paquetes que se muestran uno a uno por tipo de acción (sin tope = una sola unidad). */
const ITEM_CAP = { assign_package: MAX_GUIDED_ITEMS, register_tracking_event: MAX_GUIDED_EVENT_ITEMS };

const GuidedRunContext = createContext(null);
/** null fuera del layout (pantallas sueltas, pruebas): quien lo use debe tolerarlo. */
export const useGuidedRun = () => useContext(GuidedRunContext);

const IDLE = { active: false, x: 0, y: 0, dur: 0, moving: false, say: '', mood: 'idle', committed: false, fast: false };
const LOGI_W = 64;
const LOGI_H = 96;

const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';

/** ¿Hay una coreografía para esta acción y trae los datos para llenarla? */
export const canGuide = (action) => {
  if (!action || !CHOREOGRAPHIES[action.type] || !action.ui?.fill?.values) return false;
  const items = action.ui.fill.values.items;
  return !ITEM_CAP[action.type] || (Array.isArray(items) && items.length >= 1 && items.length <= ITEM_CAP[action.type]);
};

/**
 * Motor de «Logi lo hace por ti». Ejecuta la coreografía de una acción propuesta mostrando la pantalla: Logi se mueve,
 * cuenta lo que hace y llena el formulario. Mientras corre, una capa transparente intercepta los clics (tocar la pantalla
 * o pulsar Escape lo detiene) y un aviso permite «Detener» o «Hacerlo ya» (sin animación).
 * Solo el último paso cambia datos, y lo hace el servidor al confirmar la propuesta.
 */
export function GuidedRunProvider({ children, onBegin }) {
  const navigate = useNavigate();
  const synth = useSpeechSynthesis();
  const [ui, setUi] = useState(IDLE);
  const uiRef = useRef(ui);
  uiRef.current = ui;
  const runRef = useRef(null);
  const fastRef = useRef(false);
  const synthRef = useRef(synth);
  synthRef.current = synth;
  const patch = useCallback((p) => { uiRef.current = { ...uiRef.current, ...p }; setUi(uiRef.current); }, []);

  const makeCtx = useCallback((signal) => {
    const sleep = (ms) => new Promise((resolve, reject) => {
      if (signal.aborted) { reject(new StopError()); return; }
      const onAbort = () => { clearTimeout(t); reject(new StopError()); };
      const t = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, fastRef.current ? 0 : ms);
      signal.addEventListener('abort', onAbort, { once: true });
    });

    // espera real (no se acelera): hasta que la pantalla tenga lo que se necesita
    const waitFor = async (probe, timeout = 6000) => {
      const end = Date.now() + timeout;
      for (;;) {
        if (signal.aborted) throw new StopError();
        const found = probe();
        if (found) return found;
        if (Date.now() > end) throw new Error('La pantalla no respondió a tiempo');
        await new Promise((r) => setTimeout(r, 80));
      }
    };

    // Dice algo en el globo (y en voz alta si la lectura está activada). Con `wait` espera lo que tarda en leerse.
    const say = async (text, { wait = false } = {}) => {
      if (signal.aborted) throw new StopError();
      patch({ say: text, mood: 'talking' });
      const aloudNow = (runRef.current?.aloud || getSpeakPref()) && synthRef.current.supported && !fastRef.current;
      if (aloudNow) synthRef.current.speak(stripForSpeech(text));
      if (wait) await sleep(aloudNow ? Math.min(7000, 1200 + text.length * 65) : Math.min(2600, 700 + text.length * 28));
      patch({ mood: 'idle' });
    };

    const clearActive = () => document.querySelectorAll('[data-logi-active]').forEach((el) => el.removeAttribute('data-logi-active'));

    const pointAt = async (el) => {
      if (signal.aborted) throw new StopError();
      clearActive();
      el.scrollIntoView?.({ block: 'center', behavior: 'auto' });
      await new Promise((r) => requestAnimationFrame(r));
      const r = el.getBoundingClientRect();
      // a la izquierda del campo; si no cabe, a la derecha
      let x = r.left - LOGI_W - 14;
      if (x < 8) x = Math.min(window.innerWidth - LOGI_W - 8, r.right + 12);
      const y = Math.max(64, Math.min(window.innerHeight - LOGI_H - 8, r.top + r.height / 2 - LOGI_H * 0.7));
      const dist = Math.hypot(x - uiRef.current.x, y - uiRef.current.y);
      const dur = fastRef.current ? 0 : Math.round(Math.min(1100, Math.max(450, dist * 1.6)));
      el.setAttribute('data-logi-active', '');
      patch({ x, y, dur, moving: dur > 0 });
      await sleep(dur);
      patch({ moving: false });
    };

    const press = async (el, { click = true } = {}) => {
      el.classList.add('logi-press');
      await sleep(450);
      el.classList.remove('logi-press');
      if (click) el.click();
    };

    const typeInto = async (form, field, text) => {
      if (fastRef.current) { form.setValue(field, text); return; }
      for (let i = 1; i <= text.length; i += 1) {
        form.setValue(field, text.slice(0, i));
        await sleep(38);
      }
    };

    const confirm = async (action) => {
      if (signal.aborted) throw new StopError();
      runRef.current.committed = true; // desde aquí ya no se puede detener: la acción real está en marcha
      patch({ committed: true });
      return apiService.post(`/ai-agent/actions/${action.id}/confirm`);
    };

    const findVisible = (selector) => [...document.querySelectorAll(selector)].find(visible) ?? null;

    return { sleep, waitFor, say, pointAt, press, typeInto, confirm, findVisible, navigate, getForm: getGuidedForm };
  }, [navigate, patch]);

  // aloud: la persona está hablando con Logi (chat de voz): todo lo que cuenta se dice en voz alta, esté o no activada la lectura
  const start = useCallback((action, { aloud = false } = {}) => {
    if (runRef.current) return Promise.resolve({ error: new Error('Logi ya está haciendo otra cosa.') });
    if (!canGuide(action)) return Promise.resolve({ error: new Error('Esta acción no se puede mostrar paso a paso.') });

    const controller = new AbortController();
    runRef.current = { controller, committed: false, aloud };
    fastRef.current = prefersReducedMotion(); // con «reducir movimiento» todo ocurre al instante
    onBegin?.();
    patch({ ...IDLE, active: true, fast: fastRef.current, x: window.innerWidth - LOGI_W - 16, y: window.innerHeight - LOGI_H - 24 });

    return (async () => {
      try {
        const result = await CHOREOGRAPHIES[action.type](makeCtx(controller.signal), action);
        return { result };
      } catch (e) {
        if (!runRef.current?.committed) emitGuided(GUIDED_EVENTS.cancelForm); // nada a medias: el formulario se cierra
        return e instanceof StopError ? { stopped: true } : { error: e };
      } finally {
        document.querySelectorAll('[data-logi-active]').forEach((el) => el.removeAttribute('data-logi-active'));
        document.querySelectorAll('.logi-press').forEach((el) => el.classList.remove('logi-press'));
        synthRef.current.cancel();
        runRef.current = null;
        patch({ ...IDLE });
      }
    })();
  }, [makeCtx, onBegin, patch]);

  const stop = useCallback(() => {
    if (runRef.current && !runRef.current.committed) runRef.current.controller.abort();
  }, []);

  const speedUp = useCallback(() => { fastRef.current = true; patch({ fast: true }); }, [patch]);

  // Escape detiene a Logi (si aún no empezó la acción real)
  useEffect(() => {
    if (!ui.active) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); stop(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [ui.active, stop]);

  const value = useMemo(() => ({ active: ui.active, start }), [ui.active, start]);

  return (
    <GuidedRunContext.Provider value={value}>
      {children}
      {ui.active && createPortal(
        <>
          {/* capa transparente: tocar la pantalla mientras Logi trabaja lo detiene (nadie pelea con él por el formulario) */}
          <div data-logi-run className="fixed inset-0 z-[1250]" onPointerDown={stop} aria-hidden="true" />
          <LogiGuide ui={ui} />
          <div className="fixed left-1/2 top-3 z-[1310] flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-2xl border border-primary-200 bg-white px-3 py-2 shadow-xl">
            <span className="px-1 text-sm font-semibold text-surface-800"><span className="max-sm:hidden">Logi está trabajando por ti</span><span className="sm:hidden">Logi trabaja</span></span>
            {!ui.fast && (
              <button type="button" onClick={speedUp} className="min-h-11 rounded-xl border border-surface-200 px-3 text-sm font-semibold text-surface-700 hover:bg-surface-50">
                Hacerlo ya
              </button>
            )}
            <button
              type="button"
              onClick={stop}
              disabled={ui.committed}
              className="min-h-11 rounded-xl bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
            >
              Detener
            </button>
          </div>
          <p role="status" className="sr-only">{ui.say}</p>
        </>,
        document.body,
      )}
    </GuidedRunContext.Provider>
  );
}
