/**
 * Prepara la foto de un documento para enviarla al servidor: la reduce y la convierte a JPEG.
 * Una foto de celular pesa 3–10 MB; con 1 600 px de lado mayor sigue siendo legible para el lector y sube en un instante.
 */
export const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024;
export const MAX_SIDE = 1600;

/** Tamaño final manteniendo la proporción: el lado mayor no pasa de `max`, y nunca se agranda. */
export const fitWithin = (width, height, max = MAX_SIDE) => {
  const longest = Math.max(width, height);
  if (!longest || longest <= max) return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
  const scale = max / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
};

const decode = async (file) => {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
    img.src = url;
  });
};

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
  reader.onerror = () => reject(new Error('read'));
  reader.readAsDataURL(blob);
});

/**
 * @param {File} file foto elegida por la persona
 * @returns {Promise<{ base64: string, mime: 'image/jpeg', width: number, height: number }>}
 * @throws Error con un mensaje en español listo para mostrar
 */
export const fileToJpegBase64 = async (file, { maxSide = MAX_SIDE, quality = 0.85 } = {}) => {
  if (!file || !String(file.type).startsWith('image/')) throw new Error('Elige una foto (JPG, PNG o WEBP).');
  if (file.size > MAX_ORIGINAL_BYTES) throw new Error('La foto pesa demasiado (máximo 15 MB). Sácala con menos resolución.');

  let source;
  try {
    source = await decode(file);
  } catch {
    throw new Error('No se pudo abrir la foto. Prueba con otra en formato JPG o PNG.');
  }
  const { width, height } = fitWithin(source.width, source.height, maxSide);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // los PNG con transparencia no deben quedar negros
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  source.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('No se pudo preparar la foto.');
  return { base64: await blobToBase64(blob), mime: 'image/jpeg', width, height };
};
