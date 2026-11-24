import { describe, expect, it } from 'vitest';
import { isVoiceConfirmable, parseVoiceConfirmation, spokenProposal } from './voiceConfirm';

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

describe('isVoiceConfirmable: qué acciones se confirman por voz', () => {
  it('crear, asignar y registrar evento sí; la entrega NO (siempre con clic)', () => {
    expect(isVoiceConfirmable({ type: 'create_package' })).toBe(true);
    expect(isVoiceConfirmable({ type: 'assign_package' })).toBe(true);
    expect(isVoiceConfirmable({ type: 'register_tracking_event' })).toBe(true);
    expect(isVoiceConfirmable({ type: 'deliver_package' })).toBe(false);
    expect(isVoiceConfirmable(null)).toBe(false);
  });
});

describe('spokenProposal con listas largas', () => {
  it('no lee durante minutos: se acorta y manda al resto del detalle en pantalla', () => {
    const lines = ['Viaje: Oruro → La Paz', ...Array.from({ length: 10 }, (_, i) => `Paquete número ${i + 1}: encomienda para Luis Vargas Mendoza, Oruro → La Paz, 8 kg`)];
    const said = spokenProposal({ title: 'Asignar 10 paquetes a un viaje', lines });
    expect(said.length).toBeLessThan(500);
    expect(said).toContain('Asignar 10 paquetes a un viaje');
    expect(said).toMatch(/El resto del detalle está en pantalla\.$/);
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
