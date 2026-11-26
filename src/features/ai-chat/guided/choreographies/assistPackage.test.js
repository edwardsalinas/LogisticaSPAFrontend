import { describe, expect, it, vi } from 'vitest';
import assistPackage, { STEPS, summarize } from './assistPackage';
import { StopError } from '../guidedForms';

/** Pantalla simulada: un formulario con ciudades, y un botón Registrar que «cierra» el formulario al pulsarse. */
const makeScreen = ({ submitCloses = true } = {}) => {
  const values = {};
  const state = { formOpen: true, said: [], pressed: [] };
  const els = Object.fromEntries(STEPS.map((s) => [s.field, { name: s.field }]));
  const form = {
    getOptions: (n) => (n === 'origen' ? ['La Paz', 'Oruro'] : n === 'destino' ? (values.origen === 'La Paz' ? ['Oruro', 'Cochabamba'] : ['La Paz']) : []),
    getElement: (n) => els[n],
    setValue: (n, v) => { values[n] = v; },
  };
  const submit = { tag: 'submit' };
  const ctx = {
    signal: new AbortController().signal,
    sleep: async () => {},
    waitFor: async (probe) => { const r = probe(); if (!r) throw new Error('timeout'); return r; },
    say: vi.fn(async (t) => { state.said.push(t); }),
    pointAt: async () => {},
    press: async (el) => { state.pressed.push(el); if (el === submit && submitCloses) state.formOpen = false; },
    typeInto: async (f, n, v) => f.setValue(n, v),
    findVisible: (sel) => (sel.includes('submit') ? submit : { tag: 'nuevo' }),
    getForm: () => (state.formOpen ? form : null),
    navigate: vi.fn(),
  };
  return { ctx, state, values };
};

/** Respuestas habladas en orden; null = silencio. */
const voice = (...answers) => { const q = [...answers]; return { listen: vi.fn(async () => (q.length ? q.shift() : null)) }; };

