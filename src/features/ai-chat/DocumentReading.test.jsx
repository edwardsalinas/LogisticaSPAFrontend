import { render, screen, within, waitFor, renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiService from '../../services/apiService';
import { AttachmentCard } from './components/AssistantCards';
import AssistantHome from './pages/AssistantHome';
import { useChatState } from './useAssistantChat';
import { fitWithin, fileToJpegBase64, MAX_ORIGINAL_BYTES } from '../../utils/imageForUpload';

let mockUser;
vi.mock('../../app/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
vi.mock('../../services/apiService', () => ({
  default: { post: vi.fn(), chatStream: vi.fn(), extractDocument: vi.fn(), proposeFromDocument: vi.fn(), getAiConversations: vi.fn().mockResolvedValue({ data: [] }) },
}));
vi.mock('../../utils/imageForUpload', async (importOriginal) => ({ ...(await importOriginal()), fileToJpegBase64: vi.fn() }));

const FIELDS = { document_type: 'guia_remision', origen: 'Cochabamba', destino: 'La Paz', peso_kg: 45.5, recipient_name: 'María Fernanda Quispe', recipient_phone: '60113322', sender_name: 'Comercial Los Andes', sender_phone: null, description: '3 cajas de repuestos', document_number: '000482' };
const EXTRACTED = { kind: 'document_extraction', fields: FIELDS, missing: [], warnings: [], model: 'cerebras:qwen-3.8-27b' };
const PROPOSAL = { kind: 'action_proposal', action: { id: 'p1', type: 'create_package', title: 'Registrar un paquete nuevo', lines: ['Ruta: Cochabamba → La Paz'], expires_at: new Date(Date.now() + 600000).toISOString() }, skipped: [] };

const renderCard = (data = EXTRACTED) => render(<MemoryRouter><AttachmentCard attachment={data} role="admin" /></MemoryRouter>);
beforeEach(() => { Object.values(apiService).forEach((f) => f.mockReset?.()); apiService.getAiConversations.mockResolvedValue({ data: [] }); });

// ============================================================ utilidades de la imagen
describe('Preparar la foto', () => {
  it('reduce el lado mayor a 1600 px manteniendo la proporción, y nunca agranda', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1600, 1600)).toEqual({ width: 1600, height: 1600 });
    expect(fitWithin(0, 0)).toEqual({ width: 1, height: 1 });
  });

  it('rechaza lo que no es una imagen o es demasiado grande, con un mensaje claro', async () => {
    const { fileToJpegBase64: real } = await vi.importActual('../../utils/imageForUpload');
    await expect(real(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).rejects.toThrow(/elige una foto/i);
    await expect(real(null)).rejects.toThrow(/elige una foto/i);
    const big = new File(['x'], 'grande.jpg', { type: 'image/jpeg' });
    Object.defineProperty(big, 'size', { value: MAX_ORIGINAL_BYTES + 1 });
    await expect(real(big)).rejects.toThrow(/pesa demasiado/i);
  });
});

