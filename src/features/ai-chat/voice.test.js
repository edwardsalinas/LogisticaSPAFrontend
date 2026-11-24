import { describe, it, expect } from 'vitest';
import { chunkForSpeech, pickSpanishVoice, plainText, recognitionErrorMessage, stripForSpeech } from './voice';

describe('stripForSpeech: texto agradable de escuchar', () => {
  it('quita markdown, emojis y viñetas', () => {
    const out = stripForSpeech('Hola **Ana** 🚚\n- primer punto\n- segundo punto\n`código`');
    expect(out).not.toMatch(/[*`🚚]/u);
    expect(out).toContain('Hola Ana');
    expect(out).toContain('primer punto');
    expect(out).not.toMatch(/^- /m);
  });

  it('no lee códigos de rastreo enteros: dice con qué terminan', () => {
    const out = stripForSpeech('Tu paquete TRK-1795301842652-9113E39E sigue en camino');
    expect(out).toBe('Tu paquete paquete que termina en 9 1 1 3 sigue en camino');
    expect(out).not.toContain('1795301842652');
  });

  it('convierte flechas, porcentajes y unidades a palabras', () => {
    expect(stripForSpeech('La Paz → Oruro')).toBe('La Paz a Oruro');
    expect(stripForSpeech('Tasa de entrega 80%')).toBe('Tasa de entrega 80 por ciento');
    expect(stripForSpeech('Quedan 600 kg y faltan 95.4 km')).toBe('Quedan 600 kilos y faltan 95.4 kilómetros');
  });

  it('quita enlaces y URLs y deja el texto del enlace', () => {
    expect(stripForSpeech('Mira [el mapa](https://x.com/mapa) o https://x.com/otro ahora')).toBe('Mira el mapa o ahora');
  });

  it('los saltos de línea se vuelven pausas y tolera valores vacíos', () => {
    expect(stripForSpeech('Primera línea\nSegunda línea')).toBe('Primera línea. Segunda línea');
    expect(stripForSpeech(null)).toBe('');
    expect(stripForSpeech('')).toBe('');
  });
});

describe('chunkForSpeech: trozos cortos para que el navegador no corte la voz', () => {
  it('un texto corto es un solo trozo', () => {
    expect(chunkForSpeech('Hola. ¿Qué tal?')).toEqual(['Hola. ¿Qué tal?']);
  });

  it('agrupa oraciones sin pasar del máximo', () => {
    const text = 'Primera oración de prueba. Segunda oración de prueba. Tercera oración de prueba.';
    const chunks = chunkForSpeech(text, 60);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 60)).toBe(true);
    expect(chunks.join(' ')).toBe(text);
  });

  it('una oración larguísima se parte igualmente', () => {
    const chunks = chunkForSpeech('a'.repeat(450), 180);
    expect(chunks.map((c) => c.length)).toEqual([180, 180, 90]);
  });

  it('sin texto no hay trozos', () => {
    expect(chunkForSpeech('')).toEqual([]);
    expect(chunkForSpeech(undefined)).toEqual([]);
  });
});

describe('pickSpanishVoice', () => {
  const v = (lang) => ({ lang, name: lang });
  it('prefiere el español de Bolivia, luego el latinoamericano, luego cualquier español', () => {
    expect(pickSpanishVoice([v('en-US'), v('es-ES'), v('es-MX')]).lang).toBe('es-MX');
    expect(pickSpanishVoice([v('es-ES'), v('es-BO')]).lang).toBe('es-BO');
    expect(pickSpanishVoice([v('en-US'), v('es-CL')]).lang).toBe('es-CL');
  });
  it('sin voces en español devuelve null', () => {
    expect(pickSpanishVoice([v('en-US'), v('fr-FR')])).toBeNull();
    expect(pickSpanishVoice([])).toBeNull();
  });
});

describe('errores de reconocimiento', () => {
  it('explica el permiso del micrófono, la falta de micrófono y la red', () => {
    expect(recognitionErrorMessage('not-allowed')).toMatch(/permiso para usar el micrófono/i);
    expect(recognitionErrorMessage('audio-capture')).toMatch(/micrófono/i);
    expect(recognitionErrorMessage('network')).toMatch(/conexión/i);
  });
  it('los silencios y cancelaciones no son errores para el usuario', () => {
    expect(recognitionErrorMessage('no-speech')).toBeNull();
    expect(recognitionErrorMessage('aborted')).toBeNull();
  });
});

describe('plainText', () => {
  it('muestra el texto sin marcas de markdown pero conserva los códigos', () => {
    expect(plainText('El paquete **TRK-1-ABCD** está `en camino`\n- uno')).toBe('El paquete TRK-1-ABCD está en camino uno');
  });
});

describe('mouthOpenFor: apertura de la boca de Logi según la palabra', () => {
  it('las vocales abiertas abren más que las cerradas y las consonantes casi nada', async () => {
    const { mouthOpenFor } = await import('./voice');
    expect(mouthOpenFor('hola')).toBeGreaterThan(mouthOpenFor('si'));
    expect(mouthOpenFor('si')).toBeGreaterThan(mouthOpenFor('mm'));
    expect(mouthOpenFor('')).toBe(0.2);
    expect(mouthOpenFor('¡Árbol!')).toBe(1);
    for (const w of ['ñandú', 'ABC', '123', 'z']) expect(mouthOpenFor(w)).toBeLessThanOrEqual(1);
  });
});
