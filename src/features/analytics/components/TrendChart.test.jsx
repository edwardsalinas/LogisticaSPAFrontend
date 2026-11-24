import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TrendChart from './TrendChart';

const DATA = [
  { date: '1 nov', esteMes: 3, mesPasado: 1 },
  { date: '2 nov', esteMes: 5, mesPasado: 2 },
  { date: '3 nov', esteMes: 4, mesPasado: null },
];

// recharts necesita medidas reales del navegador para dibujar; aquí se verifica lo que no depende de ellas:
// leyenda, cifras, descripción accesible y la vista en tabla.
describe('TrendChart (tendencia del volumen)', () => {
  it('la leyenda nombra las dos series', () => {
    render(<TrendChart data={DATA} total={12} change={18.4} />);
    const leyenda = screen.getByLabelText('Leyenda del gráfico');
    expect(within(leyenda).getByText('Este período')).toBeInTheDocument();
    expect(within(leyenda).getByText('Período anterior')).toBeInTheDocument();
  });

  it('muestra el total y la variación con coma decimal y signo', () => {
    render(<TrendChart data={DATA} total={12} change={18.4} />);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('+18,4%')).toBeInTheDocument();
  });

  it('una variación negativa lleva su signo y no el de más', () => {
    render(<TrendChart data={DATA} total={12} change={-12.5} />);
    expect(screen.getByText('-12,5%')).toBeInTheDocument();
  });

  it('sin período anterior para comparar, la variación es un guion explicado', () => {
    render(<TrendChart data={DATA} total={12} change={null} />);
    expect(screen.getByTitle(/no tiene envíos para comparar/i)).toHaveTextContent('—');
  });

  it('el gráfico tiene una descripción accesible con las cifras y remite a la tabla', () => {
    render(<TrendChart data={DATA} total={12} change={18.4} />);
    const grafico = screen.getByRole('img');
    expect(grafico).toHaveAccessibleName(/este período 12, \+18,4% frente al período anterior/i);
    expect(grafico).toHaveAccessibleName(/tabla de abajo/i);
  });

  it('la tabla gemela trae todos los días y marca con guion lo que no tiene dato', () => {
    render(<TrendChart data={DATA} total={12} change={18.4} />);
    const tabla = screen.getByRole('table', { hidden: true });
    expect(within(tabla).getAllByRole('columnheader', { hidden: true }).map((h) => h.textContent)).toEqual(['Día', 'Este período', 'Período anterior']);
    const filas = within(tabla).getAllByRole('row', { hidden: true });
    expect(filas).toHaveLength(DATA.length + 1);
    expect(filas[3].textContent).toContain('—'); // el 3 nov no tiene período anterior
  });
});
