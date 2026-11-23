---
description: Mejora la interfaz de una vista o componente (plan primero, cambios después de confirmar)
argument-hint: <ruta del archivo o de la vista, p. ej. src/features/logistics/pages/PackagesPage.jsx>
---

Actúa como diseñador-ingeniero senior de interfaces. Mejora la vista o componente indicado: **$ARGUMENTS**

## Contexto del proyecto (no lo cambies)
- React 19 + Vite 8 + Tailwind 4, en **JavaScript (.jsx)**, no TypeScript.
- Sistema de componentes propio por átomos, moléculas y organismos (`src/components`). **Reutilízalos antes de crear otros**; sigue `docs/design-system.md`.
- Íconos con `lucide-react`, avisos con `sonner` (ya instalado), gráficos con `recharts`, datos con TanStack Query, formularios con React Hook Form + zod.
- Toda la interfaz está **en español**. Mantén el tono y la terminología actuales ("viaje", "punto de control", "carga suelta").
- Hay accesibilidad ya trabajada (etiquetas, foco, avisos para lectores de pantalla, 390 px de ancho mínimo). No la empeores.

## Reglas de diseño
- **Un solo protagonista visual** por pantalla. Es una aplicación operativa: prima la lectura rápida, la consistencia y lo que el usuario ya conoce; la expresión va en detalles precisos.
- **Cero estética genérica de IA**: nada de degradados neón, brillos excesivos, tarjetas idénticas repetidas ni emojis como íconos.
- Respeta `prefers-reduced-motion`. Las animaciones deben ser sutiles, no bloquear el hilo principal y no moverse en el celular del conductor.
- **No agregues dependencias** (ni librerías de componentes ni de animación) sin decirlo y sin que yo lo confirme. Prefiere CSS y lo que ya hay.
- Comprueba la vista a 390, 768 y 1280 px.

## Flujo obligatorio
1. **Analiza primero**: lee el archivo y sus componentes, mira la pantalla real si se puede (capturas con Playwright o en `Capturas-manual`) y evalúa con la habilidad `impeccable` (crítica de jerarquía, tipografía, color, espaciado, estados, accesibilidad y móvil).
2. **Propón un plan breve** (máximo 5 puntos, ordenados por impacto, con el archivo que tocarás en cada uno) y **espera mi confirmación**. No edites nada antes.
3. Tras mi confirmación, aplica los cambios **sin romper la lógica**: conserva estados, props, llamadas a la API, permisos por rol y textos que usan las pruebas.
4. **Verifica**: `npx vitest run` y `npx vite build` deben pasar; si tocaste una pantalla con prueba de extremo a extremo, ejecuta ese archivo (`npx playwright test e2e/<archivo>`). Vuelve a mirar el resultado a los tres anchos.
5. Resume qué cambió, qué verificaste y qué quedó sin verificar. No hagas commit salvo que te lo pida.
