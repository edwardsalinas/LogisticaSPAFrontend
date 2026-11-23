import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DataTable from './DataTable';

const COLUMNS = [
  { key: 'plate', label: 'Placa' },
  { key: 'capacity', label: 'Capacidad', render: (v) => `${v} kg` },
];
const DATA = [
  { id: 'a', plate: 'ABC-123', capacity: 20000 },
  { id: 'b', plate: 'XYZ-789', capacity: 12000 },
];

describe('DataTable', () => {
  it('muestra encabezados accesibles y las filas con su formato', () => {
    render(<DataTable columns={COLUMNS} data={DATA} />);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Placa', 'Capacidad']);
    expect(screen.getByRole('cell', { name: 'ABC-123' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '12000 kg' })).toBeInTheDocument();
  });

  it('con maxHeight se desplaza por dentro y el encabezado queda fijo', () => {
    const { container } = render(<DataTable columns={COLUMNS} data={DATA} maxHeight="20rem" />);
    expect(container.firstChild.style.maxHeight).toBe('20rem');
    screen.getAllByRole('columnheader').forEach((h) => expect(h.className).toContain('sticky'));
  });

  it('sin maxHeight no fija el encabezado ni limita la altura', () => {
    const { container } = render(<DataTable columns={COLUMNS} data={DATA} />);
    expect(container.firstChild.style.maxHeight).toBe('');
    screen.getAllByRole('columnheader').forEach((h) => expect(h.className).not.toContain('sticky'));
  });

  it('muestra el estado vacío con su mensaje', () => {
    render(<DataTable columns={COLUMNS} data={[]} emptyMessage="No hay vehículos." />);
    expect(screen.getByText('Sin resultados en esta vista')).toBeInTheDocument();
    expect(screen.getByText('No hay vehículos.')).toBeInTheDocument();
  });

  it('mientras carga muestra filas de esqueleto, no datos', () => {
    render(<DataTable columns={COLUMNS} data={DATA} loading />);
    expect(screen.queryByText('ABC-123')).not.toBeInTheDocument();
    expect(screen.getAllByRole('row').length).toBe(5); // encabezado + 4 filas de esqueleto
  });

  it('una fila con acción se puede abrir con clic y con el teclado (Enter y espacio)', async () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={COLUMNS} data={DATA} onRowClick={onRowClick} />);
    const fila = screen.getByRole('button', { name: 'Abrir detalle de fila 1' });

    await userEvent.click(fila);
    expect(onRowClick).toHaveBeenLastCalledWith(DATA[0]);

    fila.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onRowClick).toHaveBeenCalledTimes(3);
  });

  it('sin acción, las filas no son botones', () => {
    render(<DataTable columns={COLUMNS} data={DATA} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(within(screen.getAllByRole('row')[1]).getAllByRole('cell')).toHaveLength(2);
  });
});
