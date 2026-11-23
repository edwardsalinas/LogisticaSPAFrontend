import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PageHeader from './PageHeader';

describe('PageHeader', () => {
  it('el título es un h2 (el h1 de la pantalla es el de la barra superior) y muestra la descripción', () => {
    render(<PageHeader title="Inventario de paquetes" description="Flujo y trazabilidad de cada envío." />);
    expect(screen.getByRole('heading', { level: 2, name: 'Inventario de paquetes' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByText('Flujo y trazabilidad de cada envío.')).toBeInTheDocument();
  });

  it('los indicadores se leen como una lista de términos y valores', () => {
    render(<PageHeader title="Flota" stats={[{ label: 'Vehículos', value: '3 camiones' }, { label: 'Libres', value: '—', tone: 'success' }]} />);
    const terms = screen.getAllByRole('term').map((t) => t.textContent);
    expect(terms).toEqual(['Vehículos', 'Libres']);
    expect(screen.getByText('3 camiones')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('muestra una pista bajo el valor cuando se indica', () => {
    render(<PageHeader title="Dashboard" stats={[{ label: 'Flota activa', value: 'tres', hint: 'vehículos' }]} />);
    expect(screen.getByText('vehículos')).toBeInTheDocument();
  });

  it('muestra la insignia junto al título y los botones de acción', () => {
    render(
      <PageHeader
        title="TRK-1"
        titleAdornment={<span>En tránsito</span>}
        actions={<button type="button">Volver</button>}
      />,
    );
    expect(screen.getByText('En tránsito')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument();
  });

  it('con más de 4 indicadores o con botón, los indicadores van en una fila propia debajo', () => {
    const { container, rerender } = render(<PageHeader title="Pocos" stats={[{ label: 'A', value: 'x' }, { label: 'B', value: 'y' }]} />);
    expect(container.querySelector('.border-t')).toBeNull();

    rerender(<PageHeader title="Con botón" stats={[{ label: 'A', value: 'x' }]} actions={<button type="button">Nuevo</button>} />);
    const fila = container.querySelector('.border-t');
    expect(fila).not.toBeNull();
    expect(within(fila).getByText('A')).toBeInTheDocument();
  });
});
