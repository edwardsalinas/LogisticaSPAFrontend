# Plataforma Logística Asistida por IA - Frontend (SPA)

Este repositorio contiene la interfaz de usuario (Single Page Application) para el sistema de Gestión Logística Asistida por Inteligencia Artificial, diseñada para ofrecer una experiencia premium, reactiva y altamente visual.

## Arquitectura del Frontend

Siguiendo la filosofía del **Monolito Modular** del backend, el frontend está organizado mediante una arquitectura orientada a **Funcionalidades (Feature-Based Architecture)**. Este enfoque permite que cada dominio de negocio tenga autonomía técnica dentro de la aplicación, facilitando el mantenimiento y la escalabilidad.

### Principios de Diseño
1.  **Aislamiento de Funcionalidades**: Cada módulo en `src/features` encapsula sus propios componentes de página, componentes locales, hooks específicos y lógica de negocio.
2.  **Estado Basado en Servidor (Server-State Management)**: Utilizamos **TanStack Query (React Query)** como el "cerebro" que sincroniza la UI con la base de datos Supabase, eliminando la necesidad de estados globales complejos (Redux/Zuid) y garantizando datos siempre frescos mediante invalidación inteligente.
3.  **Sistema de Diseño Atómico (Atomic Design Lite)**: Los componentes transversales se dividen en `atoms` (botones, inputs), `molecules` (cards, selectores) y `organisms` (modales, forms) en `src/components`, promoviendo la reutilización y consistencia visual.
4.  **Estética Premium (Glassmorphism)**: Interfaz diseñada con una estética moderna basada en transparencias, desenfoques (backdrop-blur) y animaciones sutiles, priorizando la visualización de datos críticos.

---

## Módulos de la Aplicación (Features)

El frontend se divide en contextos de negocio alineados con la lógica del backend:

### 1. Logística (Logistics)
- **Gestión de Rutas**: Creación de itinerarios mediante selección de trazados predefinidos o marcación libre en mapa.
- **Asignación y Despacho**: Control de carga de paquetes y vinculación con conductores y vehículos.
- **Cronogramas**: Vistas de calendario para la gestión de viajes recurrentes y únicos.

### 2. Rastreo e Historial (Tracking)
- **Live Tracker**: Mapa interactivo basado en Leaflet para el seguimiento en tiempo real de la flota.
- **Historial de Trazabilidad**: Visualización cronológica de eventos (pings, llegadas a agencias, entregas).
- **Rastreo Público**: Interfaz dedicada para clientes finales que permite consultar el estado de su envío sin autenticación.

### 3. Asistente Inteligente (AI-Chat)
- **Soporte Dinámico**: Interfaz de chat integrada con el Agente de IA para consultas operativas rápidas (ej: "¿Dónde está la ruta TRK-001?").
- **Automatización**: Procesamiento de lenguaje natural para la interacción con los datos del sistema.

### 4. Gestión de Recursos (Fleet & Auth)
- **Flota**: Dashboards para la administración de conductores (perfiles) y vehículos (placas, modelos).
- **IAM**: Gestión de roles (Admin, Logistics, Driver, Client) integrada con las políticas de seguridad de Supabase.

---

## Stack Tecnológico

- **Core**: React 18+ con Vite para un desarrollo ultra-rápido.
- **Gestión de Datos**: TanStack Query v5 (React Query) para sincronización de API y caché.
- **Navegación**: React Router 6.
- **Mapas**: Leaflet con React Leaflet para visualización geográfica.
- **UI & Iconografía**: Lucide React para iconos consistentes y CSS Customizado para efectos de Glassmorphism.
- **Calendarios**: FullCalendar para la gestión de cronogramas operativos.

---

## Estructura de Carpetas

```text
src/
├── app/            # Configuración global, AuthProvider, Roles
├── components/     # UI Framework (Atomic Design)
│   ├── atoms/      # Componentes base (Botones, Inputs, Badges)
│   ├── molecules/  # Combinaciones (StatCard, FilterSelect, Modales)
│   └── organisms/  # Estructuras complejas (RouteForm, Sidebar)
├── features/       # MÓDULOS DE NEGOCIO (Lógica aislada por dominio)
│   ├── logistics/
│   ├── tracking/
│   ├── ai-chat/
│   └── fleet/
├── services/       # Cliente de API centralizado (apiService.js)
├── hooks/          # Hooks globales (useGeolocation, etc.)
├── utils/          # Utilidades geográficas y formateadores
└── styles/         # Tokens de diseño y estilos globales
```

