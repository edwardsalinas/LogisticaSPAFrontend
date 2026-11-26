import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCsp, CSP_DIRECTIVES, PERMISSIONS_POLICY } from './csp.js';

describe('política de contenido', () => {
  const nginx = readFileSync(resolve(process.cwd(), 'nginx.conf'), 'utf8');

  it('nginx.conf lleva exactamente la política de security/csp.js', () => {
    expect(nginx).toContain(`add_header Content-Security-Policy "${buildCsp()}" always;`);
    expect(nginx).toContain(`add_header Permissions-Policy "${PERMISSIONS_POLICY}" always;`);
  });

  it('los scripts solo vienen de la propia página (y del captcha): sin unsafe-inline ni unsafe-eval', () => {
    expect(CSP_DIRECTIVES['script-src'].join(' ')).not.toMatch(/unsafe-/);
    expect(CSP_DIRECTIVES['script-src']).toEqual(["'self'", 'https://challenges.cloudflare.com']);
  });

  it('los datos solo pueden salir hacia la propia API y los servicios de mapas', () => {
    expect(CSP_DIRECTIVES['connect-src']).toEqual(["'self'", 'https://router.project-osrm.org', 'https://nominatim.openstreetmap.org']);
  });

  it('nadie puede mostrar la aplicación en un marco, ni usar plugins, ni cambiar la base de enlaces', () => {
    expect(CSP_DIRECTIVES['frame-ancestors']).toEqual(["'self'"]);
    expect(CSP_DIRECTIVES['object-src']).toEqual(["'none'"]);
    expect(CSP_DIRECTIVES['base-uri']).toEqual(["'self'"]);
  });
});
