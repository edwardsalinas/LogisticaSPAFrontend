import { stripForSpeech } from '../voice';

/**
 * Confirmación por voz de una acción propuesta («sí, hazlo» / «cancela»). El reconocimiento de voz se equivoca, y aquí un
 * error cambia datos reales, así que la regla es PRUDENTE: solo cuenta como «sí» una frase corta y afirmativa, sin
 * ninguna negación. Cualquier duda (frase larga, mezcla de sí y no, otra cosa) es «unclear» y se vuelve a preguntar.
 */
const MAX_WORDS = 6; // «sí, pero cambia el peso» NO debe ejecutar nada

const YES = new Set(['si', 'claro', 'dale', 'hazlo', 'confirmo', 'confirma', 'confirmalo', 'confirmado', 'adelante', 'procede', 'ejecuta', 'ejecutalo', 'ok', 'okay', 'vale', 'correcto', 'afirmativo']);
const NO = new Set(['no', 'cancela', 'cancelar', 'cancelalo', 'cancelado', 'detente', 'alto', 'olvidalo', 'dejalo', 'negativo', 'nada']);

const normalize = (text) => String(text ?? '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '') // sin tildes: «sí» = «si»
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/** @returns {'yes' | 'no' | 'unclear'} */
export const parseVoiceConfirmation = (text) => {
  const words = normalize(text).split(' ').filter(Boolean);
  if (words.length === 0 || words.length > MAX_WORDS) return 'unclear';
  const joined = ` ${words.join(' ')} `;
  const yes = words.some((w) => YES.has(w)) || joined.includes(' de acuerdo ');
  const no = words.some((w) => NO.has(w)) || joined.includes(' mejor no ');
  if (yes && !no) return 'yes';
  if (no && !yes) return 'no';
  return 'unclear';
};

/** Lo que Logi dice en voz alta antes de pedir el «sí»: el resumen que redactó el servidor, no el modelo. */
const MAX_SPOKEN = 420; // caracteres: con 10 paquetes la lista completa se leería durante minutos

export const spokenProposal = (action) => {
  const full = stripForSpeech(`${action.title}. ${(action.lines ?? []).join('. ')}.`);
  if (full.length <= MAX_SPOKEN) return full;
  const cut = full.slice(0, MAX_SPOKEN);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(', '));
  return `${(end > 120 ? cut.slice(0, end) : cut).trim()}. El resto del detalle está en pantalla.`;
};

/**
 * Qué acciones se pueden confirmar por voz. La entrega y la anulación de un paquete NO: son las más difíciles de deshacer, así que se
 * confirman siempre con un clic. Asignar un conductor o crear un viaje sí: se corrigen después (se asigna otro, se borra el viaje).
 */
export const VOICE_CONFIRMABLE = new Set(['create_package', 'assign_package', 'register_tracking_event', 'assign_driver', 'create_trip']);
/** Las que NO tienen coreografía (Logi no las hace a la vista): el «sí» las confirma directamente en el servidor. */
export const VOICE_DIRECT = new Set(['assign_driver', 'create_trip']);
export const isVoiceDirect = (action) => VOICE_DIRECT.has(action?.type);
export const isVoiceConfirmable = (action) => VOICE_CONFIRMABLE.has(action?.type);

export const CONFIRM_PROMPT = '¿Lo hago? Di «sí, hazlo» o «cancela».';
export const REPEAT_PROMPT = 'No te entendí. Di «sí, hazlo» para que lo haga, o «cancela».';
