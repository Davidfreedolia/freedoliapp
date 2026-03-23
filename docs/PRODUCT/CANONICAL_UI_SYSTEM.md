# FREEDOLIAPP — Sistema UI canónico (Track B — B2)

**Estado:** fuente de verdad de planificación (documentación).  
**Bloque:** Track B — **B2 — Definición de estilo/sistema UI**.  
**Alcance:** cómo debe **verse y comportarse** la app operativa (shell, patrones, interacción, familias de pantalla). **No** sustituye Track A (Amazon). **No** declara trabajo de idioma (B3/B4), selector, ni implementación del asistente (B5).

**Relación con otros documentos**

- **Tokens de marca (paleta, escala tipográfica base, sombras suaves, iconos línea):** `docs/PRODUCT/VISUAL_IDENTITY_SYSTEM_V1.md`. Este documento **B2** fija el **sistema de producto** (patrones, principios, intención por superficie). Si en el futuro los tokens divergen, se actualiza primero la identidad o un futuro “token file” y luego B6 aplica.
- **Armonización masiva pantalla a pantalla:** **B6** — fuera de alcance de B2.
- **Rol del asistente:** `docs/SYSTEMS/ASSISTANT_LAYER.md`. La **superficie** UX canónica (entrada, panel, estructura interna) está en **`docs/PRODUCT/B5_ASSISTANT_IN_APP_UX_SURFACE.md`**; la **implementación** y armonización visual siguen **B5** + **B6**, alineadas con **este** sistema y ese rol.

---

## 1. Dirección visual (qué sensación debe dar el SaaS)

**Intención:** FREEDOLIAPP debe percibirse como un **SaaS B2B operativo**: claro, moderno, serio y **usable en el día a día**, no como demo llamativa ni como consola administrativa abandonada.

| Eje | Objetivo |
|-----|----------|
| **Claridad** | Prioridad absoluta: títulos, estados y acciones entendibles sin esfuerzo. |
| **Densidad** | **Moderada-alta** donde hay datos operativos (tablas, listas), sin convertirse en muro de texto; **respiración** en cabeceras y bloques de acción. |
| **Modernidad** | Superficies limpias, tipografía sistema, componentes consistentes; **sin** modas visuales agresivas. |
| **Profesionalidad** | Transmite control y fiabilidad; **no** corporativo “muerto” (gris anónimo sin jerarquía), **no** juguete (ilustraciones ridículas, acentos aleatorios). |

**Referencias que encajan (espíritu, no copia):** productos como **Stripe**, **Linear**, **Notion (vista base de datos)**, **Asana (claridad de tareas)** — herramientas donde el usuario **escanea**, **actúa** y **confía** en la UI.

**Referencias que NO encajan:** dashboards “crypto/hype”, admin genérico sin jerarquía, UI maximalista con gradientes y badges decorativos, estética consumer infantil, tablas crudas sin estado ni contexto.

**Regla resumida:** *operational clarity > decorative expressiveness*.

---

## 2. Principios de diseño (obligatorios para futuro trabajo UI)

1. **Jerarquía:** una sola “pregunta principal” por vista o sección (qué estoy mirando / qué debo hacer ahora). Títulos de página y bloques primarios ganan peso; metadatos y secundarios retroceden visualmente.
2. **Claridad:** etiquetas explícitas; estados nombrados; evitar iconos solos para acciones críticas sin texto o tooltip accesible.
3. **Densidad informacional:** en listados operativos, mostrar **columnas que importan**; agrupar lo secundario en detalle o columnas opcionales; no rellenar con ruido.
4. **Escaneabilidad:** alineación consistente, ritmo vertical predecible, uso de **badges/etiquetas solo con significado** (estado, severidad, tipo de entidad).
5. **Prominencia de acciones:** **una** acción primaria por contexto claro; secundarias visibles pero subordinadas; destructivas visibles pero **nunca** competir con primarias por brillo/color.
6. **Consistencia:** mismos patrones para mismo tipo de dato (fechas, importes, estados de pedido, vacíos, errores).
7. **Interfaz calmada / bajo ruido:** fondos neutros, color para **semántica** (estado, CTA, foco), no para decorar.
8. **Seriedad sin rigor mortis:** tono sobrio pero **vivo**: micro-feedback (hover, focus), estados vacíos útiles, mensajes directos — sin ser fríos al punto de parecer abandonados.

---

## 3. Patrones de layout y sistema (app)

### 3.1 App shell

- **Estructura:** navegación persistente (**sidebar**) + **barra superior** con contexto global (workspace, modo demo/live si aplica, alertas, usuario).
- **Área de contenido:** scroll principal en el cuerpo de la página; evitar anidar scrolls competidos salvo paneles explícitos (p. ej. tabla con altura fija en modal).

### 3.2 Sidebar

