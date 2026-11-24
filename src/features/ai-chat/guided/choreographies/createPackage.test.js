import { describe, expect, it } from 'vitest';
import { fieldPlan } from './createPackage';

describe('fieldPlan: qué llena Logi y en qué orden', () => {
  it('sigue el orden del formulario y solo incluye lo que trae la propuesta', () => {
    const plan = fieldPlan({ origen: 'La Paz', destino: 'Oruro', peso: 5, recipient_name: 'María López', recipient_phone: '71234567', description: 'documentos' });
    expect(plan.map((s) => s.field)).toEqual(['origen', 'destino', 'recipient_name', 'recipient_phone', 'peso', 'description']);
    expect(plan.find((s) => s.field === 'peso')).toMatchObject({ kind: 'text', value: '5', say: 'Peso: 5 kilos' });
  });

  it('con un viaje elegido lo llena justo después del destino', () => {
    const plan = fieldPlan({ origen: 'La Paz', destino: 'Oruro', peso: 2, recipient_name: 'Ana', route_id: 'r-1' });
    expect(plan.map((s) => s.field)).toEqual(['origen', 'destino', 'route_id', 'recipient_name', 'peso']);
  });

  it('un remitente sin cuenta activa antes el modo invitado y luego llena su nombre', () => {
    const plan = fieldPlan({ origen: 'La Paz', destino: 'Oruro', peso: 1, recipient_name: 'Ana', sender_name: 'Luis', sender_phone: '700' });
    expect(plan.map((s) => s.field)).toEqual(['origen', 'destino', 'is_guest', 'sender_name', 'sender_phone', 'recipient_name', 'peso']);
    expect(plan.find((s) => s.field === 'is_guest')).toMatchObject({ kind: 'toggle', value: true });
  });

  it('ignora los campos vacíos', () => {
    const plan = fieldPlan({ origen: 'La Paz', destino: 'Oruro', peso: 1, recipient_name: 'Ana', recipient_phone: '', description: undefined });
    expect(plan.map((s) => s.field)).toEqual(['origen', 'destino', 'recipient_name', 'peso']);
  });
});
