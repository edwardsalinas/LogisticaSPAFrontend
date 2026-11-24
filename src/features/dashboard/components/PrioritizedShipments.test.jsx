import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../hooks/queries/usePackages', () => ({ usePackages: () => ({ data: [], isLoading: false }) }));

import PrioritizedShipments from './PrioritizedShipments';

describe('Despachos prioritarios', () => {
  it('"Ver operación completa" es un enlace a Paquetes, con objetivo táctil de 44 px', () => {
    render(<MemoryRouter><PrioritizedShipments /></MemoryRouter>);
    const link = screen.getByRole('link', { name: /ver operación completa/i });
    expect(link).toHaveAttribute('href', '/logistics/packages');
    expect(link.className).toContain('min-h-11');
  });
});
