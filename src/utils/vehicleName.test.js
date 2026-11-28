import { describe, expect, it } from 'vitest';
import { vehicleName } from './vehicleName';

describe('vehicleName', () => {
  it('no repite la marca si el modelo ya la incluye', () => {
    expect(vehicleName({ brand: 'Volvo', model: 'Volvo FH16' })).toBe('Volvo FH16');
    expect(vehicleName({ brand: 'mercedes', model: 'Mercedes Sprinter' })).toBe('Mercedes Sprinter');
  });
  it('junta marca y modelo distintos, y tolera campos vacíos', () => {
    expect(vehicleName({ brand: 'Toyota', model: 'Hilux' })).toBe('Toyota Hilux');
    expect(vehicleName({ model: 'Hilux' })).toBe('Hilux');
    expect(vehicleName({})).toBe('');
    expect(vehicleName()).toBe('');
  });
});
