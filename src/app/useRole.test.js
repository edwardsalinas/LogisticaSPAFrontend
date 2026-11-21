import { describe, it, expect } from 'vitest';
import { resolveUserRole } from './useRole';

describe('resolveUserRole', () => {
  it('app_metadata (solo escribible por el servidor) prevalece sobre user_metadata', () => {
    expect(resolveUserRole({ app_metadata: { role: 'client' }, user_metadata: { role: 'admin' } })).toBe('client');
  });

  it('usa user_metadata solo como respaldo de transición', () => {
    expect(resolveUserRole({ user_metadata: { role: 'driver' } })).toBe('driver');
  });

  it('sin rol o sin usuario es client', () => {
    expect(resolveUserRole({})).toBe('client');
    expect(resolveUserRole(null)).toBe('client');
  });
});
