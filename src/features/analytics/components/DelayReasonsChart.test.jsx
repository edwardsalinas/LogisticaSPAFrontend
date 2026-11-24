import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DelayReasonsChart from './DelayReasonsChart';

const DATA = [
  { status: 'pendiente', name: 'Pendiente', value: 19 },
  { status: 'entregado', name: 'Entregado', value: 96 },
  { status: 'siniestro', name: 'Siniestro', value: 3 },
  { status: 'en_transito', name: 'En tránsito', value: 41 },
];

describe('DelayReasonsChart (estado de los envíos)', () => {
  it('muestra una barra por estado, ordenadas de mayor a menor', () => {
    render(<DelayReasonsChart data={DATA} />);
    const filas = within(screen.getByRole('list', { name: /de mayor a menor/i })).getAllByRole('listitem');
    expect(filas.map((f) => f.textContent.match(/Entregado|En tránsito|Pendiente|Siniestro/)[0])).toEqual(['Entregado', 'En tránsito', 'Pendiente', 'Siniestro']);
  });

  it('cada fila lleva su cantidad y su porcentaje del total', () => {
    render(<DelayReasonsChart data={DATA} />);
    const entregado = screen.getAllByRole('listitem').find((li) => /Entregado/.test(li.textContent));
    expect(within(entregado).getByText('96')).toBeInTheDocument();
    expect(entregado.textContent).toContain('60%'); // 96 de 159
    expect(screen.getByText('159')).toBeInTheDocument(); // total
  });

  it('el ancho de cada barra es proporcional a la mayor (no al total)', () => {
    const { container } = render(<DelayReasonsChart data={DATA} />);
    const anchos = [...container.querySelectorAll('li span.rounded-r')].map((b) => b.style.width);
    expect(anchos[0]).toBe('100%'); // el mayor llena la pista
    expect(parseFloat(anchos[1])).toBeCloseTo((41 / 96) * 100, 1);
  });

  it('solo entregado y siniestro llevan un color con significado, y ambos con icono y texto para lectores de pantalla', () => {
    const { container } = render(<DelayReasonsChart data={DATA} />);
    const filas = screen.getAllByRole('listitem');
    const barra = (nombre) => filas.find((li) => li.textContent.includes(nombre)).querySelector('span.rounded-r');

    expect(barra('Entregado').style.backgroundColor).toBe('rgb(12, 163, 12)'); // bien
    expect(barra('Siniestro').style.backgroundColor).toBe('rgb(208, 59, 59)'); // grave
    expect(barra('Pendiente').style.backgroundColor).toBe('rgb(42, 120, 214)'); // serie 1 de la paleta
    expect(barra('En tránsito').style.backgroundColor).toBe('rgb(42, 120, 214)');

    expect(container.querySelectorAll('li svg').length).toBe(2); // solo esos dos tienen icono
    expect(screen.getByText(/estado final correcto/)).toBeInTheDocument();
    expect(screen.getByText(/requiere atención/)).toBeInTheDocument();
  });

  it('ofrece la vista en tabla con los mismos datos', () => {
    render(<DelayReasonsChart data={DATA} />);
    expect(screen.getByText('Ver como tabla')).toBeInTheDocument();
    const tabla = screen.getByRole('table', { hidden: true });
    expect(within(tabla).getAllByRole('columnheader', { hidden: true }).map((h) => h.textContent)).toEqual(['Estado', 'Envíos', 'Del total']);
    expect(within(tabla).getAllByRole('row', { hidden: true })).toHaveLength(DATA.length + 1);
  });

  it('con un solo envío usa el singular', () => {
    render(<DelayReasonsChart data={[{ status: 'cancelado', name: 'Cancelado', value: 1 }]} />);
    expect(screen.getByRole('listitem').title).toMatch(/1 envío \(100 %\)/);
  });

  it('sin envíos en el rango muestra un mensaje y no dibuja nada', () => {
    render(<DelayReasonsChart data={[]} />);
    expect(screen.getByText(/no hay envíos registrados/i)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
