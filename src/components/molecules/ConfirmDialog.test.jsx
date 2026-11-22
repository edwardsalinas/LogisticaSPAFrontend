import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { useConfirm } from './ConfirmDialog';

function Harness() {
  const [ask, dialog] = useConfirm();
  const [result, setResult] = useState('sin respuesta');
  return (
    <>
      <button onClick={async () => setResult((await ask({ title: 'Eliminar ruta', message: 'No se puede deshacer.', confirmLabel: 'Eliminar', tone: 'danger' })) ? 'sí' : 'no')}>borrar</button>
      <p>resultado: {result}</p>
      {dialog}
    </>
  );
}

describe('Confirmación propia (reemplaza window.confirm)', () => {
  it('muestra título, consecuencia y botones claros, y devuelve true al confirmar', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'borrar' }));
    expect(screen.getByRole('dialog', { name: 'Eliminar ruta' })).toBeInTheDocument();
    expect(screen.getByText('No se puede deshacer.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(screen.getByText('resultado: sí')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('devuelve false al cancelar o al pulsar Escape', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'borrar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('resultado: no')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'borrar' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.getByText('resultado: no')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
