# Pruebas de extremo a extremo (e2e)

Flujos reales en el navegador con el backend, la base de datos (Supabase) y el modelo de IA **reales**.

## Antes de correrlas

0. **Contraseñas de los usuarios de prueba**: ya NO están en el código (el repositorio es público). Las pruebas las leen del archivo
   `.env.e2e.local` (que git ignora) o de las variables `E2E_ADMIN_PASSWORD`, `E2E_OPERATOR_PASSWORD`, `E2E_DRIVER_PASSWORD` y
   `E2E_CLIENT_PASSWORD`. Para crearlas (o cambiarlas) desde `LogisticaSPABackend`:
   ```
   node --env-file=.env scripts/rotar-claves-prueba.mjs            # simulación: no cambia nada
   node --env-file=.env scripts/rotar-claves-prueba.mjs --aplicar  # cambia las 4 contraseñas y crea .env.e2e.local
   ```
   También las deja en `credenciales.local.txt` para que las leas. En GitHub Actions vienen de los secretos del repositorio.

1. **Backend con límites de pruebas** (importante):
   ```
   cd ../LogisticaSPABackend
   npm run start:e2e
   ```
   **El ejecutor por tandas se detiene si el backend tiene los límites normales** (en vez de seguir y dar fallos falsos con 429). Si te lo dice, casi siempre hay OTRA copia del backend ya ocupando el puerto 3000: detenla y arranca `npm run start:e2e`. Para seguir igual, `E2E_ALLOW_LOW_LIMITS=1`. El servidor normal limita a 600 solicitudes cada 15 minutos por IP. Una corrida completa hace miles: a mitad de camino las páginas
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

## Corrida automática (CI)

Hay dos niveles, y la diferencia es deliberada:

| Qué | Cuándo corre | Usa |
|---|---|---|
| **CI** (`.github/workflows/ci.yml`, en este repositorio y en el del backend) | Solo, en cada push y pull request a `main` o `develop` | Nada externo: pruebas unitarias con datos simulados, compilación, auditoría de dependencias (falla con vulnerabilidades altas o críticas) y comprobación de que todas las pruebas e2e se pueden cargar. Sin secretos. |
| **E2E manual** (`.github/workflows/e2e.yml`) | Solo a mano: Actions → «E2E manual (sistema real)» → Run workflow, y hay que escribir `SI` | La base de datos real y el modelo de IA de los secretos del repositorio: crea y borra datos `E2E-<sello>` y gasta cuota de los proveedores de IA. |

**Por qué las e2e no corren solas:** necesitan una base de datos (hoy solo existe la de producción), claves de proveedores de IA con límite de
tokens por minuto, y cada archivo con IA puede fallar por ese límite y no por un error del código. Para lanzarlas solas en cada subida hace
falta decidir antes **dónde** corren la base y el modelo (un proyecto de Supabase de pruebas y claves propias). El flujo manual ya está listo
para eso: basta con apuntar los secretos a esa base.

Secretos que pide `e2e.yml`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, las claves de IA (`GEMINI_API_KEY`,
`GROQ_API_KEY`, `CEREBRAS_API_KEY`, `OPENROUTER_API_KEY`), opcionalmente `E2E_*_EMAIL` / `E2E_*_PASSWORD` de los cuatro usuarios de prueba, y
`BACKEND_REPO_TOKEN` solo si el repositorio del backend es privado. El captcha queda desactivado a propósito (sin `TURNSTILE_SECRET_KEY`).

Qué está probado y qué no: el CI se reprodujo en un clon limpio con Node 22 (la versión del flujo). El flujo manual de e2e **no se ha
ejecutado en GitHub** (hace falta crear los secretos); sus pasos se comprobaron por separado y el YAML es válido.

## Datos

- Las pruebas crean datos marcados `E2E-<sello>` y los borran con `scripts/e2e-cleanup.mjs` del backend (el ejecutor por tandas lo hace
  solo tras cada archivo). Nunca borra por patrón amplio: solo los ids de la lista **y** con la marca.
- Datos de demostración (`node --env-file=.env scripts/seed-demo.mjs`, y `--remove` para quitarlos): las pruebas `ai-pantalla`,
  `ai-voz-asignar` y `ai-voz-evento` los usan y se **omiten** si no están. Terminan dejándolos como estaban.

## Pantallas lentas

`openScreen(page, ruta, listo)` (en `helpers.js`) abre una pantalla y repite la navegación hasta 90 s si queda en blanco o tarda. Úsalo
en vez de `page.goto` + una espera fija cuando la pantalla carga mapas o el servidor de desarrollo compila en frío.
