/**
 * Entender lo que la persona DICE mientras Logi le ayuda a llenar un formulario. El reconocimiento de voz del navegador
 * devuelve texto libre («tres kilos y medio», «siete uno dos…», «la paz»), así que todo se interpreta con reglas simples y
 * PRUDENTES: ante la duda se devuelve null y Logi vuelve a preguntar; nunca se inventa un dato.
 */

/** Minúsculas, sin tildes ni signos y con espacios simples. */
export const normalize = (text = '') => String(text)
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9., ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// ---------------------------------------------------------------- ¿pide ayuda para llenar un formulario?
const CREATE_VERB = /\b(crear|crea|creame|registrar|registra|registrame|nuevo|nueva|agregar|agrega|anadir|hacer|haz|armar|armame|enviar|mandar|ingresar|cargar)\b/;
const PACKAGE_NOUN = /\b(paquete|paquetes|envio|encomienda|encargo)\b/;

const ASSIGN_VERB = /\b(asignar|asigna|asignarlo|asignarle|vincular|vincula|agendar|agenda|meter|mete|poner|pon|subir|sube|cargar|carga|ubicar)\b/;
const TRIP_NOUN = /\b(viaje|viajes|despacho|ruta|camion|salida)\b/;

/**
 * «Ayúdame a crear un paquete» (sin datos) → { form: 'package' }. Si la frase ya trae los datos (kilos, números, «de X a Y»),
 * NO es una petición de ayuda sino una orden completa: la atiende el asistente de siempre, que prepara la propuesta.
 */
export const detectFormAssist = (text) => {
  const t = normalize(text);
  if (!t) return null;
  // «ayúdame a asignar un paquete a un viaje»: sin códigos ni «sueltos» (eso lo resuelve el asistente con sus sugerencias)
  if (ASSIGN_VERB.test(t) && PACKAGE_NOUN.test(t) && !/\d|\btrk\b|\b(sueltos|sueltas|pendientes|todos|todas|sugerencias|sugiere|sugerir)\b/.test(t) && (TRIP_NOUN.test(t) || /\b(asignar|vincular)\b/.test(t))) return { form: 'assign' };
  if (!CREATE_VERB.test(t) || !PACKAGE_NOUN.test(t)) return null;
  if (/\d|\b(kilo|kilos|kg|gramos|libras)\b/.test(t)) return null; // ya dio datos
  if (/\bde\s+[a-z ]+\s+(a|hacia|para)\s+[a-z]/.test(t)) return null; // «de La Paz a Oruro»
  if (/\b(cuantos|cuantas|donde|estado|rastrear|rastreo|seguimiento|ver|mostrar|listar|lista)\b/.test(t)) return null; // consulta, no alta
  return { form: 'package' };
};

// ---------------------------------------------------------------- números
const UNITS = { cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29 };
const TENS = { treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90 };
const HUNDREDS = { cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900 };

/** Entero en palabras («veinticinco», «treinta y cinco», «ciento dos») → número, o null si no es solo un número. */
const wordsToInt = (words) => {
  let total = 0;
  let seen = false;
  for (const w of words) {
    if (w === 'y') continue;
    if (w in HUNDREDS) total += HUNDREDS[w];
    else if (w in TENS) total += TENS[w];
    else if (w in UNITS) total += UNITS[w];
    else return null;
    seen = true;
  }
  return seen ? total : null;
};

/**
 * Un peso o cantidad dicha en voz alta: «3», «3,5», «tres kilos», «tres coma cinco», «tres y medio», «medio kilo»,
 * «cinco kilos y medio». Devuelve un número > 0 o null si no se entendió.
 */
