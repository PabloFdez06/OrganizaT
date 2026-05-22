import { Head } from '@inertiajs/react';

export default function StyleGuide() {
    return (
        <>
            <Head title="Style Guide" />
            <div className="p-style-guide">
                {/* 00 — Portada */}
                <section className="p-style-guide__hero">
                    <div className="p-style-guide__hero-content">
                        <h1 className="p-style-guide__hero-title">ORGANIZAT</h1>
                        <p className="p-style-guide__hero-subtitle">Guía de Estilos &amp; Design System</p>
                        <div className="p-style-guide__hero-brand-line" />
                        <p className="p-style-guide__hero-version">v1.0 · TFG DAW 2025–2026</p>
                        <nav className="p-style-guide__hero-nav">
                            <a href="#colores">01 Colores</a>
                            <span>·</span>
                            <a href="#tipografia">02 Tipografía</a>
                            <span>·</span>
                            <a href="#espaciado">03 Espaciado</a>
                            <span>·</span>
                            <a href="#border-radius">04 Border Radius</a>
                            <span>·</span>
                            <a href="#sombras">05 Sombras</a>
                            <span>·</span>
                            <a href="#componentes">06 Componentes</a>
                            <span>·</span>
                            <a href="#breakpoints">07 Breakpoints</a>
                            <span>·</span>
                            <a href="#motion">08 Motion</a>
                            <span>·</span>
                            <a href="#accesibilidad">09 Accesibilidad</a>
                        </nav>
                    </div>
                    <div className="p-style-guide__hero-circle" />
                </section>

                {/* 01 — Colores */}
                <section id="colores" className="p-style-guide__section">
                    <h2 className="p-style-guide__section-title">01 — Colores</h2>
                    <p className="p-style-guide__section-desc">El sistema de color usa CSS custom properties con soporte Light/Dark mode. La brand color (#6A1CF6) define la identidad visual del producto.</p>

                    <h3 className="p-style-guide__label">LIGHT MODE</h3>
                    <div className="p-style-guide__color-grid">
                        <ColorSwatch color="#fbfcff" name="--color-bg" />
                        <ColorSwatch color="#ffffff" name="--color-surface" />
                        <ColorSwatch color="#f2f4fb" name="--color-surface-muted" />
                        <ColorSwatch color="#12161f" name="--color-text" />
                        <ColorSwatch color="#5a6475" name="--color-text-muted" />
                        <ColorSwatch color="#d7deea" name="--color-border" />
                        <ColorSwatch color="#6a1cf6" name="--color-brand" />
                        <ColorSwatch color="#ffffff" name="--color-brand-contrast" />
                        <ColorSwatch color="#b42318" name="--color-danger" />
                        <ColorSwatch color="#fee4e2" name="--color-danger-soft" />
                        <ColorSwatch color="#8ab6ff" name="--color-ring" />
                    </div>

                    <div className="p-style-guide__dark-panel">
                        <h3 className="p-style-guide__label">DARK MODE</h3>
                        <div className="p-style-guide__color-grid">
                            <ColorSwatch color="#121212" name="--color-bg" />
                            <ColorSwatch color="#1a1c1e" name="--color-surface" />
                            <ColorSwatch color="#212121" name="--color-surface-muted" />
                            <ColorSwatch color="#f8f9fc" name="--color-text" />
                            <ColorSwatch color="#c1c4cb" name="--color-text-muted" />
                            <ColorSwatch color="#6a1cf6" name="--color-brand" />
                            <ColorSwatch color="#ac8eff" name="--color-ring" />
                            <ColorSwatch color="#f74b6d" name="--color-danger" />
                            <ColorSwatch color="#3b1f2a" name="--color-danger-soft" />
                        </div>
                    </div>

                    <h3 className="p-style-guide__label">COLORES SEMÁNTICOS &amp; ACADÉMICOS</h3>
                    <div className="p-style-guide__color-grid">
                        <ColorSwatch color="#16a34a" name="success" />
                        <ColorSwatch color="#f59e0b" name="warning" />
                        <ColorSwatch color="#ea580c" name="error" />
                        <ColorSwatch color="#6a1cf6" name="brand" />
                        <ColorSwatch color="#6526ff" name="brand-alt" />
                        <ColorSwatch color="#3600c9" name="brand-deep" />
                        <ColorSwatch color="#1a0c5c" name="brand-darkest" />
                        <ColorSwatch color="#8b5cf6" name="accent-violet" />
                        <ColorSwatch color="#4106f9" name="text-link" />
                    </div>

                    <p className="p-style-guide__gradient-label">Gradiente Hero (Auth): #6a1cf6 → #1a0c5c → #061739</p>
                    <div className="p-style-guide__gradient-bar" />
                </section>

                {/* 02 — Tipografía */}
                <section id="tipografia" className="p-style-guide__section">
                    <h2 className="p-style-guide__section-title">02 — Tipografía</h2>

                    <h3 className="p-style-guide__label">FAMILIAS TIPOGRÁFICAS</h3>
                    <div className="p-style-guide__font-card">
                        <span className="p-style-guide__font-card-name" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Space Grotesk</span>
                        <span className="p-style-guide__font-card-meta">Sans-serif principal · --font-sans</span>
                        <span className="p-style-guide__font-card-meta">Pesos: Regular, Medium, Bold</span>
                    </div>
                    <div className="p-style-guide__font-card">
                        <span className="p-style-guide__font-card-name" style={{ fontFamily: "'JetBrains Mono', monospace" }}>JetBrains Mono</span>
                        <span className="p-style-guide__font-card-meta">Monospace (código) · --font-mono</span>
                        <span className="p-style-guide__font-card-meta">Pesos: Regular</span>
                    </div>

                    <h3 className="p-style-guide__label">ESCALA TIPOGRÁFICA</h3>
                    <div className="p-style-guide__type-scale">
                        <TypeRow label="Display / H1" size="48px / 3rem" weight="Bold" sample="Gestión académica inteligente" tag="h1" />
                        <TypeRow label="H2" size="36px / 2.25rem" weight="Bold" sample="Dashboard principal" tag="h2" />
                        <TypeRow label="H3" size="28px / 1.75rem" weight="Bold" sample="Asignaturas del curso" tag="h3" />
                        <TypeRow label="H4" size="22px / 1.38rem" weight="Semi Bold" sample="" tag="h4" />
                        <TypeRow label="Body L" size="16px / 1rem" weight="Regular" sample="El texto de cuerpo debe ser legible y cómodo para lectura prolongada." tag="p" />
                        <TypeRow label="Body M" size="14px / 0.88rem" weight="Regular" sample="Descripción de tareas y recursos académicos de la plataforma." tag="p" />
                        <TypeRow label="Body S / Caption" size="12px / 0.75rem" weight="Regular" sample="Metadatos, etiquetas y textos secundarios" tag="p" />
                        <TypeRow label="Label / Badge" size="11px / 0.69rem" weight="Bold" sample="ACTIVO · PENDIENTE · ERROR" tag="p" />
                    </div>
                </section>

                {/* 03 — Espaciado */}
                <section id="espaciado" className="p-style-guide__section">
                    <h2 className="p-style-guide__section-title">03 — Espaciado</h2>
                    <p className="p-style-guide__section-desc">Sistema de espaciado basado en múltiplos de 4px (base unit: 0.25rem). Usar tokens $space-N en SCSS.</p>
                    <div className="p-style-guide__spacing-grid">
                        <SpaceBlock token="$space-1" rem="0.25rem" px="4px" />
                        <SpaceBlock token="$space-2" rem="0.5rem" px="8px" />
                        <SpaceBlock token="$space-3" rem="0.75rem" px="12px" />
                        <SpaceBlock token="$space-4" rem="1rem" px="16px" />
                        <SpaceBlock token="$space-5" rem="1.25rem" px="20px" />
                        <SpaceBlock token="$space-6" rem="1.5rem" px="24px" />
                        <SpaceBlock token="$space-8" rem="2rem" px="32px" />
                        <SpaceBlock token="$space-10" rem="2.5rem" px="40px" />
                        <SpaceBlock token="$space-12" rem="3rem" px="48px" />
                    </div>
                </section>

                {/* 04 — Border Radius */}
                <section id="border-radius" className="p-style-guide__section">
                    <h2 className="p-style-guide__section-title">04 — Border Radius</h2>
                    <div className="p-style-guide__radius-grid">
                        <RadiusCard token="$radius-sm" value="0.35rem / 5.6px" desc="Elementos pequeños (badges, tooltips)" radius="5.6px" />
                        <RadiusCard token="$radius-md" value="0.55rem / 8.8px" desc="Botones, inputs, chips" radius="8.8px" />
                        <RadiusCard token="$radius-lg" value="0.8rem / 12.8px" desc="Cards, modales, dropdowns, overlays" radius="12.8px" />
                        <RadiusCard token="circular" value="50% / —" desc="Avatares, iconos circulares" radius="50%" />
                    </div>
                </section>

                {/* 05 — Sombras */}
                <section id="sombras" className="p-style-guide__section">
                    <h2 className="p-style-guide__section-title">05 — Sombras y Elevación</h2>
                    <div className="p-style-guide__shadow-grid">
                        <ShadowCard token="$shadow-sm" desc="Elevación baja — tooltips, chips" value="0 1px 2px rgba(0,0,0,0.08)" shadow="0 1px 2px rgba(0,0,0,0.08)" />
                        <ShadowCard token="$shadow-md" desc="Elevación media — cards, dropdowns" value="0 6px 20px rgba(0,0,0,0.12)" shadow="0 6px 20px rgba(0,0,0,0.12)" />
                        <ShadowCard token="dropdown" desc="Elevación alta — modales, overlays" value="0 12px 28px rgba(0,0,0,0.16)" shadow="0 12px 28px rgba(0,0,0,0.16)" />
                        <div className="p-style-guide__shadow-card p-style-guide__shadow-card--focus">
                            <span className="p-style-guide__shadow-card-token">focus ring</span>
                            <span className="p-style-guide__shadow-card-desc">Focus ring accesibilidad — #8AB6FF</span>
                            <span className="p-style-guide__shadow-card-value">outline 2px solid var(--color-ring), offset 2px</span>
                        </div>
                    </div>
                </section>

                {/* 06 — Componentes */}
                <section id="componentes" className="p-style-guide__section">
                    <h2 className="p-style-guide__section-title">06 — Componentes</h2>
                    <ComponentsSection />
                </section>

                {/* 07 — Breakpoints */}
                <section id="breakpoints" className="p-style-guide__section">
                    <h2 className="p-style-guide__section-title">07 — Breakpoints &amp; Grid</h2>
                    <div className="p-style-guide__bp-grid">
                        <BpCard label="XS" token="(base)" value="< 640px" desc="Mobile portrait" screenWidth="29%" />
                        <BpCard label="SM" token="$bp-sm" value="≥ 640px" desc="Mobile landscape" screenWidth="45%" />
                        <BpCard label="MD" token="$bp-md" value="≥ 768px" desc="Tablet portrait" screenWidth="59%" />
                        <BpCard label="LG" token="$bp-lg" value="≥ 1024px" desc="Tablet landscape / small laptop" screenWidth="82%" />
                        <BpCard label="XL" token="$bp-xl" value="≥ 1280px" desc="Desktop (diseño principal)" screenWidth="100%" />
                    </div>
                </section>

                {/* 08 — Motion */}
                <section id="motion" className="p-style-guide__section">
                    <h2 className="p-style-guide__section-title">08 — Motion &amp; Transiciones</h2>
                    <div className="p-style-guide__motion-grid">
                        <MotionCard title="UI micro" duration="180ms" easing="ease" desc="Buttons, inputs, hover states" code="transition: 180ms ease" />
                        <MotionCard title="Prototype navigate" duration="350ms" easing="EASE_IN_AND_OUT" desc="Navegación entre pantallas en Figma" code="DISSOLVE · 0.35s" />
                        <MotionCard title="Prototype overlay" duration="250ms" easing="EASE_IN_AND_OUT" desc="Aparición de overlays (notificaciones)" code="DISSOLVE · 0.25s" />
                        <MotionCard title="Focus ring" duration="—" easing="—" desc="Inmediato — no animar foco por a11y" code="outline-offset: 2px" />
                    </div>
                </section>

                {/* 09 — Accesibilidad */}
                <section id="accesibilidad" className="p-style-guide__section">
                    <h2 className="p-style-guide__section-title">09 — Accesibilidad (WCAG 2.1)</h2>
                    <div className="p-style-guide__a11y-grid">
                        <A11yCard title="Focus ring visible" desc="outline: 2px solid var(--color-ring), offset: 2px — Mixin @include focus-ring" wcag="WCAG 2.4.7 AA" />
                        <A11yCard title="Jerarquía de encabezados" desc="H1 → H2 → H3 estrictamente. No saltar niveles. Un H1 por página." wcag="WCAG 1.3.1 A" />
                        <A11yCard title="Contraste de texto" desc="Color text #12161f / bg #fbfcff: ratio ~17:1 (AAA). Brand #6a1cf6 sobre blanco: ratio ~4.8:1 (AA)" wcag="WCAG 1.4.3 AA" />
                        <A11yCard title="Labels en formularios" desc='Siempre <label for> asociado o aria-label. Nunca placeholder como único label.' wcag="WCAG 1.3.1 A" />
                        <A11yCard title="Semántica HTML estricta" desc="Metodología BEM. Tags semánticos: <nav>, <main>, <header>, <section>, <article>. Evitar <div> innecesario." wcag="WCAG 4.1.2 A" />
                        <A11yCard title="Navegación por teclado" desc="Tab order lógico. Botones y links accesibles con Enter/Space. No keyboard traps." wcag="WCAG 2.1.1 A" />
                        <A11yCard title="Color como único diferenciador" desc="EVITAR usar solo color para transmitir información. Usar también iconos, texto, o patrones." wcag="WCAG 1.4.1 A" variant="red" />
                        <A11yCard title="Texto alt en imágenes" desc='Todas las imágenes informativas con alt descriptivo. Decorativas con alt="".' wcag="WCAG 1.1.1 A" />
                    </div>
                </section>

                {/* 10 — Dos & Don'ts */}
                <section className="p-style-guide__section">
                    <h2 className="p-style-guide__section-title">10 — Dos &amp; Don'ts</h2>
                    <DosAndDonts />
                </section>

                {/* Footer */}
                <footer className="p-style-guide__footer">
                    <p className="p-style-guide__footer-title">ORGANIZAT Design System · Guía de Estilos v1.0 · TFG DAW 2025–2026</p>
                    <p className="p-style-guide__footer-meta">Tokens extraídos de resources/scss/1-settings/ · Color system: Light/Dark mode · Font: Space Grotesk · Base unit: 4px (0.25rem)</p>
                </footer>
            </div>
        </>
    );
}


function ColorSwatch({ color, name }: { color: string; name: string }) {
    return (
        <div className="p-style-guide__swatch">
            <div className="p-style-guide__swatch-box" style={{ backgroundColor: color }} />
            <span className="p-style-guide__swatch-name">{name}</span>
            <span className="p-style-guide__swatch-hex">{color}</span>
        </div>
    );
}

function TypeRow({ label, size, weight, sample, tag }: { label: string; size: string; weight: string; sample: string; tag: string }) {
    const fontSize = size.split(' / ')[0];
    const fw = weight === 'Bold' ? 700 : weight === 'Semi Bold' ? 600 : 400;
    return (
        <div className="p-style-guide__type-row">
            <div className="p-style-guide__type-row-meta">
                <span className="p-style-guide__type-row-label">{label}</span>
                <span className="p-style-guide__type-row-size">{size}</span>
                <span className="p-style-guide__type-row-weight">{weight}</span>
            </div>
            <div className="p-style-guide__type-row-sample" style={{ fontSize, fontWeight: fw }}>
                {sample}
            </div>
        </div>
    );
}

function SpaceBlock({ token, rem, px }: { token: string; rem: string; px: string }) {
    return (
        <div className="p-style-guide__space-item">
            <div className="p-style-guide__space-block" style={{ width: rem, height: rem }} />
            <span className="p-style-guide__space-token">{token}</span>
            <span className="p-style-guide__space-value">{rem}</span>
            <span className="p-style-guide__space-px">{px}</span>
        </div>
    );
}

function RadiusCard({ token, value, desc, radius }: { token: string; value: string; desc: string; radius: string }) {
    return (
        <div className="p-style-guide__radius-card">
            <div className="p-style-guide__radius-card-box" style={{ borderRadius: radius }} />
            <span className="p-style-guide__radius-card-token">{token}</span>
            <span className="p-style-guide__radius-card-value">{value}</span>
            <span className="p-style-guide__radius-card-desc">{desc}</span>
        </div>
    );
}

function ShadowCard({ token, desc, value, shadow }: { token: string; desc: string; value: string; shadow: string }) {
    return (
        <div className="p-style-guide__shadow-card" style={{ boxShadow: shadow }}>
            <span className="p-style-guide__shadow-card-token">{token}</span>
            <span className="p-style-guide__shadow-card-desc">{desc}</span>
            <span className="p-style-guide__shadow-card-value">{value}</span>
        </div>
    );
}

function BpCard({ label, token, value, desc, screenWidth }: { label: string; token: string; value: string; desc: string; screenWidth: string }) {
    return (
        <div className="p-style-guide__bp-card">
            <div className="p-style-guide__bp-card-box" style={{ width: screenWidth }} />
            <span className="p-style-guide__bp-card-label">{label}</span>
            <span className="p-style-guide__bp-card-token">{token}</span>
            <span className="p-style-guide__bp-card-value">{value}</span>
            <span className="p-style-guide__bp-card-desc">{desc}</span>
        </div>
    );
}

function MotionCard({ title, duration, easing, desc, code }: { title: string; duration: string; easing: string; desc: string; code: string }) {
    return (
        <div className="p-style-guide__motion-card">
            <strong className="p-style-guide__motion-card-title">{title}</strong>
            <span className="p-style-guide__motion-card-duration">Duración: {duration}</span>
            <span className="p-style-guide__motion-card-easing">Easing: {easing}</span>
            <span className="p-style-guide__motion-card-desc">{desc}</span>
            <code className="p-style-guide__motion-card-code">{code}</code>
        </div>
    );
}

function A11yCard({ title, desc, wcag, variant }: { title: string; desc: string; wcag: string; variant?: 'red' }) {
    return (
        <div className={`p-style-guide__a11y-card${variant === 'red' ? ' p-style-guide__a11y-card--danger' : ''}`}>
            <strong className="p-style-guide__a11y-card-title">● {title}</strong>
            <span className="p-style-guide__a11y-card-desc">{desc}</span>
            <span className="p-style-guide__a11y-card-wcag">{wcag}</span>
        </div>
    );
}


function ComponentsSection() {
    return (
        <>
            <h3 className="p-style-guide__label">BOTONES</h3>
            <div className="p-style-guide__btn-row">
                <div className="p-style-guide__btn-demo">
                    <button className="p-style-guide__btn p-style-guide__btn--primary">Primary</button>
                    <span className="p-style-guide__btn-meta">.c-button--primary<br/>sm (32px)<br/>md (37.6px)<br/>lg (43px)<br/>icon (37.6x37.6)</span>
                </div>
                <div className="p-style-guide__btn-demo">
                    <button className="p-style-guide__btn p-style-guide__btn--secondary">Secondary</button>
                    <span className="p-style-guide__btn-meta">.c-button--secondary<br/>sm (32px)<br/>md (37.6px)<br/>lg (43px)<br/>icon (37.6x37.6)</span>
                </div>
                <div className="p-style-guide__btn-demo">
                    <button className="p-style-guide__btn p-style-guide__btn--outline">Outline</button>
                    <span className="p-style-guide__btn-meta">.c-button--outline<br/>sm (32px)<br/>md (37.6px)<br/>lg (43px)<br/>icon (37.6x37.6)</span>
                </div>
                <div className="p-style-guide__btn-demo">
                    <button className="p-style-guide__btn p-style-guide__btn--danger">Danger</button>
                    <span className="p-style-guide__btn-meta">.c-button--danger<br/>sm (32px)<br/>md (37.6px)<br/>lg (43px)<br/>icon (37.6x37.6)</span>
                </div>
                <div className="p-style-guide__btn-demo">
                    <button className="p-style-guide__btn p-style-guide__btn--ghost">Ghost</button>
                    <span className="p-style-guide__btn-meta">.c-button--ghost<br/>sm (32px)<br/>md (37.6px)<br/>lg (43px)<br/>icon (37.6x37.6)</span>
                </div>
                <div className="p-style-guide__btn-demo">
                    <button className="p-style-guide__btn p-style-guide__btn--link">Link</button>
                    <span className="p-style-guide__btn-meta">.c-button--link<br/>sm (32px)<br/>md (37.6px)<br/>lg (43px)<br/>icon (37.6x37.6)</span>
                </div>
                <div className="p-style-guide__btn-demo">
                    <button className="p-style-guide__btn p-style-guide__btn--disabled" disabled>Disabled</button>
                    <span className="p-style-guide__btn-meta">opacity:0.6<br/>sm (32px)<br/>md (37.6px)<br/>lg (43px)<br/>icon (37.6x37.6)</span>
                </div>
            </div>

            <h3 className="p-style-guide__label">INPUTS / FORMULARIOS</h3>
            <div className="p-style-guide__input-row">
                <div className="p-style-guide__input-demo">
                    <input className="p-style-guide__input" placeholder="Ejemplo de texto..." readOnly />
                    <span>Default — Estado normal</span>
                </div>
                <div className="p-style-guide__input-demo">
                    <input className="p-style-guide__input p-style-guide__input--focused" placeholder="Ejemplo de texto..." readOnly />
                    <span>Focused — Con focus ring</span>
                </div>
                <div className="p-style-guide__input-demo">
                    <input className="p-style-guide__input p-style-guide__input--error" placeholder="Ejemplo de texto..." readOnly />
                    <span>Error — Validación fallida</span>
                </div>
                <div className="p-style-guide__input-demo">
                    <input className="p-style-guide__input" placeholder="Ejemplo de texto..." disabled />
                    <span>Disabled — Deshabilitado</span>
                </div>
                <div className="p-style-guide__input-demo">
                    <input className="p-style-guide__input p-style-guide__input--dark" placeholder="Ejemplo de texto..." readOnly />
                    <span>Dark mode — Dark panel input</span>
                </div>
            </div>

            <h3 className="p-style-guide__label">CARDS</h3>
            <div className="p-style-guide__cards-row">
                <div className="p-style-guide__card-demo">
                    <strong>Título de la Card</strong>
                    <p>border-radius: $radius-lg (0.8rem)<br/>border: 1px solid var(--color-border)<br/>padding: $space-4 $space-5 (1rem 1.2rem)</p>
                </div>
                <div className="p-style-guide__card-demo p-style-guide__card-demo--alert">
                    <strong>Alert — .c-alert--danger</strong>
                    <p>Fondo: var(--color-danger-soft)<br/>Borde: var(--color-danger)</p>
                </div>
                <div className="p-style-guide__card-demo p-style-guide__card-demo--dropdown">
                    <strong>.c-dropdown</strong>
                    <ul>
                        <li>Opción del menú 1</li>
                        <li>Opción del menú 2</li>
                        <li>Opción del menú 3</li>
                    </ul>
                </div>
            </div>

            <h3 className="p-style-guide__label">BADGES / ESTADO</h3>
            <div className="p-style-guide__badge-row">
                <span className="p-style-guide__badge p-style-guide__badge--success">Activo</span>
                <span className="p-style-guide__badge p-style-guide__badge--warning">Pendiente</span>
                <span className="p-style-guide__badge p-style-guide__badge--error">Error</span>
                <span className="p-style-guide__badge p-style-guide__badge--info">Info</span>
                <span className="p-style-guide__badge p-style-guide__badge--warn-alt">Advertencia</span>
            </div>

            <h3 className="p-style-guide__label">NAVEGACIÓN — .c-academia-header__nav-link</h3>
            <div className="p-style-guide__nav-demo">
                <span className="p-style-guide__nav-link p-style-guide__nav-link--active">DASHBOARD</span>
                <span className="p-style-guide__nav-link">ASIGNATURAS</span>
                <span className="p-style-guide__nav-link">CALIFICACIONES</span>
                <span className="p-style-guide__nav-link">TAREAS</span>
            </div>
            <p className="p-style-guide__nav-meta">letter-spacing: 1.2px · text-transform: uppercase · font-size: 13px · font-weight: 600 · border-bottom: 2px solid var(--color-brand) on active</p>
            <p className="p-style-guide__nav-meta">HEADER — backdrop: blur(4px) · background: color-mix(in srgb, surface, transparent 15%) · border-bottom: 1px solid --color-border · height: 72px</p>
        </>
    );
}

function DosAndDonts() {
    const dos = [
        { title: 'Usar tokens CSS', desc: 'Siempre usar var(--color-brand), nunca hardcodear #6a1cf6 directamente en componentes.' },
        { title: 'Escala de espaciado', desc: 'Usar $space-N del sistema. Nunca inventar valores arbitrarios en px.' },
        { title: 'Semántica HTML', desc: 'Elegir siempre el tag correcto: <button> para acciones, <a> para navegación, <nav> para menús.' },
        { title: 'Focus ring', desc: 'Incluir @include focus-ring en todos los elementos interactivos para garantizar accesibilidad por teclado.' },
        { title: 'BEM consistente', desc: 'Bloque__Elemento--Modificador. Mantener nomenclatura clara y jerárquica en todos los componentes SCSS.' },
        { title: 'Tipografía semántica', desc: 'Usar <h1>-<h6> con jerarquía correcta. Solo un H1 por página. Respetar la escala tipográfica.' },
    ];
    const donts = [
        { title: 'NO hardcodear colores', desc: '❌ color: #6a1cf6   ✅ color: var(--color-brand)' },
        { title: 'NO usar px para espaciado', desc: '❌ padding: 16px   ✅ padding: $space-4 (1rem)' },
        { title: 'NO usar div genéricos', desc: '❌ <div class="nav">   ✅ <nav class="c-app-header__nav">' },
        { title: 'NO color como único indicador', desc: 'Siempre acompañar de icono, texto o patrón para estados de error/éxito.' },
        { title: 'NO romper jerarquía tipográfica', desc: '❌ H1 → H3 (saltarse H2)   ✅ H1 → H2 → H3 en orden.' },
        { title: 'NO fetch() en componentes Inertia', desc: 'Usar useForm o router.visit. Nunca fetch/axios para datos del propio backend.' },
    ];
    return (
        <div className="p-style-guide__dos-grid">
            {dos.map((d) => (
                <div key={d.title} className="p-style-guide__do-card">
                    <span className="p-style-guide__do-card-label">✓ HACER</span>
                    <strong>{d.title}</strong>
                    <p>{d.desc}</p>
                </div>
            ))}
            {donts.map((d) => (
                <div key={d.title} className="p-style-guide__dont-card">
                    <span className="p-style-guide__dont-card-label">✗ EVITAR</span>
                    <strong>{d.title}</strong>
                    <p>{d.desc}</p>
                </div>
            ))}
        </div>
    );
}
