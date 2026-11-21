import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AlertsPanel from './AlertsPanel';

describe('AlertsPanel (RF05: excepciones logísticas)', () => {
  it('muestra los siniestros como alerta', () => {
    render(<AlertsPanel stats={{ packagesIncident: 2 }} />);
    expect(screen.getByText(/2 paquetes con siniestro/i)).toBeInTheDocument();
  });

  it('usa el singular con un solo siniestro', () => {
    render(<AlertsPanel stats={{ packagesIncident: 1 }} />);
    expect(screen.getByText(/1 paquete con siniestro/i)).toBeInTheDocument();
  });

  it('muestra los despachos con retraso', () => {
    render(<AlertsPanel stats={{ packagesDelayed: 3 }} />);
    expect(screen.getByText(/3 despachos con retraso/i)).toBeInTheDocument();
  });

  it('sin siniestros no muestra esa alerta', () => {
    render(<AlertsPanel stats={{ packagesIncident: 0, packagesDelayed: 1 }} />);
    expect(screen.queryByText(/siniestro/i)).not.toBeInTheDocument();
  });
});
