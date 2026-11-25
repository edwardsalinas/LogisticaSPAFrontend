import { describe, expect, it } from 'vitest';
import { cleanName, cleanText, detectFormAssist, isCancel, isSkip, matchOption, normalize, parseSpokenNumber, parseSpokenPhone } from './speechParse';

describe('detectFormAssist: ¿pide ayuda para crear un paquete, sin dar los datos?', () => {
  it.each([
    'ayúdame a crear un paquete',
    'quiero registrar un paquete',
    'necesito crear un nuevo paquete',
    'vamos a hacer un envío',
    'Crea un paquete',
    'me ayudas a registrar una encomienda',
  ])('sí: «%s»', (t) => expect(detectFormAssist(t)).toEqual({ form: 'package' }));

  it.each([
    'crea un paquete de La Paz a Oruro',
    'registra un paquete de 3 kilos',
    'crea un paquete de tres kilos para Ana',
    'cuántos paquetes hay',
    'dónde está mi paquete',
    'muéstrame los paquetes',
    'ayúdame con el resumen del día',
    '',
  ])('no (lo atiende el asistente de siempre): «%s»', (t) => expect(detectFormAssist(t)).toBeNull());
});

describe('parseSpokenNumber: pesos dichos en voz alta', () => {
  it.each([
    ['3', 3], ['3,5', 3.5], ['3.5', 3.5], ['tres kilos', 3], ['cinco', 5], ['veinticinco kilos', 25], ['treinta y cinco', 35],
    ['ciento veinte', 120], ['tres y medio', 3.5], ['cinco kilos y medio', 5.5], ['medio kilo', 0.5], ['dos coma cinco', 2.5],
    ['tres punto cinco kilos', 3.5], ['12 kg', 12], ['unos diez kilos', 10], ['2 punto 5', 2.5],
  ])('«%s» → %s', (t, n) => expect(parseSpokenNumber(t)).toBe(n));

  it.each(['', 'mucho', 'no sé', 'cero', 'bastante pesado', 'tres perros'])('«%s» no se entiende → null', (t) => expect(parseSpokenNumber(t)).toBeNull());
});

describe('parseSpokenPhone: teléfonos dichos en voz alta', () => {
  it('dígitos pegados, separados o en palabras', () => {
    expect(parseSpokenPhone('71234567')).toBe('71234567');
    expect(parseSpokenPhone('7 1 2 3 4 5 6 7')).toBe('71234567');
    expect(parseSpokenPhone('siete uno dos tres cuatro cinco seis siete')).toBe('71234567');
    expect(parseSpokenPhone('mi celular es 712 345 67')).toBe('71234567');
  });
  it('muy corto, muy largo o con palabras que no son dígitos → null (se vuelve a preguntar)', () => {
    expect(parseSpokenPhone('123')).toBeNull();
    expect(parseSpokenPhone('hola buenas')).toBeNull();
    expect(parseSpokenPhone('1234567890123')).toBeNull();
  });
});

describe('matchOption: ciudades dichas en voz alta', () => {
  const cities = ['La Paz', 'Oruro', 'Cochabamba', 'Santa Cruz'];
  it('ignora tildes, mayúsculas y muletillas', () => {
    expect(matchOption('la paz', cities)).toBe('La Paz');
    expect(matchOption('desde Oruro', cities)).toBe('Oruro');
    expect(matchOption('para cochabamba', cities)).toBe('Cochabamba');
    expect(matchOption('SANTA CRUZ', cities)).toBe('Santa Cruz');
    expect(matchOption('santa', cities)).toBe('Santa Cruz');
  });
  it('una ciudad que no está o una respuesta ambigua → null', () => {
    expect(matchOption('Tarija', cities)).toBeNull();
    expect(matchOption('', cities)).toBeNull();
    expect(matchOption('c', ['Cochabamba', 'Cobija'])).toBeNull();
  });
});

describe('órdenes de control y textos', () => {
  it('cancelar y saltar', () => {
    for (const t of ['cancela', 'Para', 'déjalo así', 'olvídalo', 'termina']) expect(isCancel(t)).toBe(true);
    for (const t of ['la paz', 'tres kilos', 'cancelación de cliente']) expect(isCancel(t)).toBe(false);
    for (const t of ['ninguno', 'salta', 'no tiene', 'nada', 'siguiente']) expect(isSkip(t)).toBe(true);
    for (const t of ['documentos', 'ropa']) expect(isSkip(t)).toBe(false);
  });
  it('nombres y textos', () => {
    expect(cleanName('maría quispe')).toBe('María Quispe');
    expect(cleanName('se llama JUAN pérez.')).toBe('Juan Pérez');
    expect(cleanName('a')).toBeNull();
    expect(cleanText('contiene documentos de oficina.')).toBe('Documentos de oficina');
    expect(cleanText('')).toBeNull();
    expect(normalize('¡Árbol, ÑANDÚ!')).toBe('arbol, nandu');
  });
});

describe('detectFormAssist: asignar un paquete a un viaje, sin datos', () => {
  it.each([
    'ayúdame a asignar un paquete a un viaje',
    'quiero asignar un paquete',
    'necesito vincular un paquete a un despacho',
    'me ayudas a meter un paquete en un viaje',
  ])('sí: «%s»', (t) => expect(detectFormAssist(t)).toEqual({ form: 'assign' }));

  it.each([
    'asigna los paquetes sueltos',
    'asigna el paquete TRK-123 al viaje de mañana',
    'asigna todos los pendientes',
    'sugiere asignaciones',
  ])('no (lo atiende el asistente con sus sugerencias o ya trae datos): «%s»', (t) => expect(detectFormAssist(t)).toBeNull());

  it('crear sigue siendo crear', () => {
    expect(detectFormAssist('ayúdame a crear un paquete')).toEqual({ form: 'package' });
  });
});