export const parseSpokenNumber = (text) => {
  let t = normalize(text).replace(/\b(kilos?|kg|kilogramos?|aproximadamente|como|unos|son|pesa|el peso es|de)\b/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  if (/^(medio|media)$/.test(t)) return 0.5;
  if (/^\d+([.,]\d+)?$/.test(t)) { const n = Number(t.replace(',', '.')); return n > 0 ? n : null; }
  const digitsComma = t.match(/^(\d+)\s+(?:punto|coma)\s+(\d+)$/);
  if (digitsComma) return Number(`${digitsComma[1]}.${digitsComma[2]}`);

  let half = 0;
  const m = t.match(/^(.*?)\s*(?:y medio|y media|con medio|con media)$/);
  if (m) { half = 0.5; t = m[1].trim(); }
  const dec = t.match(/^(.*?)\s+(?:punto|coma)\s+(.*)$/);
  if (dec) {
    const whole = /^\d+$/.test(dec[1]) ? Number(dec[1]) : wordsToInt(dec[1].split(' '));
    const frac = /^\d+$/.test(dec[2]) ? dec[2] : (wordsToInt(dec[2].split(' ')) ?? null);
    if (whole == null || frac == null) return null;
    return Number(`${whole}.${frac}`);
  }
  const whole = /^\d+$/.test(t) ? Number(t) : wordsToInt(t.split(' '));
  if (whole == null) return half || null;
  const n = whole + half;
  return n > 0 ? n : null;
};

/** Un teléfono dicho en voz alta («siete uno dos tres…», «71234567», «7 1 2 3 4 5 6 7») → solo dígitos, o null. */
export const parseSpokenPhone = (text) => {
  const tokens = normalize(text).replace(/[.,]/g, ' ').split(' ').filter(Boolean);
  let digits = '';
  for (const tok of tokens) {
    if (/^\d+$/.test(tok)) digits += tok;
    else if (tok in UNITS && UNITS[tok] <= 9) digits += String(UNITS[tok]);
    else if (['mas', 'bolivia', 'numero', 'es', 'telefono', 'celular', 'el', 'de', 'mi', 'su', 'tiene', 'whatsapp'].includes(tok)) continue;
    else return null; // una palabra que no es dígito: mejor volver a preguntar
  }
  return digits.length >= 7 && digits.length <= 12 ? digits : null;
};

// ---------------------------------------------------------------- opciones (ciudades)
/** Cuál de las opciones dijo («la paz», «para oruro», «cochabamba»). Ignora tildes y mayúsculas; null si es dudoso. */
export const matchOption = (text, options = []) => {
  const t = normalize(text).replace(/^(el|la|en|de|desde|hacia|para|origen|destino|sale de|va a|a)\s+/g, '').trim();
  if (!t) return null;
  const norm = options.map((o) => ({ value: o, key: normalize(o) }));
  const exact = norm.find((o) => o.key === t);
  if (exact) return exact.value;
  const hits = norm.filter((o) => o.key.includes(t) || t.includes(o.key));
  return hits.length === 1 ? hits[0].value : null;
};

// ---------------------------------------------------------------- órdenes de control y textos
export const isCancel = (text) => /^(cancela|cancelar|cancelalo|para|parar|detente|detener|basta|olvidalo|dejalo|dejalo asi|ya no|no quiero|salir|termina|terminar)\b/.test(normalize(text));
export const isSkip = (text) => /^(salta|saltar|omite|omitir|ninguno|ninguna|nada|sin nada|no tiene|no hay|siguiente|paso|despues|no)\b/.test(normalize(text));

/** Un nombre de persona tal como se dijo, con mayúscula inicial en cada palabra; null si es muy corto. */
export const cleanName = (text) => {
  const t = String(text ?? '').replace(/^(se llama|el nombre es|es|para|a nombre de|mi destinatario es|destinatario)\s+/i, '').replace(/[.,;:!?¡¿]/g, '').trim();
  if (t.length < 3) return null;
  return t.split(/\s+/).map((w) => (w ? w[0].toLocaleUpperCase('es') + w.slice(1).toLocaleLowerCase('es') : w)).join(' ');
};

/** Una descripción libre (el contenido del paquete): se deja como se dijo, con la primera en mayúscula. */
export const cleanText = (text) => {
  const t = String(text ?? '').replace(/^(contiene|lleva|es|son|tiene)\s+/i, '').trim().replace(/[.]+$/, '');
  return t ? t[0].toLocaleUpperCase('es') + t.slice(1) : null;
};
