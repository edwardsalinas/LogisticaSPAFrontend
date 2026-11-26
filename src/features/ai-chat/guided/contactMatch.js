import { normalize } from './speechParse';

/**
 * Reconocer a un contacto conocido (remitente o destinatario frecuente) aunque el micrófono haya oído mal el nombre.
 * El reconocimiento de voz suele confundir letras que en español suenan igual («Quispe» / «Kispe», «Vargas» / «Bargas», «Hernán» /
 * «Ernán», «Llanos» / «Yanos»), así que se compara cómo SUENAN los nombres, no cómo se escriben. Es prudente a propósito: solo propone
 * cuando hay UN candidato claro (con empates no propone nada) y la persona siempre lo confirma antes de usarlo.
 */

/** Una palabra → una clave que se parece a cómo suena en español. */
const soundOf = (word) => {
  let w = normalize(word).replace(/[.,]/g, '');
  w = w
    .replace(/^h/, '').replace(/h/g, (m, i, s) => (s[i - 1] === 'c' ? m : '')) // la h no suena (salvo «ch»)
    .replace(/ll/g, 'y').replace(/w/g, 'u').replace(/x/g, 'ks')
    .replace(/qu(?=[ei])/g, 'k').replace(/q/g, 'k')
    .replace(/gu(?=[ei])/g, 'g').replace(/g(?=[ei])/g, 'j')
    .replace(/c(?=[ei])/g, 's').replace(/z/g, 's').replace(/c(?!h)/g, 'k')
    .replace(/v/g, 'b')
    .replace(/(.)\1+/g, '$1'); // letras dobles
  return w;
};

export const soundKey = (name) => normalize(name).split(' ').filter(Boolean).map(soundOf).join(' ');

/** Distancia de edición (cuántas letras hay que cambiar, quitar o poner para pasar de una a otra). */
export const distance = (a, b) => {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const keep = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = keep;
    }
  }
  return prev[b.length];
};

export const allowed = (len) => (len <= 5 ? 0 : len <= 9 ? 1 : 2); // los nombres cortos casi no admiten error: «Ana» no es «Ada»

/**
 * Lo que se oyó + la lista de contactos → { contact, exact } o null.
 *  exact: el texto coincide con el contacto (solo cambian mayúsculas o tildes): se puede usar sin preguntar.
 * Con empates entre dos contactos distintos devuelve null: preguntar por uno de los dos sería adivinar.
 */
export const suggestContact = (heard, contacts) => {
  const list = (contacts ?? []).filter((c) => c?.name);
  const text = normalize(heard);
  if (!text || text.length < 3 || !list.length) return null;

  const exactOnes = list.filter((c) => normalize(c.name) === text);
  if (exactOnes.length === 1) return { contact: exactOnes[0], exact: true };
  if (exactOnes.length > 1) return null;

  const hk = soundKey(heard);
  const oneWord = !hk.includes(' ');
  const scored = list.map((contact) => {
    const ck = soundKey(contact.name);
    const whole = Math.abs(hk.length - ck.length) <= 3 ? distance(hk, ck) : Infinity;
    let best = whole <= allowed(Math.max(hk.length, ck.length)) ? whole : Infinity;
    // una sola palabra («Quispe») puede ser el nombre o el apellido de un contacto
    if (oneWord && best === Infinity && hk.length >= 4) {
      for (const token of ck.split(' ')) {
        const d = distance(hk, token);
        if (d <= allowed(Math.max(hk.length, token.length))) best = Math.min(best, d + 0.5);
      }
    }
    return { contact, score: best };
  }).filter((s) => Number.isFinite(s.score)).sort((a, b) => a.score - b.score);

  if (!scored.length) return null;
  if (scored[1] && scored[1].score === scored[0].score) return null; // dos igual de parecidos: no se adivina
  return { contact: scored[0].contact, exact: false };
};

/**
 * ¿Todas las palabras que se oyeron SUENAN como alguna palabra de este nombre? Sirve para encontrar un paquete cuando el micrófono entendió
 * mal el nombre («kispe» por «Quispe»). Prudente: palabras de menos de 4 letras no se comparan por sonido (casi cualquiera coincidiría) y
 * cada palabra solo admite el error que permite su longitud.
 */
export const soundMatches = (heardTokens, name) => {
  const mine = soundKey(name).split(' ').filter(Boolean);
  const heard = (heardTokens ?? []).map((t) => soundKey(t)).filter((t) => t.length >= 4);
  if (!heard.length || !mine.length) return false;
  return heard.every((h) => mine.some((m) => Math.abs(h.length - m.length) <= 2 && distance(h, m) <= allowed(Math.max(h.length, m.length))));
};

/** «71234567» → «terminado en 4567» (se dice en voz alta sin leer todo el número). */
export const phoneTail = (phone) => {
  const d = String(phone ?? '').replace(/\D/g, '');
  return d.length >= 4 ? d.slice(-4).split('').join(' ') : '';
};
