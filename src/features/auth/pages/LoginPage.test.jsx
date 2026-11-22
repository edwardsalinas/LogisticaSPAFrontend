import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from './LoginPage';

const loginMock = vi.fn();

vi.mock('../../../app/AuthContext', () => ({
  useAuth: () => ({ login: loginMock }),
}));

vi.mock('../../../services/apiService', () => ({
  default: { getPublicStats: vi.fn().mockResolvedValue({ success: false }) },
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );

describe('LoginPage (React Hook Form + Zod)', () => {
  beforeEach(() => {
    loginMock.mockReset();
  });

  it('muestra errores por campo y no llama al backend si el formulario está vacío', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /ingresar al panel/i }));

    expect(await screen.findByText('Ingresa tu correo')).toBeInTheDocument();
    expect(screen.getByText('Ingresa tu contraseña')).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('rechaza un correo con formato inválido', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/correo electrónico/i), 'no-es-correo');
    await userEvent.type(screen.getByLabelText(/^contraseña$/i), 'secreto');
    await userEvent.click(screen.getByRole('button', { name: /ingresar al panel/i }));

    expect(await screen.findByText('Correo electrónico inválido')).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('con datos válidos llama a login con correo y contraseña', async () => {
    loginMock.mockResolvedValue({ id: 'u1' });
    renderPage();
    await userEvent.type(screen.getByLabelText(/correo electrónico/i), 'ana@logistica.bo');
    await userEvent.type(screen.getByLabelText(/^contraseña$/i), 'Secreto123!');
    await userEvent.click(screen.getByRole('button', { name: /ingresar al panel/i }));

    await waitFor(() => expect(loginMock).toHaveBeenCalledTimes(1));
    expect(loginMock.mock.calls[0].slice(0, 2)).toEqual(['ana@logistica.bo', 'Secreto123!']);
  });

  it('muestra un mensaje cuando las credenciales son inválidas', async () => {
    loginMock.mockRejectedValue(Object.assign(new Error('Invalid login credentials'), { status: 401 }));
    renderPage();
    await userEvent.type(screen.getByLabelText(/correo electrónico/i), 'ana@logistica.bo');
    await userEvent.type(screen.getByLabelText(/^contraseña$/i), 'mala');
    await userEvent.click(screen.getByRole('button', { name: /ingresar al panel/i }));

    expect(await screen.findByText(/credenciales invalidas/i)).toBeInTheDocument();
  });

  it('informa el bloqueo por demasiados intentos (429)', async () => {
    loginMock.mockRejectedValue(Object.assign(new Error('Demasiados intentos de inicio de sesión.'), { status: 429 }));
    renderPage();
    await userEvent.type(screen.getByLabelText(/correo electrónico/i), 'ana@logistica.bo');
    await userEvent.type(screen.getByLabelText(/^contraseña$/i), 'x');
    await userEvent.click(screen.getByRole('button', { name: /ingresar al panel/i }));

    expect(await screen.findByText(/demasiados intentos/i)).toBeInTheDocument();
  });

  it.each([
    ['sin conexión con el servidor', { isNetworkError: true }, /no se pudo conectar con el servidor/i],
    ['error interno del servidor (500)', { status: 500 }, /el servidor tuvo un problema/i],
  ])('no culpa a la contraseña cuando hay %s', async (_n, props, texto) => {
    loginMock.mockRejectedValue(Object.assign(new Error('x'), props));
    renderPage();
    await userEvent.type(screen.getByLabelText(/correo electrónico/i), 'ana@logistica.bo');
    await userEvent.type(screen.getByLabelText(/^contraseña$/i), 'Secreto123!');
    await userEvent.click(screen.getByRole('button', { name: /ingresar al panel/i }));

    expect(await screen.findByText(texto)).toBeInTheDocument();
    expect(screen.queryByText(/credenciales invalidas/i)).not.toBeInTheDocument();
  });
});