---

## Guía de Desarrollo

### Instalación
```bash
npm install
```

### Ejecución en Desarrollo
```bash
npm run dev
```

### Construcción para Producción
```bash
npm run build
```

---
**LogisticaSPA**: Elevando la gestión logística mediante trazabilidad absoluta e inteligencia aplicada.

## Seguridad en el cliente

- **Sesión:** el JWT lo emite el backend en una cookie `httpOnly`; el frontend nunca lo guarda ni lo lee (solo un indicador no sensible en `localStorage` para saber si consultar la sesión). Las peticiones usan `withCredentials` y el header `X-Requested-With` (protección CSRF). Si el token vence, el interceptor de Axios lo renueva con `/iam/refresh` y reintenta la petición.
- **Captcha:** `src/components/molecules/Captcha.jsx` (Cloudflare Turnstile) en el login y en el rastreo público. Se activa con `VITE_TURNSTILE_SITE_KEY`.
- **Formularios:** React Hook Form + Zod (`zodResolver`) en el login y el registro de paquetes.
- **Estado global de sesión:** React Context API (`src/app/AuthContext.jsx`); estado de servidor con React Query.

## Pruebas

```bash
npm test      # Vitest + Testing Library (jsdom): 138 pruebas
```

Cubren todos los formularios principales (login, paquetes, vehículos, checkpoints, rutas, eventos de seguimiento y asignaciones; React Hook Form + Zod), el asistente de IA conectado al backend, la cola offline de puntos GPS (IndexedDB), el cliente HTTP con sesión por cookie (renovación y reintento tras un 401), la resolución de roles, la unificación de estados con el backend y el panel del conductor (aviso de modo offline). El CI (`.github/workflows/ci.yml`) ejecuta `npm test` y `npm run build` en cada push.

## Asistente de IA

El panel de chat (`AiAssistantPanel`) envía cada mensaje a `POST /ai-agent/chat` junto con el historial reciente de la conversación. El backend aplica límites de uso, valida la entrada y restringe lo que cada rol puede consultar. Las respuestas se muestran como texto plano (sin HTML).

## Tracking sin conexión (offline)

El panel del conductor no pierde puntos GPS cuando se cae la conexión:

1. Si no hay red, cada lectura se guarda en una cola local (IndexedDB, `src/services/offlineQueue.js`) con su hora real.
2. Al recuperar la señal se envían en lote, en orden cronológico, a `POST /tracking/trip/:id/events/batch`.
3. El service worker (`public/sw.js`, Background Sync) puede vaciar la cola aunque la pestaña esté en segundo plano. Se registra solo en la build de producción (`npm run build` + `npm run preview`).
4. Limitaciones: Background Sync no existe en Safari/iOS (la app vacía la cola al volver la conexión), y un navegador no obtiene GPS con la pantalla apagada.

## Docker

`Dockerfile` (build con Vite + nginx) y `nginx.conf` (SPA + proxy de `/api` y `/api-docs` al backend). Se orquesta con el `docker-compose.yml` del repositorio del backend:

```bash
cd ../LogisticaSPABackend
docker compose up --build   # frontend en http://localhost:8080
```

## Pruebas end-to-end (Playwright)

Manejan un Chrome real contra la aplicación y la base conectada (Supabase), con los 4 roles. Requieren el backend en `http://localhost:3000` y `npm run dev` (frontend) corriendo, más los usuarios de `LogisticaSPABackend/scripts/seed-users.js` (o los de `E2E_*_EMAIL` / `E2E_*_PASSWORD`).

```bash
npm run e2e          # en segundo plano
npm run e2e:headed   # viendo el navegador
```