describe('assistPackage: Logi pregunta campo por campo y registra con un «sí» claro', () => {
  it('camino feliz: llena todo, lee el resumen y, al oír «sí», envía el formulario', async () => {
    const { ctx, state, values } = makeScreen();
    const io = voice('la paz', 'oruro', 'carlos mamani', 'tres y medio', 'maría quispe', 'siete uno dos tres cuatro cinco seis siete', 'documentos', 'sí, hazlo');
    const out = await assistPackage(ctx, io);
    expect(values).toEqual({ is_guest: true, origen: 'La Paz', destino: 'Oruro', sender_name: 'Carlos Mamani', peso: '3.5', recipient_name: 'María Quispe', recipient_phone: '71234567', description: 'Documentos' });
    expect(out.done).toBe(true);
    expect(state.pressed.at(-1).tag).toBe('submit');
    expect(state.said.some((t) => /¿Lo registro\?/.test(t))).toBe(true);
    expect(state.said.at(-1)).toMatch(/Registré el paquete/);
  });

  it('los campos opcionales se saltan con «ninguno»', async () => {
    const { ctx, values } = makeScreen();
    const out = await assistPackage(ctx, voice('oruro', 'la paz', 'rosa', '2 kilos', 'juan pérez', 'ninguno', 'nada', 'sí'));
    expect(values.recipient_phone).toBeUndefined();
    expect(values.description).toBeUndefined();
    expect(out.done).toBe(true);
  });

  it('si no entiende una ciudad, vuelve a preguntar nombrando las opciones (no inventa)', async () => {
    const { ctx, state, values } = makeScreen();
    await assistPackage(ctx, voice('tarija', 'la paz', 'oruro', 'rosa', '5', 'ana', 'ninguno', 'ninguno', 'no'));
    expect(state.said.some((t) => /No encontré esa ciudad. Dime una de estas: La Paz y Oruro/.test(t))).toBe(true);
    expect(values.origen).toBe('La Paz');
  });

  it('el destino solo ofrece lo que tiene viaje desde el origen elegido', async () => {
    const { ctx, state } = makeScreen();
    await assistPackage(ctx, voice('la paz', 'cancela'));
    expect(state.said.some((t) => /Desde ahí tengo viajes a Oruro y Cochabamba/.test(t))).toBe(true);
  });

  it('«cancela» en cualquier momento termina sin enviar nada y deja el formulario abierto', async () => {
    const { ctx, state } = makeScreen();
    const out = await assistPackage(ctx, voice('la paz', 'cancela'));
    expect(out.done).toBe(false);
    expect(state.formOpen).toBe(true);
    expect(state.pressed.every((p) => p.tag !== 'submit')).toBe(true);
  });

  it('tras tres silencios seguidos se rinde con aviso y no envía nada', async () => {
    const { ctx, state } = makeScreen();
    const out = await assistPackage(ctx, voice(null, null, null));
    expect(out.done).toBe(false);
    expect(state.said.at(-1)).toMatch(/No logro entender/);
    expect(state.formOpen).toBe(true);
  });

  it('una confirmación dudosa NO envía: el formulario queda listo para pulsar Registrar', async () => {
    const { ctx, state } = makeScreen();
    const out = await assistPackage(ctx, voice('la paz', 'oruro', 'rosa', '3', 'ana pérez', 'ninguno', 'ninguno', 'mmm tal vez'));
    expect(out.done).toBe(false);
    expect(state.pressed.every((p) => p.tag !== 'submit')).toBe(true);
    expect(state.said.at(-1)).toMatch(/pulsa Registrar/);
  });

  it('un «no» no envía', async () => {
    const { ctx, state } = makeScreen();
    const out = await assistPackage(ctx, voice('la paz', 'oruro', 'rosa', '3', 'ana pérez', 'ninguno', 'ninguno', 'no'));
    expect(out.done).toBe(false);
    expect(state.said.at(-1)).toMatch(/no lo registro/);
  });

  it('si el envío falla la validación (el formulario sigue abierto), avisa y no dice «listo»', async () => {
    const { ctx, state } = makeScreen({ submitCloses: false });
    ctx.waitFor = async (probe) => { const r = probe(); if (!r) throw new Error('timeout'); return r; };
    const out = await assistPackage(ctx, voice('la paz', 'oruro', 'rosa', '3', 'ana pérez', 'ninguno', 'ninguno', 'sí'));
    expect(out.done).toBe(false);
    expect(state.said.at(-1)).toMatch(/Falta algo/);
    expect(state.said.some((t) => /¡Listo!/.test(t))).toBe(false);
  });

  it('si la persona detiene a Logi (StopError), se propaga y no se envía nada', async () => {
    const { ctx, state } = makeScreen();
    const io = { listen: vi.fn(async () => { throw new StopError(); }) };
    await expect(assistPackage(ctx, io)).rejects.toBeInstanceOf(StopError);
    expect(state.pressed.every((p) => p.tag !== 'submit')).toBe(true);
  });
});

describe('summarize', () => {
  it('lee los datos principales y omite lo que no hay', () => {
    expect(summarize({ origen: 'La Paz', destino: 'Oruro', peso: '3.5', sender_name: 'Rosa', recipient_name: 'Ana' })).toBe('Paquete de La Paz a Oruro, de 3.5 kilos, de parte de Rosa, para Ana.');
    expect(summarize({ origen: 'A', destino: 'B', peso: '1', recipient_name: 'X', recipient_phone: '7123456', description: 'Ropa' })).toContain('teléfono 7123456, contenido: Ropa');
  });
});

