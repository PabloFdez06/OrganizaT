# 4. Guia de estilos y prototipado

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

Esto me permite mantener jerarquia visual distinta entre texto operativo, tecnico y decorativo.

## Color y tema
La paleta esta centralizada en _variables.scss con soporte claro/oscuro y tokens compartidos para paginas academicas.

Ejemplos reales:

1. Variables de superficie y texto para light/dark.
2. Tokens de marca y estados (brand, danger, muted, ring).
3. Tokens rgba para overlays y gradientes.

Ademas, en componentes uso var(--color-*) para conservar coherencia con el tema activo.

## Espaciado y radios
He normalizado espaciado con escala en rem:

1. space-1 a space-12.
2. radios sm/md/lg.
3. sombras sm/md reutilizables.

## Metodologia de clases y estructura
Sigo convencion BEM en componentes y paginas. Ejemplos reales del header academico:

1. c-academia-header.
2. c-academia-header__nav-link.
3. c-academia-header__notification--critical.

Y en paginas:

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
4. Header academico comun en todas las secciones principales.

## Wireframes y correspondencia con interfaz final
La implementacion final conserva la estructura de alto nivel del prototipo:

1. Panel principal con hero + bloques de decision.
2. Vistas por modulo (asignaturas, tareas, calificaciones, recursos).
3. Zona de configuracion y seguridad separada.

## Accesibilidad aplicada
He aplicado medidas concretas en codigo de interfaz:

1. aria-label en botones, navegacion y listados de notificaciones.
2. Estados aria-expanded y aria-controls en menu movil.
3. role=alert y aria-live en avisos criticos (sesion Moodle no activa).
4. focus-ring reutilizable en elementos interactivos con teclado.


