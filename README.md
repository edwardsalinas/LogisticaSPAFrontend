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
