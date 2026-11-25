/**
 * «Hey Logi»: reconocer la frase de activación en lo que oye el micrófono. El reconocimiento de voz del navegador
 * transcribe mal los nombres propios («hey logan», «ey lógica», «hey logui»), así que se aceptan las variantes más
 * comunes. Se EXIGE el saludo («hey», «oye»…): la palabra «logi» sola, o «login», no despiertan a Logi.
 */
const GREETING = '(?:hey|hei|hay|ey|ei|oye|oiga)';
const NAME = '(?:logi|logui|loggi|loggy|logy|loji|lochi|lugi|lugui|logis|logan|logica|logis)';
const WAKE = new RegExp(`(?:^|[^a-z0-9])${GREETING}[ ]+${NAME}(?![a-z0-9])`);

// minúsculas y sin tildes, SIN cambiar la longitud (así la posición en el texto normalizado sirve en el original)
const flat = (text) => String(text ?? '').toLowerCase().replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i').replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u').replace(/[^a-z0-9ñ]/g, ' ');

/**
 * ¿Dijo «hey Logi»? Devuelve { rest } con lo que siguió a la frase, tal como se dijo (puede ser ''), o null si no la dijo.
 * «hey logi ayúdame a crear un paquete» → { rest: 'ayúdame a crear un paquete' }.
 */
export const matchWake = (text) => {
  const original = String(text ?? '');
  const m = WAKE.exec(flat(original));
  if (!m) return null;
  const end = m.index + m[0].length;
  return { rest: original.slice(end).replace(/^[\s,.;:!?-]+/, '').trim() };
};