describe('assistPackage con memoria de uso: reconoce contactos frecuentes', () => {
  const CONTACTS = {
    senders: [{ name: 'Carlos Mamani', phone: null, uses: 5 }],
    recipients: [{ name: 'Rosa Quispe', phone: '71234567', uses: 4 }, { name: 'Luis Llanos', phone: null, uses: 2 }],
  };
  const withContacts = (answers, contacts = CONTACTS) => ({ ...voice(...answers), api: { getLogiContacts: vi.fn(async () => ({ data: { data: contacts } })) } });

  it('oyó «Kispe»: pregunta «¿Te refieres a Rosa Quispe?»; con «sí» usa el nombre correcto y NO pregunta el teléfono', async () => {
    const { ctx, state, values } = makeScreen();
    const io = withContacts(['la paz', 'oruro', 'carlos mamani', 'tres', 'rosa kispe', 'sí', 'documentos', 'sí']);
    const out = await assistPackage(ctx, io);
    expect(state.said).toContain('¿Te refieres a Rosa Quispe?');
    expect(values.recipient_name).toBe('Rosa Quispe');
    expect(values.recipient_phone).toBe('71234567');
    expect(state.said.some((t) => /¿Tiene teléfono\?/.test(t))).toBe(false);
    expect(state.said.some((t) => /termina en 4 5 6 7/.test(t))).toBe(true);
    expect(state.said.some((t) => /teléfono 71234567/.test(t) && /¿Lo registro\?/.test(t))).toBe(true); // queda en el resumen que se confirma
    expect(out.done).toBe(true);
  });

  it('si la persona dice «no», se queda con lo que dijo y sí pregunta el teléfono', async () => {
    const { ctx, state, values } = makeScreen();
    const io = withContacts(['la paz', 'oruro', 'carlos mamani', 'tres', 'rosa kispe', 'no', 'ninguno', 'nada', 'sí']);
    await assistPackage(ctx, io);
    expect(values.recipient_name).toBe('Rosa Kispe');
    expect(values.recipient_phone).toBeUndefined();
    expect(state.said.some((t) => /¿Tiene teléfono\?/.test(t))).toBe(true);
  });

  it('si la respuesta no es un «sí» claro (silencio o duda), NO se cambia el nombre', async () => {
    for (const reply of [null, 'mmm no sé', 'a ver']) {
      const { ctx, values } = makeScreen();
      const io = withContacts(['la paz', 'oruro', 'carlos mamani', 'tres', 'rosa kispe', reply, 'ninguno', 'nada', 'sí']);
      await assistPackage(ctx, io);
      expect(values.recipient_name, String(reply)).toBe('Rosa Kispe');
    }
  });

  it('un nombre idéntico a uno guardado se usa sin preguntar (y con su teléfono)', async () => {
    const { ctx, state, values } = makeScreen();
    const io = withContacts(['la paz', 'oruro', 'carlos mamani', 'tres', 'rosa quispe', 'nada', 'sí']);
    await assistPackage(ctx, io);
    expect(state.said.some((t) => /¿Te refieres/.test(t))).toBe(false);
    expect(values.recipient_phone).toBe('71234567');
  });

  it('también reconoce al remitente', async () => {
    const { ctx, state, values } = makeScreen();
    const io = withContacts(['la paz', 'oruro', 'carlos mamany', 'sí', 'tres', 'ana', 'ninguno', 'nada', 'sí']);
    await assistPackage(ctx, io);
    expect(state.said).toContain('¿Te refieres a Carlos Mamani?');
    expect(values.sender_name).toBe('Carlos Mamani');
  });

  it('un contacto sin teléfono guardado: sí se pregunta el teléfono', async () => {
    const { ctx, state, values } = makeScreen();
    const io = withContacts(['la paz', 'oruro', 'carlos mamani', 'tres', 'luis llanos', 'siete uno dos tres cuatro cinco seis siete', 'nada', 'sí']);
    await assistPackage(ctx, io);
    expect(state.said.some((t) => /¿Tiene teléfono\?/.test(t))).toBe(true);
    expect(values.recipient_phone).toBe('71234567');
  });

  it('si no se pueden cargar los contactos (error de red), la ayuda sigue igual que antes', async () => {
    const { ctx, values } = makeScreen();
    const io = { ...voice('la paz', 'oruro', 'carlos mamani', 'tres', 'rosa kispe', 'ninguno', 'nada', 'sí'), api: { getLogiContacts: vi.fn(async () => { throw new Error('red'); }) } };
    const out = await assistPackage(ctx, io);
    expect(values.recipient_name).toBe('Rosa Kispe');
    expect(out.done).toBe(true);
  });

  it('con datos raros del servidor (no es una lista) tampoco falla', async () => {
    const { ctx } = makeScreen();
    const io = { ...voice('la paz', 'oruro', 'carlos mamani', 'tres', 'rosa kispe', 'ninguno', 'nada', 'sí'), api: { getLogiContacts: async () => ({ data: { data: { senders: 'x', recipients: { a: 1 } } } }) } };
    expect((await assistPackage(ctx, io)).done).toBe(true);
  });
});
