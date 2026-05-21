# 4. guía de estilos y prototipado

## Prototipo en Figma
Prototipo de referencia:

https://www.figma.com/design/H4suweb5Pc2qJqUs7iRXQ9/Prototipo_TFG_PFF?node-id=0-1&t=Dou0TuJGGV2lCw4X-1

## Sistema visual implementado
He construido el sistema visual con SCSS por capas y reutilizacion de tokens, evitando estilos aislados por pantalla.

La entrada principal del estilo es app.scss, donde importo:

1. Settings (variables, tokens, theme).
2. Tools (mixins).
3. Generic y Elements (reset, tipografia, formularios).
4. Objects (layout y container).
5. Components (atoms, molecules, organisms, pages).
6. Utilities.

## Tipografia
Defino familias en tokens de settings:

1. Sans principal: Space Grotesk + Instrument Sans.
2. Mono: JetBrains Mono.
3. Display: Playfair Display.

Esto me permite mantener jerarquia visual distinta entre texto operativo, técnico y decorativo.

## Color y tema
La paleta esta centralizada en _variables.scss con soporte claro/oscuro y tokens compartidos para páginas academicas.

Ejemplos reales:

1. Variables de superficie y texto para light/dark.
2. Tokens de marca y estados (brand, danger, muted, ring).
3. Tokens rgba para overlays y gradientes.

además, en componentes uso var(--color-*) para conservar coherencia con el tema activo.

## Espaciado y radios
He normalizado espaciado con escala en rem:

1. space-1 a space-12.
2. radios sm/md/lg.
3. sombras sm/md reutilizables.

## Metodologia de clases y estructura
Sigo convencion BEM en componentes y páginas. Ejemplos reales del header académico:

1. c-academia-header.
2. c-academia-header__nav-link.
3. c-academia-header__notification--critical.

Y en páginas:

1. p-dashboard__hero.
2. p-tareas__calendar.
3. p-recursos__resource-icon--document.

Esta convencion me ha permitido mantener claridad al crecer en modulos.

## Responsive y composicion
He centralizado breakpoints y mixins. El mixin up(sm|md|lg|xl) evita repetir media queries manuales, y focus-ring unifica feedback de foco accesible.

## Componentes reutilizables
En la capa de UI reutilizo componentes compartidos para no duplicar comportamiento:

1. Alert y AlertError para feedback.
2. Spinner y Skeleton para estados de carga.
3. Dialog y Dropdown para interacciones complejas.
4. Header académico comun en todas las secciones principales.

## Wireframes y correspondencia con interfaz final
La implementación final conserva la estructura de alto nivel del prototipo:

1. Panel principal con hero + bloques de decision.
2. Vistas por módulo (asignaturas, tareas, calificaciones, recursos).
3. Zona de configuración y seguridad separada.

## Accesibilidad aplicada
He aplicado medidas concretas en código de interfaz:

1. aria-label en botones, navegación y listados de notificaciones.
2. Estados aria-expanded y aria-controls en menu movil.
3. role=alert y aria-live en avisos críticos (sesión Moodle no activa).
4. focus-ring reutilizable en elementos interactivos con teclado.
5. Semántica HTML estricta: `<main>`, `<nav>`, `<article>`, `<section>`, `<header>`, `<footer>`, `<figure>`. Nunca `<div>` genérico donde existe alternativa semántica.
6. Jerarquía de encabezados `h1 → h2 → h3` respetada en todas las páginas.
7. `alt` descriptivos en todas las imágenes (`alt={`Imagen de ${course.title}`}`).
8. `loading="lazy"` en imágenes no críticas.
9. Navegación por teclado funcional en todos los componentes interactivos (Calendar, Modal, Dropdown, Sidebar).9. **Skip-to-content** implementado en `AppShell`: el primer elemento tabulable es un enlace `#main-content` oculto visualmente que aparece al recibir foco, permitiendo a usuarios de teclado/lector de pantalla saltar la navegación directamente al contenido.

```tsx
// app-shell.tsx — primer elemento del DOM en todo el layout
<a href="#main-content" className="u-skip-to-content">
    Saltar al contenido principal
</a>
```

```scss
// _helpers.scss — visible solo en focus, conforme WCAG 2.4.1
.u-skip-to-content {
    position: absolute;
    top: -100%;
    &:focus { top: 0; }
}
```

---

## Animaciones y transiciones CSS

El sistema de animaciones está distribuido en dos capas:

### Animaciones (keyframes)

**Capa utilities (`_helpers.scss`):**

