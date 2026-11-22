/**
 * Utilidades de voz (Web Speech API del navegador): sin servidor propio ni claves.
 * - Reconocimiento (voz → texto): Chrome, Edge y Safari. En Chrome el audio lo procesa Google.
 * - Síntesis (texto → voz): todos los navegadores modernos.
 */
export const getRecognitionClass = () =>
  typeof window === 'undefined' ? null : window.SpeechRecognition || window.webkitSpeechRecognition || null;

export const synthesisSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined';

const LANG_PREFERENCE = ['es-BO', 'es-US', 'es-MX', 'es-419', 'es-AR', 'es-CO', 'es-ES'];

/** Elige la voz en español más cercana al español de Bolivia entre las que ofrece el navegador. */
export const pickSpanishVoice = (voices = []) => {
  const spanish = voices.filter((v) => /^es/i.test(v.lang));
  if (spanish.length === 0) return null;
  for (const lang of LANG_PREFERENCE) {
    const match = spanish.find((v) => v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase());
    if (match) return match;
  }
  return spanish[0];
};

const SPELL = (s) => s.split('').join(' ');

/**
 * Texto de la respuesta → texto agradable de escuchar: sin markdown, emojis, enlaces ni símbolos, y sin leer
 * códigos de rastreo enteros ("TRK-1795301842652-9113E39E" → "paquete que termina en 9 1 1 3").
 */
export const stripForSpeech = (text) => {
  let t = String(text ?? '');
  t = t.replace(/```[\s\S]*?```/g, ' ');                                   // bloques de código
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');                            // enlaces markdown → su texto
  t = t.replace(/https?:\/\/\S+/g, ' ');                                    // URLs
  t = t.replace(/TRK-\d+-([A-Z0-9]{4,})/gi, (_, tail) => `paquete que termina en ${SPELL(tail.slice(0, 4))}`);
  t = t.replace(/[*_`#>|~]/g, ' ');                                         // marcas de markdown
  t = t.replace(/^\s*[-•]\s+/gm, '');                                       // viñetas
  t = t.replace(/→|->/g, ' a ');
  t = t.replace(/(\d+(?:[.,]\d+)?)\s*%/g, '$1 por ciento');
  t = t.replace(/(\d+(?:[.,]\d+)?)\s*kg\b/gi, '$1 kilos');
  t = t.replace(/(\d+(?:[.,]\d+)?)\s*km\b/gi, '$1 kilómetros');
  t = t.replace(/\p{Extended_Pictographic}/gu, ' ');                        // emojis
  t = t.replace(/\s*\n+\s*/g, '. ').replace(/\.\s*\./g, '.');               // saltos de línea → pausas
  return t.replace(/\s{2,}/g, ' ').trim();
};

/** Parte el texto en trozos cortos: Chrome corta las locuciones largas (~15 s) si se envían de una vez. */
export const chunkForSpeech = (text, max = 180) => {
  // se parte DESPUÉS de . ! ? (conservando los signos de apertura ¡ ¿ de la oración siguiente)
  const sentences = String(text ?? '').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const chunks = [];
  let current = '';
  for (const s of sentences) {
    if (s.length > max) {
      if (current) { chunks.push(current); current = ''; }
      for (let i = 0; i < s.length; i += max) chunks.push(s.slice(i, i + max));
    } else if ((current + ' ' + s).trim().length > max) {
      chunks.push(current);
      current = s;
    } else {
      current = (current + ' ' + s).trim();
    }
  }
  if (current) chunks.push(current);
  return chunks;
};

/** Código de error del reconocimiento → mensaje para el usuario (o null si no hay nada que decir). */
export const recognitionErrorMessage = (code) => {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'No tengo permiso para usar el micrófono. Permítelo en el candado de la barra de direcciones del navegador.';
    case 'audio-capture':
      return 'No encuentro un micrófono. Conecta uno e inténtalo de nuevo.';
    case 'network':
      return 'El reconocimiento de voz necesita conexión a internet.';
    case 'language-not-supported':
      return 'Tu navegador no reconoce el español en este equipo.';
    default:
      return null; // 'no-speech', 'aborted': no se muestra error
  }
};

/** Respuesta con markdown → texto plano para mostrar (conserva códigos y números). */
export const plainText = (text) =>
  String(text ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>~]/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\s*[\r\n]+\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

/** ¿El usuario pidió menos movimiento? (el desplazamiento animado también cuenta) */
export const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
