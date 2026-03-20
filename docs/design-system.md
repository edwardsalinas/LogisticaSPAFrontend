# Design System UI

## Objetivo
Mantener una interfaz moderna, clara y consistente para LogisticaSPAFrontend.

## Tipografia
- Display: `Manrope`
- Body/UI: `Inter`
- Titulos: `font-display` con tracking negativo moderado
- Labels y metadatos: mayusculas, tracking amplio y tamano pequeno

## Iconografia
- Libreria oficial: `lucide-react`
- Usar trazos simples, sin mezclar emojis ni iconos rasterizados
- Tamanos comunes:
  - KPI/Card: `18`
  - Botones y acciones: `16`
  - Metadatos/timeline: `13-14`

## Color Roles
- `primary-*`: acciones principales y acentos de marca
- `surface-*`: fondos, bordes y texto neutro
- `emerald`: exito / completado
- `amber`: espera / advertencia
- `sky` o `blue`: informacion / tracking
- `violet`: resumen o metricas secundarias
- `red`: error destructivo o validacion

## Layout
- Cada pagina debe abrir con un hero o encabezado editorial cuando sea un modulo principal.
- Usar contenedores con `rounded-[1.8rem]` o `rounded-[2rem]` para bloques principales.
- Mantener aire visual con `space-y-8` entre secciones.
- En desktop, preferir grids asimetricos con dos zonas: contexto + contenido operativo.

## Cards
- KPI cards: usar `StatCard`
- Cards operativas: fondo blanco translucido, borde suave y sombra ligera
- Evitar tarjetas genericas planas sin jerarquia visual
- Toda card debe incluir al menos:
  - titulo claro
  - valor o accion principal
  - texto auxiliar o estado

## Tablas y listas
- Preferir `DataTable` para listados administrativos
- En listas laterales, usar seleccion marcada con borde/acento de color
- Los estados siempre se renderizan con `Badge`

## Formularios y modales
- Modales con `Modal.jsx`
- Formularios con bloques introductorios, grupos claros y mensajes de ayuda
- Inputs: usar `Input`, `Select`, `SearchInput`
- Boton primario alineado a la derecha al final del flujo

## Motion y feedback
- Transiciones suaves en hover/focus
- No usar animaciones decorativas pesadas en vistas operativas
- Priorizar claridad sobre espectaculo

## Regla de consistencia
Antes de crear un componente nuevo, revisar si el patron ya existe en:
- `src/components/atoms`
- `src/components/molecules`
- `src/components/organisms`

Si existe un patron similar, extenderlo en lugar de inventar otro estilo.