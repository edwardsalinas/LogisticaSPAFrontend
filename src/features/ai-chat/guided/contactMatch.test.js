import { describe, expect, it } from 'vitest';
import { distance, phoneTail, soundKey, suggestContact } from './contactMatch';

const C = (name, phone = null) => ({ name, phone, uses: 1 });
const LIST = [C('Rosa Quispe', '71234567'), C('María Choque'), C('Hernán Vargas'), C('Luis Llanos'), C('Ana Pérez')];

describe('soundKey: cómo suena un nombre en español', () => {
  it('letras que suenan igual dan la misma clave', () => {
    expect(soundKey('Quispe')).toBe(soundKey('Kispe'));
    expect(soundKey('Vargas')).toBe(soundKey('Bargas'));
    expect(soundKey('Hernán')).toBe(soundKey('Ernan'));
    expect(soundKey('Llanos')).toBe(soundKey('Yanos'));
    expect(soundKey('Gisela')).toBe(soundKey('Jisela'));
    expect(soundKey('Cecilia')).toBe(soundKey('Sesilia'));
  });
  it('nombres distintos no se confunden', () => {
    expect(soundKey('Ana')).not.toBe(soundKey('Ada'));
    expect(soundKey('Choque')).not.toBe(soundKey('Soque'));
  });
});

describe('distance', () => {
  it('cuenta cambios, letras de más y de menos', () => {
    expect(distance('rosa', 'rosa')).toBe(0);
    expect(distance('rosa', 'rosi')).toBe(1);
    expect(distance('rosa', 'rosas')).toBe(1);
    expect(distance('', 'abc')).toBe(3);
  });
});

describe('suggestContact', () => {
  it('lo escrito igual (solo mayúsculas o tildes) es exacto: se usa sin preguntar', () => {
    expect(suggestContact('maria choque', LIST)).toEqual({ contact: LIST[1], exact: true });
    expect(suggestContact('ANA PEREZ', LIST)).toEqual({ contact: LIST[4], exact: true });
  });

  it('el micrófono oyó mal pero suena igual: propone al contacto (no exacto)', () => {
    expect(suggestContact('rosa kispe', LIST)).toEqual({ contact: LIST[0], exact: false });
    expect(suggestContact('rosa quispi', LIST)).toEqual({ contact: LIST[0], exact: false });
    expect(suggestContact('ernan bargas', LIST)).toEqual({ contact: LIST[2], exact: false });
    expect(suggestContact('luis yanos', LIST)).toEqual({ contact: LIST[3], exact: false });
  });

  it('una sola palabra puede ser el nombre o el apellido de UN contacto', () => {
    expect(suggestContact('quispe', LIST)?.contact).toBe(LIST[0]);
    expect(suggestContact('vargas', LIST)?.contact).toBe(LIST[2]);
  });

  it('con dos candidatos igual de parecidos NO propone ninguno (no adivina)', () => {
    expect(suggestContact('quispe', [C('Juan Quispe'), C('Rosa Quispe')])).toBeNull();
  });

  it('un nombre nuevo o muy distinto no se confunde con uno conocido', () => {
    expect(suggestContact('Pedro Mamani', LIST)).toBeNull();
    expect(suggestContact('Rosario Quiroga', LIST)).toBeNull();
  });

  it('los nombres cortos casi no admiten error: «Ada» no es «Ana»', () => {
    expect(suggestContact('Ada', [C('Ana')])).toBeNull();
  });

  it('lo vacío, muy corto o sin contactos no propone nada, y no falla con datos raros', () => {
    expect(suggestContact('', LIST)).toBeNull();
    expect(suggestContact('al', LIST)).toBeNull();
    expect(suggestContact('Rosa Quispe', [])).toBeNull();
    expect(suggestContact('Rosa Quispe', undefined)).toBeNull();
    expect(suggestContact('Rosa Quispe', [null, {}, { name: 5 }])).toBeNull();
  });
});

describe('phoneTail', () => {
  it('dice solo los cuatro últimos dígitos, separados', () => {
    expect(phoneTail('71234567')).toBe('4 5 6 7');
    expect(phoneTail('+591 71234567')).toBe('4 5 6 7');
    expect(phoneTail('12')).toBe('');
    expect(phoneTail(null)).toBe('');
  });
});