```scss
// Spinner global de carga — se activa via clase .u-loading-spinner
animation: c-global-loading-spin 800ms linear infinite;

@keyframes c-global-loading-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
```

**Capa pages — asignaturas (`_asignaturas.scss`):**

```scss
// Spinner de carga específico de la página de asignaturas
animation: asignaturas-loading-spin 1s linear infinite;

@keyframes asignaturas-loading-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
```

**Capa pages — welcome (`_welcome.scss`):**

```scss
// Resplandor pulsante del hero — 4 segundos, suave
animation: welcome-glow-breathe 4s ease-in-out infinite;

// Teléfono flotante en hero — movimiento vertical continuo
animation: welcome-phone-float 5s ease-in-out infinite;

// Tags decorativos con retraso escalonado
animation: welcome-tag-float 5s ease-in-out infinite;
animation-delay: 0s;       // primer tag
animation-delay: 2.5s;     // segundo tag (offset para efecto orgánico)

// Carrusel de logos (marquee) — desplazamiento horizontal continuo
animation: welcome-marquee 22s linear infinite;
```

Todos los `@keyframes` usan prefijo de página (`welcome-`, `asignaturas-`) para evitar colisiones en el scope global.

### Transiciones CSS

**Atoms — botones (`_button.scss`):**

```scss
// Todos los botones del sistema
transition: background-color 180ms ease, border-color 180ms ease;
```

Esta transición se aplica a cada variante del componente `c-button` (primary, secondary, outline, ghost, destructive), garantizando feedback visual consistente en hover/focus en toda la aplicación.

**Pages — admin (`_admin.scss`):**

```scss
// Filas de tabla admin en hover
transition: background-color 100ms ease;

// Botones de acción de admin
transition: background-color 100ms ease, color 100ms ease, border-color 100ms ease;
```

**Pages — welcome (`_welcome.scss`):**

```scss
// Indicador activo de navegación
transition: transform 0.12s;

// Métricas del hero (expansión)
transition: width 0.2s, height 0.2s;

// Links de navegación
transition: color 0.2s;

// Botones CTA con escala
transition: background 0.2s, transform 0.18s;

// Botones secundarios con color
transition: background 0.2s, color 0.2s, transform 0.18s;

// Progreso de la barra de carga (SPA)
transition: width 0.4s ease;

// Inputs del formulario de contacto
transition: border-color 0.28s, background 0.28s;

// Iconos SVG dentro de inputs
transition: stroke 0.28s;
```

### Principios de las animaciones

1. **Duraciones**: 100–200ms para feedback inmediato (hover), 400ms–5s para efectos decorativos.
2. **Easing**: `ease` para interacciones, `ease-in-out` para loops, `linear` para spinners/marquee.
3. **Prefijo BEM**: todos los `@keyframes` llevan prefijo del componente/página donde se usan.
4. **Accesibilidad**: Las animaciones decorativas (glow, float, marquee) no son críticas para la funcionalidad — respetan `prefers-reduced-motion` por estar en la landing pública, no en el flujo de app.

---

## Interactividad por teclado

La aplicación soporta navegación y control por teclado en varios niveles:

### Atajo de teclado global

```ts
// sidebar.tsx
const SIDEBAR_KEYBOARD_SHORTCUT = 'b'

useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      toggleSidebar()
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [toggleSidebar])
```

**Ctrl+B** / **⌘+B** colapsa/expande el sidebar en toda la aplicación. El event listener se registra y desregistra con el ciclo de vida del componente para evitar fugas de memoria.

### Navegación por formularios

Todos los formularios del sistema tienen `tabIndex` ordenado y `autoComplete` definido. La validación se activa en `onBlur` (al salir del campo), no en cada keystroke, para no interrumpir al usuario mientras escribe.

### Componentes con keyboard support nativo

Los componentes de UI (Radix UI base) incluyen keyboard handling completo:
- `Dialog`: Escape cierra el modal, Tab navega entre elementos.
- `DropdownMenu`: Arrow keys navegan entre opciones, Enter selecciona, Escape cierra.
- `Select`: Flecha arriba/abajo navega, Enter confirma.

---

## Sistema de tokens — referencia completa

### Colores

Los tokens de color están en `resources/scss/1-settings/_variables.scss` y se exponen como CSS custom properties para soportar light/dark theme:

