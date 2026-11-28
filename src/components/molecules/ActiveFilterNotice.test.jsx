import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ActiveFilterNotice from './ActiveFilterNotice';

describe('aviso de filtro activo', () => {
  it('dice por qué se está filtrando y permite quitar el filtro (con objetivo táctil de 44 px)', async () => {
    const onClear = vi.fn();
    render(<ActiveFilterNotice label="TRK-123" onClear={onClear} />);
    expect(screen.getByRole('status')).toHaveTextContent('Filtrando por «TRK-123»');
    const button = screen.getByRole('button', { name: /quitar filtro/i });
    expect(button.className).toContain('min-h-11');
    await userEvent.click(button);
    expect(onClear).toHaveBeenCalledTimes(1);
  });
  it('puede explicar qué más hay fuera del filtro', () => {
    render(<ActiveFilterNotice label="x" onClear={() => {}}><span>· hay 2 más</span></ActiveFilterNotice>);
    expect(screen.getByText('· hay 2 más')).toBeInTheDocument();
  });
});