// ============================================================ tarjeta de revisión
describe('Tarjeta "Datos leídos de la guía"', () => {
  it('muestra lo leído en campos editables y aclara que la IA solo leyó', () => {
    renderCard();
    expect(screen.getByText(/datos leídos de la guía n° 000482/i)).toBeInTheDocument();
    expect(screen.getByText(/la ia solo leyó la foto/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^origen/i)).toHaveValue('Cochabamba');
    expect(screen.getByLabelText(/^destino/i)).toHaveValue('La Paz');
    expect(screen.getByLabelText(/^peso/i)).toHaveValue(45.5);
    expect(screen.getByLabelText(/^destinatario/i)).toHaveValue('María Fernanda Quispe');
    expect(screen.getByLabelText(/teléfono del destinatario/i)).toHaveValue('60113322');
    expect(screen.getByLabelText(/contenido/i)).toHaveValue('3 cajas de repuestos');
  });

  it('se puede corregir cualquier campo y el cursor no se pierde al escribir (regresión)', async () => {
    renderCard();
    const dest = screen.getByLabelText(/^destinatario/i);
    await userEvent.clear(dest);
    await userEvent.type(dest, 'Ana María Rojas');
    expect(dest).toHaveValue('Ana María Rojas'); // si el campo se recreara en cada tecla, quedaría solo la última letra
    expect(dest).toHaveFocus();
  });

  it('"Preparar registro" envía los datos CORREGIDOS por la persona y muestra la propuesta para confirmar', async () => {
    apiService.proposeFromDocument.mockResolvedValue({ data: PROPOSAL });
    renderCard();
    const peso = screen.getByLabelText(/^peso/i);
    await userEvent.clear(peso);
    await userEvent.type(peso, '46');
    await userEvent.click(screen.getByRole('button', { name: /preparar registro/i }));

    expect(apiService.proposeFromDocument).toHaveBeenCalledWith({
      origen: 'Cochabamba', destino: 'La Paz', peso: 46, recipient_name: 'María Fernanda Quispe',
      recipient_phone: '60113322', sender_name: 'Comercial Los Andes', description: '3 cajas de repuestos',
    });
    expect(await screen.findByText('Registrar un paquete nuevo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^confirmar$/i })).toBeInTheDocument(); // sigue necesitando confirmación
    expect(screen.queryByRole('button', { name: /preparar registro/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^origen/i)).toBeDisabled(); // ya no se edita lo que se está confirmando
  });

  it('lo que no se leyó queda marcado y el botón espera a que se complete', async () => {
    renderCard({ ...EXTRACTED, fields: { ...FIELDS, destino: null, peso_kg: null }, missing: ['destino', 'peso_kg'], warnings: ['No se leyó el destino, el peso. Complétalo antes de continuar.'] });
    expect(screen.getByLabelText(/^destino/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/^peso/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/^origen/i)).toHaveAttribute('aria-invalid', 'false');
    const btn = screen.getByRole('button', { name: /preparar registro/i });
    expect(btn).toBeDisabled();
    expect(screen.getByText(/falta completar: destino, peso \(kg\)/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/^destino/i), 'Oruro');
    await userEvent.type(screen.getByLabelText(/^peso/i), '12');
    expect(btn).toBeEnabled();
    expect(screen.queryByText(/falta completar/i)).not.toBeInTheDocument();
  });

  it('muestra los avisos de la lectura (correcciones, documento dudoso, orden escondida)', () => {
    renderCard({ ...EXTRACTED, warnings: ['Se corrigió el origen: "Ouro" → "Oruro". Verifícalo.', 'El documento contiene texto que parece una orden dirigida a la IA.'] });
    const list = screen.getByRole('list', { name: /avisos de la lectura/i });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(list).toHaveTextContent(/ouro.*oruro/i);
  });

  it('si el servidor rechaza (p. ej. nombre muy corto), muestra el motivo y permite reintentar', async () => {
    apiService.proposeFromDocument.mockRejectedValueOnce(Object.assign(new Error('Faltan o son inválidos algunos datos'), { status: 409 }));
    renderCard();
    await userEvent.click(screen.getByRole('button', { name: /preparar registro/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/inválidos/i);
    apiService.proposeFromDocument.mockResolvedValueOnce({ data: PROPOSAL });
    await userEvent.click(screen.getByRole('button', { name: /preparar registro/i }));
    expect(await screen.findByText('Registrar un paquete nuevo')).toBeInTheDocument();
  });

  it('ofrece las ciudades de Bolivia al escribir el origen y el destino', () => {
    const { container } = renderCard();
    const options = [...container.querySelectorAll('datalist option')].map((o) => o.getAttribute('value'));
    expect(options).toEqual(expect.arrayContaining(['La Paz', 'Oruro', 'Cochabamba', 'Santa Cruz de la Sierra']));
    expect(screen.getByLabelText(/^origen/i)).toHaveAttribute('list');
  });

  it('un documento que no es una guía llega con campos vacíos para completar a mano', () => {
    renderCard({ kind: 'document_extraction', fields: { document_type: 'otro', origen: null, destino: null, peso_kg: null, recipient_name: null }, missing: ['origen', 'destino', 'peso_kg', 'recipient_name'], warnings: ['No parece una guía de remisión.'] });
    expect(screen.getByText(/no parece una guía/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^origen/i)).toHaveValue('');
    expect(screen.getByRole('button', { name: /preparar registro/i })).toBeDisabled();
  });
});

// ============================================================ el chat lee un documento
describe('El chat lee la foto de una guía', () => {
  const file = new File(['img'], 'guia.jpg', { type: 'image/jpeg' });

  it('muestra la tarjeta con lo leído y NO lo guarda como contexto de la conversación', async () => {
    const { fileToJpegBase64: prepare } = await import('../../utils/imageForUpload');
    prepare.mockResolvedValue({ base64: 'QUJD', mime: 'image/jpeg', width: 800, height: 600 });
    apiService.extractDocument.mockResolvedValue({ data: { fields: FIELDS, missing: [], warnings: [], model: 'm' } });
    const { result } = renderHook(() => useChatState());
    let ok;
    await act(async () => { ok = await result.current.readDocument(file); });

    expect(ok).toBe(true);
    expect(apiService.extractDocument).toHaveBeenCalledWith({ image: 'QUJD', mime: 'image/jpeg' });
    const [user, assistant] = result.current.messages;
    expect(user).toMatchObject({ role: 'user', local: true });
    expect(user.content).toMatch(/guia\.jpg/);
    expect(assistant.attachments[0]).toMatchObject({ kind: 'document_extraction', fields: FIELDS });
    expect(assistant.local).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('mientras lee muestra qué está haciendo', async () => {
    const { fileToJpegBase64: prepare } = await import('../../utils/imageForUpload');
    let release;
    prepare.mockImplementation(() => new Promise((r) => { release = r; }));
    const { result } = renderHook(() => useChatState());
    let p;
    act(() => { p = result.current.readDocument(file); });
    await waitFor(() => expect(result.current.status).toBe('Leyendo la guía…'));
    expect(result.current.loading).toBe(true);
    release({ base64: 'x', mime: 'image/jpeg' });
    apiService.extractDocument.mockResolvedValue({ data: { fields: FIELDS, missing: [], warnings: [] } });
    await act(async () => { await p; });
    expect(result.current.status).toBe('');
  });

  it('si falla (foto pesada, formato, sin permiso…) muestra el motivo del servidor como error', async () => {
    const { fileToJpegBase64: prepare } = await import('../../utils/imageForUpload');
    prepare.mockResolvedValue({ base64: 'x', mime: 'image/jpeg' });
    apiService.extractDocument.mockRejectedValue(Object.assign(new Error('La imagen pesa demasiado (máximo 4 MB).'), { status: 413 }));
    const { result } = renderHook(() => useChatState());
    let ok;
    await act(async () => { ok = await result.current.readDocument(file); });
    expect(ok).toBe(false);
    const last = result.current.messages.at(-1);
    expect(last).toMatchObject({ isError: true, local: true });
    expect(last.content).toMatch(/pesa demasiado/);
  });

  it('si la foto no se puede preparar en el navegador, lo explica y no llama al servidor', async () => {
    const { fileToJpegBase64: prepare } = await import('../../utils/imageForUpload');
    prepare.mockRejectedValue(new Error('No se pudo abrir la foto. Prueba con otra en formato JPG o PNG.'));
    const { result } = renderHook(() => useChatState());
    await act(async () => { await result.current.readDocument(file); });
    expect(apiService.extractDocument).not.toHaveBeenCalled();
    expect(result.current.messages.at(-1).content).toMatch(/no se pudo abrir la foto/i);
  });

  it('lo leído de un documento no se envía como historial en la pregunta siguiente', async () => {
    const { fileToJpegBase64: prepare } = await import('../../utils/imageForUpload');
    prepare.mockResolvedValue({ base64: 'x', mime: 'image/jpeg' });
    apiService.extractDocument.mockResolvedValue({ data: { fields: FIELDS, missing: [], warnings: [] } });
    apiService.chatStream.mockResolvedValue({ response: 'ok', attachments: [] });
    const { result } = renderHook(() => useChatState());
    await act(async () => { await result.current.readDocument(file); });
    await act(async () => { await result.current.send('hola'); });
    expect(apiService.chatStream.mock.calls[0][0].history).toEqual([]);
  });
});

// ============================================================ el botón de la pantalla
describe('Botón para adjuntar la foto de una guía', () => {
  beforeEach(() => { mockUser = { id: 'u1', email: 'ana@logistica.bo', user_metadata: { full_name: 'Ana' }, app_metadata: { role: 'admin' } }; });
  const renderHome = () => render(<MemoryRouter><AssistantHome /></MemoryRouter>);

  it('el personal lo ve, con nombre accesible', () => {
    renderHome();
    expect(screen.getByRole('button', { name: /adjuntar la foto de una guía de remisión/i })).toBeInTheDocument();
  });

  it('un operador también; un cliente y un conductor no', () => {
    mockUser = { ...mockUser, app_metadata: { role: 'logistics_operator' } };
    const { unmount } = renderHome();
    expect(screen.getByRole('button', { name: /adjuntar la foto/i })).toBeInTheDocument();
    unmount();
    for (const role of ['client', 'driver']) {
      mockUser = { ...mockUser, app_metadata: { role } };
      const view = renderHome();
      expect(screen.queryByRole('button', { name: /adjuntar la foto/i })).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it('al elegir una foto, la lee y muestra la tarjeta para revisar', async () => {
    const { fileToJpegBase64: prepare } = await import('../../utils/imageForUpload');
    prepare.mockResolvedValue({ base64: 'QUJD', mime: 'image/jpeg' });
    apiService.extractDocument.mockResolvedValue({ data: { fields: FIELDS, missing: [], warnings: [], model: 'm' } });
    const { container } = renderHome();
    const input = container.querySelector('input[type="file"]');
    expect(input).toHaveAttribute('accept', expect.stringContaining('image/'));
    await userEvent.upload(input, new File(['img'], 'guia.png', { type: 'image/png' }));
    expect(await screen.findByText(/datos leídos de la guía/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^destinatario/i)).toHaveValue('María Fernanda Quispe');
  });
});
