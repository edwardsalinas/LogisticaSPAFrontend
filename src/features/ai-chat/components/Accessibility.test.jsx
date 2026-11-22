import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import VoiceMode from './VoiceMode';
import ChatBubble from './ChatBubble';
import Announcer, { announcementFor } from './Announcer';
import { installSpeech, uninstallSpeech } from '../voiceTestUtils';

const chat = () => ({ send: vi.fn(async () => ({ ok: true, text: 'ok', attachments: [] })), loading: false, messages: [] });

describe('Chat de voz: diálogo modal accesible', () => {
  let appRoot;
  beforeEach(() => {
    installSpeech();
    appRoot = document.createElement('div');
    appRoot.id = 'root';
    document.body.appendChild(appRoot);
  });
  afterEach(() => {
    uninstallSpeech();
    appRoot.remove();
  });

  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>abrir voz</button>
        {open && <VoiceMode chat={chat()} onClose={() => setOpen(false)} />}
      </>
    );
  }

  it('el foco entra al diálogo al abrirse', () => {
    render(<VoiceMode chat={chat()} onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: /chat de voz/i })).toContainElement(document.activeElement);
    expect(document.activeElement).toHaveAccessibleName(/dejar de escuchar/i);
  });

  it('Tab y Mayús+Tab no salen del diálogo (el foco da la vuelta)', async () => {
    render(<VoiceMode chat={chat()} onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    const close = screen.getByRole('button', { name: /salir del chat de voz/i });
    const handsFree = screen.getByRole('checkbox', { name: /manos libres/i });

    handsFree.focus(); // último control
    await userEvent.tab();
    expect(document.activeElement).toBe(close); // da la vuelta al primero
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(handsFree); // y al revés
    expect(dialog).toContainElement(document.activeElement);
  });

  it('el resto de la página queda inerte mientras está abierto y se restaura al cerrar', async () => {
    render(<Harness />);
    expect(appRoot).not.toHaveAttribute('inert');
    await userEvent.click(screen.getByRole('button', { name: 'abrir voz' }));
    expect(appRoot).toHaveAttribute('inert');
    await userEvent.click(screen.getByRole('button', { name: /salir del chat de voz/i }));
    expect(appRoot).not.toHaveAttribute('inert');
  });

  it('al cerrar, el foco vuelve al botón que lo abrió', async () => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'abrir voz' });
    await userEvent.click(trigger);
    expect(document.activeElement).not.toBe(trigger);
    await userEvent.keyboard('{Escape}');
    expect(document.activeElement).toBe(trigger);
  });

  it('se dibuja fuera de la raíz de la aplicación (portal), para poder inertizarla', () => {
    render(<VoiceMode chat={chat()} onClose={() => {}} />);
    expect(appRoot.contains(screen.getByRole('dialog'))).toBe(false);
  });

  it('lo que vas diciendo (parcial) no se anuncia al lector de pantalla', async () => {
    const { FakeRecognition } = await import('../voiceTestUtils');
    render(<VoiceMode chat={chat()} onClose={() => {}} />);
    act(() => FakeRecognition.last.say('quiero saber si hay lugar', { final: false }));
    expect(screen.getByText(/quiero saber si hay lugar/)).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('Quién habla y qué se anuncia', () => {
  it('cada mensaje indica su autor a un lector de pantalla', () => {
    render(<MemoryRouter><ChatBubble message={{ role: 'user', content: 'hola' }} /><ChatBubble message={{ role: 'assistant', content: 'buenas' }} /></MemoryRouter>);
    expect(screen.getByText('Tú:')).toHaveClass('sr-only');
    expect(screen.getByText('Asistente:')).toHaveClass('sr-only');
  });

  it('anuncia solo una frase corta, no la respuesta entera con sus tarjetas', () => {
    const long = `${'Primera frase importante. '}${'x'.repeat(500)}`;
    const text = announcementFor([{ role: 'assistant', content: long, attachments: [{ kind: 'package_list', packages: [] }] }]);
    expect(text).toBe('Respuesta del asistente: Primera frase importante. Los detalles están en las tarjetas.');
    expect(text.length).toBeLessThan(120);
  });

  it('recorta una primera frase larguísima', () => {
    const text = announcementFor([{ role: 'assistant', content: 'a'.repeat(400) }]);
    expect(text.length).toBeLessThan(200);
    expect(text.endsWith('…')).toBe(true);
  });

  it('avisa cuando hay una acción esperando confirmación y cómo resolverla', () => {
    const text = announcementFor([{ role: 'assistant', content: 'Preparé la entrega.', attachments: [{ kind: 'action_proposal', action: { title: 'Confirmar entrega de un paquete' } }] }]);
    expect(text).toContain('acción esperando tu confirmación: Confirmar entrega de un paquete');
    expect(text).toContain('Confirmar o Cancelar');
  });

  it('estados: consultando, error, sin mensajes o último mensaje del usuario', () => {
    expect(announcementFor([], true)).toBe('Consultando…');
    expect(announcementFor([{ role: 'assistant', content: 'x', isError: true }])).toBe('El asistente no pudo responder.');
    expect(announcementFor([])).toBe('');
    expect(announcementFor([{ role: 'user', content: 'hola' }])).toBe('');
  });

  it('la región es "polite" y atómica, y está oculta a la vista', () => {
    render(<Announcer messages={[{ role: 'assistant', content: 'Hola.' }]} loading={false} />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-atomic', 'true');
    expect(region).toHaveClass('sr-only');
  });
});
