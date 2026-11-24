import { describe, expect, it } from 'vitest';
import { deriveAssistantStatus, hasPendingProposal } from './assistantStatus';

const NOW = Date.parse('2026-11-23T12:00:00Z');
const proposal = (id, expires = '2026-11-23T12:05:00Z') => ({ role: 'assistant', content: 'x', attachments: [{ kind: 'action_proposal', action: { id, expires_at: expires } }] });

describe('estado del asistente para el botón flotante', () => {
  it('una acción propuesta sin resolver pide confirmación', () => {
    expect(hasPendingProposal([proposal('a')], new Set(), NOW)).toBe(true);
  });
  it('confirmada o cancelada ya no está pendiente', () => {
    expect(hasPendingProposal([proposal('a')], new Set(['a']), NOW)).toBe(false);
  });
  it('una propuesta vencida (p. ej. reabierta del historial) no cuenta', () => {
    expect(hasPendingProposal([proposal('a', '2026-11-23T11:00:00Z')], new Set(), NOW)).toBe(false);
  });
  it('solo cuenta la del último mensaje, y solo si es del asistente', () => {
    expect(hasPendingProposal([proposal('a'), { role: 'user', content: 'otra cosa' }], new Set(), NOW)).toBe(false);
    expect(hasPendingProposal([], new Set(), NOW)).toBe(false);
  });
  it('prioridad: confirmar > pensando > respuesta nueva > nada', () => {
    const base = { messages: [], settled: new Set() };
    expect(deriveAssistantStatus({ ...base, loading: true, unread: true })).toBe('thinking');
    expect(deriveAssistantStatus({ ...base, loading: false, unread: true })).toBe('unread');
    expect(deriveAssistantStatus({ ...base, loading: false, unread: false })).toBe('idle');
    expect(deriveAssistantStatus({ messages: [proposal('a', '2999-01-01T00:00:00Z')], settled: new Set(), loading: true, unread: true })).toBe('confirm');
  });
});