- Agrupación **por dominio** (operaciones, catálogo, finanzas, ajustes) cuando el mapa lo permita; orden estable.
- Estado activo claro (fondo o borde, **no** solo color de texto suave).
- Icono + etiqueta para ítems principales; colapsar solo si el producto lo exige, manteniendo accesibilidad.

### 3.3 Topbar

- **Contexto global** y **acciones poco frecuentes** o transversales (alertas, preferencias, asistente si el entry point vive ahí).
- No competir con la cabecera de página por el mismo peso visual: topbar más **compacta** y neutra.

### 3.4 Cabeceras de página

- **Título** + **subtítulo opcional** (una línea de contexto).
- Zona derecha: **acciones primarias del módulo** (crear, importar, sincronizar) alineadas; evitar más de **2–3** botones destacados; el resto en menú “Más” o secundario.
- Si hay **filtros globales** de la lista (fecha, proyecto, estado), situarlos **bajo** el título o en barra de herramientas dedicada, no esparcidos.

### 3.5 Tarjetas / paneles

- Uso: **agrupar** información relacionada, métricas resumidas, bloques de formulario.
- Una tarjeta = **un tema**; subtítulos y líneas divisorias solo si mejoran escaneo.
- **No** apilar en una sola tarjeta métricas, tabla larga, formulario y timeline sin jerarquía.

### 3.6 Tablas y listas

- **Tablas:** cabecera fija si la lista es larga; zebra **opcional** y sutil; alineación numérica a la derecha; estados en **badge** o pill con color semántico acotado.
- **Listas:** filas clicables con hover claro; acciones en fila como iconos **con** significado estable o menú contextual.
- **Objetivo:** que no parezca “SQL export en HTML”; siempre **estado**, **contexto** (proyecto, proveedor) y **siguiente acción** cuando aplique.

### 3.7 Vistas de detalle

- **Resumen arriba** (estado, fechas, importes, owner).
- **Cuerpo en pestañas o secciones acordeón** solo si el volumen lo exige; preferir **secciones con anclas** o tabs **con nombres sustantivos** (no “Más 1 / Más 2”).
- Acciones destructivas al final del flujo visual o en zona de “Zona peligro”, no junto al guardar principal.

### 3.8 Formularios

- Etiquetas visibles; errores **junto al campo** + resumen si hay muchos fallos.
- Agrupación por bloques lógicos; botones de envío alineados al patrón de lectura (normalmente inferior derecha en LTR).

### 3.9 Pestañas y secciones

- Tabs para **mutua exclusión** de contenido grande; no usar tabs para 2 líneas de texto.
- Secciones con **título de sección** consistente (misma tipografía/padding que el resto del sistema).

### 3.10 Estados: vacío / carga / error / éxito / aviso

| Estado | Comportamiento |
|--------|----------------|
| **Vacío** | Ilustración mínima o icono + **mensaje útil** + **CTA primaria** (crear, conectar, ir a X). Sin vacíos genéricos “No hay datos”. |
| **Carga** | Skeleton o spinner **acotado al bloque** que carga; evitar pantalla blanca completa salvo primera carga crítica. |
| **Error** | Mensaje claro, **acción** (reintentar, volver, contacto); código técnico relegado a “detalles” o diagnóstico. |
| **Éxito** | Toast o banner **breve**; no bloquear el flujo salvo confirmación necesaria. |
| **Aviso** | Distinguir **warning** (riesgo / atención) de **info**; no usar amarillo/rojo para decoración. |

---

## 4. Estilo de interacción

- **Priorización:** primero **tareas operativas recurrentes** (abrir pedido, resolver alerta, completar paso); segundo configuración; tercero exploración.
- **Acciones destructivas:** confirmación explícita en modal o patrón “escribir para confirmar” solo para casos graves; botón rojo/texto destructivo **consistente** en todo el producto.
- **Estado operativo:** badges de estado de negocio (envío, stock, facturación) **visibles en listas y cabeceras de detalle**; no esconder el estado crítico tras clicks.
- **Progreso / timeline:** línea de tiempo horizontal o vertical **legible**; pasos completados vs pendientes con contraste claro; evitar timelines puramente decorativos.
- **Información escaneable:** números importantes con formato localizado coherente (definición fina en B3/B4); deltas y tendencias con **icono direccional** solo si hay dato real detrás.

---

## 5. Comportamiento de identidad visual (tokens y tono)

*(Valores hex y escala base: `VISUAL_IDENTITY_SYSTEM_V1.md`.)*