```scss
// Superficies
--color-background          // Fondo de la página
--color-surface             // Cards, paneles
--color-surface-elevated    // Modales, dropdowns

// Texto
--color-text-primary        // Texto principal
--color-text-secondary      // Texto secundario/muted
--color-text-inverted       // Texto sobre fondos de marca

// Marca
--color-brand               // Acción primaria
--color-brand-hover         // Estado hover de marca
--color-brand-muted         // Variante suave de marca

// Estados
--color-danger              // Error, destructivo
--color-danger-muted        // Fondo suave de error
--color-success             // Confirmación
--color-warning             // Alerta

// Bordes
--color-border              // Borde estándar
--color-border-strong       // Borde con más contraste

// Overlay
--color-overlay             // Fondo de modal (rgba)
```

### Espaciado

```scss
// Escala de espaciado en rem (1rem = 16px base)
$space-1:  0.25rem   //  4px
$space-2:  0.5rem    //  8px
$space-3:  0.75rem   // 12px
$space-4:  1rem      // 16px
$space-5:  1.25rem   // 20px
$space-6:  1.5rem    // 24px
$space-8:  2rem      // 32px
$space-10: 2.5rem    // 40px
$space-12: 3rem      // 48px
```

### Radios

```scss
$radius-sm:   0.25rem   //  4px — inputs pequeños
$radius-md:   0.5rem    //  8px — cards, botones
$radius-lg:   1rem      // 16px — modales, panels grandes
$radius-full: 9999px    // Píldoras, badges, avatares
```

### Tipografía

```scss
$font-sans:    'Space Grotesk', 'Instrument Sans', system-ui
$font-mono:    'JetBrains Mono', monospace
$font-display: 'Playfair Display', Georgia, serif

// Tamaños (con clamp() para responsive)
$text-xs:   clamp(0.7rem,  1.5vw, 0.75rem)
$text-sm:   clamp(0.8rem,  1.8vw, 0.875rem)
$text-base: clamp(0.9rem,  2vw,   1rem)
$text-lg:   clamp(1rem,    2.2vw, 1.125rem)
$text-xl:   clamp(1.1rem,  2.5vw, 1.25rem)
$text-2xl:  clamp(1.3rem,  3vw,   1.5rem)
$text-4xl:  clamp(1.8rem,  5vw,   2.25rem)
```

### Sombras

```scss
$shadow-sm: 0 1px 3px 0 rgba(0,0,0,.08), 0 1px 2px -1px rgba(0,0,0,.06)
$shadow-md: 0 4px 6px -1px rgba(0,0,0,.08), 0 2px 4px -2px rgba(0,0,0,.05)
```

---

## Breakpoints y responsive

```scss
// resources/scss/1-settings/_breakpoints.scss
$bp-sm:  640px    // Móvil grande
$bp-md:  768px    // Tablet
$bp-lg:  1024px   // Desktop pequeño
$bp-xl:  1280px   // Desktop estándar

// Uso con el mixin up():
@include bp.up(md) {
  // Se aplica desde 768px hacia arriba
}
```

El diseño es **mobile-first**: los estilos base son para pantallas pequeñas y se amplían con `up()`. Nunca se usa `max-width` salvo en casos muy específicos de overflow.

---

## Organización de archivos SCSS

```
resources/scss/
├── 1-settings/
│   ├── _variables.scss    ← tokens de color (CSS custom props light/dark)
│   ├── _tokens.scss       ← tipografías, espaciados, radios, sombras
│   ├── _breakpoints.scss  ← puntos de ruptura
│   └── _theme.scss        ← asignación de variables por tema
├── 2-tools/
│   └── _mixins.scss       ← up(), focus-ring()
├── 3-generic/
│   └── _reset.scss        ← normalize + box-sizing
├── 4-elements/
│   ├── _typography.scss   ← h1–h6, p, a, strong, code
│   └── _forms.scss        ← input, select, textarea base
├── 5-objects/
│   ├── _container.scss    ← max-width responsive
│   └── _layout.scss       ← grid, flex utilities estructurales
├── 6-components/
│   ├── atoms/             ← _button.scss, _badge.scss, _spinner.scss
│   ├── molecules/         ← _card.scss, _form-group.scss, _alert.scss
│   ├── organisms/         ← _academia-header.scss, _sidebar.scss
│   └── pages/             ← _dashboard.scss, _tareas.scss, _asignaturas.scss...
└── 7-utilities/
    └── _helpers.scss      ← .u-sr-only, .u-loading-spinner, clases de estado
```

Cada capa importa con `@use` (nunca `@import`), lo que garantiza que no haya colisiones de namespace ni carga redundante de dependencias.


