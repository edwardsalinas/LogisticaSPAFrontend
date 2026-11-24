/**
 * Registro de formularios que Logi puede "manejar" a la vista de todos.
 * Un formulario se registra al abrirse (registerGuidedForm) y ofrece solo dos cosas: poner un valor en un campo
 * y entregar el elemento del campo, para que Logi se acerque y lo resalte. El envío NUNCA lo hace el formulario:
 * la acción la ejecuta el servidor al confirmar la propuesta (así no hay doble ejecución).
 */
const forms = new Map();

export const registerGuidedForm = (name, api) => {
  forms.set(name, api);
  return () => { if (forms.get(name) === api) forms.delete(name); };
};

export const getGuidedForm = (name) => {
  const api = forms.get(name);
  return api && (api.isReady?.() ?? true) ? api : null; // «lista» = ya cargó sus opciones
};

/** Eventos con los que Logi pide cosas a la pantalla (la página dueña del formulario los escucha). */
export const GUIDED_EVENTS = {
  packageCreated: 'logi:paquete-creado',
  cancelForm: 'logi:cancelar-formulario',
};
export const emitGuided = (name) => window.dispatchEvent(new CustomEvent(name));

/** Se lanza cuando la persona detiene a Logi: la acción NO se hace y no queda nada a medias. */
export class StopError extends Error {
  constructor() { super('Logi se detuvo'); this.name = 'StopError'; }
}