| Dimensión | Directriz |
|-----------|-----------|
| **Espaciado** | Escala 4/8/16/24/32…; **más aire** en cabeceras y entre bloques; **más compacto** dentro de celdas de tabla y filas densas. |
| **Radio de bordes** | Coherente en toda la app (p. ej. 8px estándar, 12px hero/tarjetas destacadas); no mezclar esquinas muy distintas en la misma vista. |
| **Elevación / sombra** | **Filosofía:** sombra suave para **separar** tarjeta de fondo o dropdown; **no** sombras dramáticas por capa. Modales y drawers claramente por encima. |
| **Color** | Neutro domina; **teal/marca** para primarios y foco; **semántica fija** para success/warning/error; **no** nuevos acentos “por gustos” en cada pantalla. |
| **Iconos** | Línea, trazo consistente; tamaños discretos (16/20/24); **funcionales**, no mascotas en vistas operativas. |
| **Tipografía** | Escala legible; **semibold** para títulos y énfasis puntual; evitar demasiados tamaños en una misma pantalla. |
| **Énfasis** | Resaltar **solo** lo que cambia el comportamiento o la decisión (CTA, error, estado bloqueante); el resto en peso regular/secondary. |

---

## 6. Guía por familia de pantallas (intención UI)

| Familia | Intención |
|---------|-----------|
| **Dashboard / resumen** | “¿Qué requiere atención?” — KPIs y listas cortas; enlaces a profundidad; **sin** competir con 10 gráficos iguales. |
| **Proyectos / tarjetas de proyecto** | Tarjeta con **nombre, estado, señales operativas** (alertas, gates); CTA claro “abrir”; grid homogéneo. |
| **Detalle de proyecto** | Hub del proyecto: resumen + **navegación** a pedidos, inventario, tareas; evitar muro de widgets sin orden. |
| **Inventario / proveedores / pedidos** | **Tablas y filtros** fuertes; estados de negocio visibles; detalle en panel lateral o página dedicada con mismos patrones de cabecera. |
| **Facturación / ajustes** | Tono **formal y claro**; jerarquía de planes, límites y acciones de pago; menos “marketing”, más **confianza y precisión**. |
| **Superficie del asistente** | Panel **calmado**, conversación legible, diferenciación clara mensaje usuario vs sistema; alineado con `ASSISTANT_LAYER.md`; **no** parecer chat consumer gamificado. |
| **Restos de activación / onboarding** | Pasos **lineales claros**, progreso visible, **una** CTA principal por paso; coherente con el shell autenticado cuando aplique. |

---

## 7. Reglas explícitas: hacer / no hacer

**Hacer**

- Hacer **visible de un vistazo** el estado operativo crítico (bloqueos, retrasos, acciones pendientes).
- Mantener **una jerarquía de acción** clara por vista.
- Reutilizar **los mismos componentes conceptuales** (card, table row, empty state, page header) en todos los módulos.
- Tratar **tablas como producto**: filtros, vacíos útiles, loading por bloque.
- Usar **color con significado** (marca + semántica), no por moda.

**No hacer**

- **No** sobrecargar tarjetas con 15 campos y 6 botones.
- **No** usar colores de acento aleatorios sin significado compartido en el equipo.
- **No** añadir ruido decorativo (bordes, badges, gradientes) sin función.
- **No** dejar tablas como “restos de admin CRUD” sin estado ni contexto.
- **No** mezclar en una misma vista tres estilos de botón primario.
- **No** ocultar errores de negocio en toasts que desaparecen sin dejar rastro en pantalla cuando el fallo persiste.
- **No** usar animaciones llamativas que distraen de datos y acciones.

---

## 8. Preparación para wireframes en Pencil (B2 → diseño)

**Qué conviene wireframar después (referencias de pantalla)**

- **Shell completo:** sidebar + topbar + una página de lista + una de detalle.
- **Cabecera de página + barra de filtros + tabla** (pedidos o inventario como referencia).
- **Dashboard** con un bloque “requiere atención” + métricas compactas.
- **Formulario de ajustes / facturación** (bloques, validación, zona peligro).
- **Panel del asistente** (thread, input, ancho, relación con el resto del layout) — **alto nivel**, sin copy final ni i18n (eso es B3+).

**Qué debe convertirse en “pantallas de referencia” para el equipo**

- 1 lista densa operativa, 1 detalle complejo, 1 dashboard, 1 settings/billing, 1 estado vacío y 1 error — **mismos patrones** aplicados.

**Qué debe esperar a B6 (no detallar prematuramente en Pencil en bloque B2)**

- **Pixel-perfect** en todas las pantallas existentes.
- Rediseño exhaustivo de cada módulo (Orders, Suppliers, etc.) — en B6 se **aplica** el sistema aquí definido con priorización por valor.
- Contenido de copy final multilingüe y comportamiento del selector de idioma (B3/B4).

---

## 9. Cierre de alcance B2

Este documento **cierra la definición canónica** de estilo/sistema UI a nivel **repo/documentación** para Track B B2. La **implementación visual** en código y la **harmonización masiva** son **B6** (y slices puntuales donde el producto decida), sin reabrir la definición salvo decisión explícita de producto.
