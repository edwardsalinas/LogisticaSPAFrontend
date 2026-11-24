import { describe, expect, it } from 'vitest';
import { parseVoiceConfirmation, spokenProposal } from './voiceConfirm';

describe('parseVoiceConfirmation: «sí, hazlo» / «cancela», con prudencia', () => {
  it.each(['sí', 'Sí, hazlo', 'si hazlo', 'confirmo', 'dale', 'adelante', 'de acuerdo', 'claro que sí', 'ok'])('«%s» confirma', (t) => {
    expect(parseVoiceConfirmation(t)).toBe('yes');
  });

  it.each(['no', 'cancela', 'cancelar', 'no lo hagas', 'mejor no', 'detente', 'olvídalo', 'déjalo'])('«%s» cancela', (t) => {
    expect(parseVoiceConfirmation(t)).toBe('no');
  });

  it('una duda NUNCA ejecuta: mezcla de sí y no, frase larga, vacío u otra cosa', () => {
    expect(parseVoiceConfirmation('sí, no')).toBe('unclear');
    expect(parseVoiceConfirmation('sí hazlo pero cambia el peso a siete kilos')).toBe('unclear'); // «sí, pero…» no es un sí
    expect(parseVoiceConfirmation('no hay problema hazlo')).toBe('unclear');
    expect(parseVoiceConfirmation('')).toBe('unclear');
    expect(parseVoiceConfirmation('quiero ver el resumen del día')).toBe('unclear');
    expect(parseVoiceConfirmation(undefined)).toBe('unclear');
  });

  it('ignora tildes, mayúsculas y puntuación', () => {
    expect(parseVoiceConfirmation('¡SÍ, HAZLO!')).toBe('yes');
    expect(parseVoiceConfirmation('¡Cancélalo!')).toBe('no');
  });
});

describe('spokenProposal', () => {
  it('lee el título y el resumen del servidor en forma hablable', () => {
    const said = spokenProposal({ title: 'Registrar un paquete nuevo', lines: ['Ruta: La Paz → Oruro', 'Peso: 5 kg'] });
    expect(said).toContain('Registrar un paquete nuevo');
    expect(said).toContain('La Paz a Oruro'); // la flecha se lee «a»
    expect(said).toContain('5 kilos');
  });
});
