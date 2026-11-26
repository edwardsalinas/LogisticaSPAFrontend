/* Lógica de los avisos con la pestaña cerrada (Web Push), separada de sw.js para poder probarla.
 * La carga sw.js con importScripts('/push-handlers.js') y expone `self.LogiPush`. Sin dependencias.
 *
 * Qué hace:
 *  - parsePayload: lee lo que envió el servidor. Un mensaje roto o ajeno NO rompe nada: se muestra un aviso genérico.
 *  - safeUrl: a dónde abrir al tocar la notificación. Solo rutas de la propia aplicación (nunca una dirección de otro sitio).
 *  - shouldShow: si ya hay una pestaña de la aplicación a la vista, NO se muestra la notificación (la propia aplicación ya muestra el aviso).
 */
(function (scope) {
  var FALLBACK = { title: 'Logi', body: 'Tienes un aviso nuevo', url: '/', tag: 'logi-aviso' };

  function clip(value, max) {
    return typeof value === 'string' ? value.slice(0, max) : '';
  }

  /** Solo rutas internas: empiezan con «/» y no con «//», sin espacios ni caracteres de control. */
  function safeUrl(value) {
    return typeof value === 'string' && /^\/(?!\/)[^\s\u0000-\u001f]*$/.test(value) && value.length <= 300 ? value : '/';
  }

  function parsePayload(text) {
    var data;
    try { data = JSON.parse(text); } catch (e) { return Object.assign({}, FALLBACK); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return Object.assign({}, FALLBACK);
    return {
      title: clip(data.title, 60) || FALLBACK.title,
      body: clip(data.body, 160) || FALLBACK.body,
      url: safeUrl(data.url),
      tag: clip(data.tag, 80) || FALLBACK.tag,
    };
  }

  /** ¿Hay alguna pestaña de la aplicación a la vista? (entonces la aplicación ya avisa por sí sola) */
  function shouldShow(clients) {
    return !(clients || []).some(function (c) { return c && c.visibilityState === 'visible'; });
  }

  scope.LogiPush = { parsePayload: parsePayload, safeUrl: safeUrl, shouldShow: shouldShow, FALLBACK: FALLBACK };
})(typeof self !== 'undefined' ? self : this);
