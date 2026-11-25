# Pruebas de extremo a extremo (e2e)

Flujos reales en el navegador con el backend, la base de datos (Supabase) y el modelo de IA **reales**.

## Antes de correrlas

1. **Backend con límites de pruebas** (importante):
   ```
   cd ../LogisticaSPABackend
   npm run start:e2e
   ```
   El servidor normal limita a 600 solicitudes cada 15 minutos por IP. Una corrida completa hace miles: a mitad de camino las páginas
   reciben «429» y las pruebas fallan sin un error real. `start:e2e` usa `.env.e2e` (límites altos, sin secretos). El límite del chat
   (15 por minuto) y el del proveedor de IA siguen igual: por eso las pruebas con IA se espacian.
2. **Frontend**: `npm run dev` (http://localhost:5173).
3. El plan gratuito del proveedor de IA limita los **tokens por minuto** (errores 429 «rate limit» en el registro del servidor): varias
   pruebas con IA seguidas pueden fallar por eso. No es un error del código.

## Cómo correrlas

| Comando | Para qué |
|---|---|
| `npm run e2e:tandas` | **Recomendado.** Un archivo a la vez, con pausa tras los que usan IA, limpieza de datos entre archivos y un reintento de los que fallan. Resumen en `e2e-tandas.log`. |
| `npm run e2e:tandas -- ai-pantalla lifecycle` | Solo esos archivos. |
| `npm run e2e` | Todo de una vez (necesita mucha memoria y no limpia entre archivos). |
| `npx playwright test e2e/lifecycle.spec.js` | Un archivo. |

Un archivo que pasa solo en el reintento se marca **inestable**, no roto: casi siempre es una carga lenta o el límite del proveedor.

## Datos

- Las pruebas crean datos marcados `E2E-<sello>` y los borran con `scripts/e2e-cleanup.mjs` del backend (el ejecutor por tandas lo hace
  solo tras cada archivo). Nunca borra por patrón amplio: solo los ids de la lista **y** con la marca.
- Datos de demostración (`node --env-file=.env scripts/seed-demo.mjs`, y `--remove` para quitarlos): las pruebas `ai-pantalla`,
  `ai-voz-asignar` y `ai-voz-evento` los usan y se **omiten** si no están. Terminan dejándolos como estaban.

## Pantallas lentas

`openScreen(page, ruta, listo)` (en `helpers.js`) abre una pantalla y repite la navegación hasta 90 s si queda en blanco o tarda. Úsalo
en vez de `page.goto` + una espera fija cuando la pantalla carga mapas o el servidor de desarrollo compila en frío.
