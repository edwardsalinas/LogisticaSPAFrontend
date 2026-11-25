import { describe, expect, it } from 'vitest';
import { matchWake } from './wakeWord';

describe('matchWake: la frase «hey Logi»', () => {
  it.each([
    'hey logi', 'Hey Logi', 'HEY LOGI', 'hey, logi', 'ey logi', 'oye logi', 'hey logui', 'hey logan', 'ey lógica', 'hey loggi', 'Hey Logi!',
  ])('despierta con «%s»', (t) => expect(matchWake(t)).toEqual({ rest: '' }));

  it('devuelve lo que siguió, con sus tildes y mayúsculas tal como se dijo', () => {
    expect(matchWake('hey logi ayúdame a crear un paquete')).toEqual({ rest: 'ayúdame a crear un paquete' });
    expect(matchWake('Hey Logi, ¿cuántos paquetes hay?')).toEqual({ rest: '¿cuántos paquetes hay?' });
    expect(matchWake('bueno, hey logi dime el estado')).toEqual({ rest: 'dime el estado' });
  });

  it.each([
    'logi', 'login', 'hola logi', 'ok logi', 'hey', 'hey login', 'hey logística', 'el logo del sistema', 'hey logitech', 'hay logística en la paz', '', 'abre la página de login',
  ])('NO despierta con «%s» (sin saludo, o es otra palabra)', (t) => expect(matchWake(t)).toBeNull());

  it('tolera null y undefined', () => {
    expect(matchWake(null)).toBeNull();
    expect(matchWake(undefined)).toBeNull();
  });
});