- `e2e/navigation.spec.js`: cada rol recorre sus páginas sin errores de consola ni de API, y no entra a páginas de otros roles.
- `e2e/ai-mode.spec.js`: el Modo IA (interruptor, preferencia, respuestas con tarjetas por rol). Escribe datos etiquetados y guarda sus ids en `e2e-results/created-ai.json`.
- `e2e/ai-voice.spec.js`: chat de voz (reconocimiento y síntesis simulados), varias peticiones en una frase, contexto entre preguntas, conversación que sobrevive al cambio de pantalla, acciones que no se confirman por voz y permisos del cliente. Sin datos persistentes.
- `e2e/ai-actions.spec.js`: acciones del asistente con confirmación (la tarjeta no cambia nada hasta confirmar, cancelar, un tercero no puede confirmar, no se repite, permisos por rol). Ids en `e2e-results/created-actions.json`.
- `e2e/lifecycle.spec.js`: ciclo completo con acciones reales (viaje, paquete, evento, entrega del conductor con nota, vista del cliente, Analítica y asistente de IA). Escribe datos etiquetados `E2E-<sello>` y guarda sus ids en `e2e-results/created.json`.

**Limpieza** (borra solo lo creado por las pruebas, con la clave de servicio del backend):

```bash
cd ../LogisticaSPABackend
node --env-file=.env scripts/e2e-cleanup.mjs ../LogisticaSPAFrontend/e2e-results/created.json
node --env-file=.env scripts/e2e-cleanup.mjs ../LogisticaSPAFrontend/e2e-results/created-ai.json
node --env-file=.env scripts/e2e-cleanup.mjs ../LogisticaSPAFrontend/e2e-results/created-actions.json
```

Inician sesión una sola vez por rol y reutilizan la sesión (Supabase Auth limita los intentos de inicio de sesión por IP).

## Modo IA (asistente primero)

Interruptor **Modo IA** en la barra superior (preferencia por usuario, guardada en el navegador; desactivado por defecto).

- **Desactivado:** la aplicación se ve como siempre, con el asistente como panel flotante.
- **Activado:** la aplicación abre en el asistente (`/` y `/assistant`), para todos los roles. Se pregunta en lenguaje natural ("¿dónde está mi paquete?", "¿cómo va la operación?", "¿qué entregas tengo hoy?") y las respuestas incluyen tarjetas con los datos. Si se le pide una acción (crear un paquete, registrar un evento, entregar), el asistente la **propone** en una tarjeta y solo se ejecuta al pulsar **Confirmar**. El menú añade **Asistente** como primera opción y el Dashboard pasa a `/dashboard`.

Código: `src/app/AiModeContext.jsx` (preferencia), `src/features/ai-chat/` (vista, tarjetas, preguntas sugeridas por rol y el hook de conversación compartido con el panel flotante).

## Chat de voz y conversación

- **Conversación compartida:** el panel flotante, la pantalla del asistente y el chat de voz hablan en la misma conversación, que no se pierde al cambiar de pantalla y se borra al cerrar sesión o cambiar de usuario (`AssistantChatProvider`).
- **Dictar** (botón del micrófono): hablas una frase y se envía como pregunta.
- **Chat de voz** (botón de auriculares): pantalla completa con un círculo de estados (te escucho / pensando / hablando). El asistente responde en voz alta y vuelve a escucharte (**manos libres**, desactivable); tocar el círculo mientras habla lo **interrumpe**. Tras dos silencios seguidos se detiene.
- **Leer las respuestas** (botón del altavoz): en el chat escrito, las respuestas también se escuchan.
- **Las acciones no se confirman por voz:** pedirlas por voz crea la tarjeta, pero ejecutar exige pulsar **Confirmar**.

Limitaciones y privacidad (Web Speech API del navegador, sin servidor ni claves propias):
- El reconocimiento de voz funciona en **Chrome, Edge y Safari**; en Firefox no hay micrófono (queda el chat escrito y la lectura en voz alta). Necesita HTTPS o `localhost` y permiso de micrófono.
- En **Chrome el audio se procesa en servidores de Google**; el asistente solo recibe el texto transcrito.
- La calidad del reconocimiento y de la voz dependen del navegador y del sistema operativo; las pruebas automáticas usan un reconocimiento simulado (no pueden validar la voz real).
