# Nexo CRM · Sistema visual

## Dirección y alcance

Segunda pasada visual: espacio de trabajo comercial preciso, compacto y sereno. La decisión principal del resumen es qué relación o seguimiento atender. Se conservan el monograma y el azul Nexo. Attio aporta precisión en tipografía, navegación, controles y separación por espacio; no se trasladan su marca, contenido ni composición de marketing.

Dial: ENERGY 1 / RHYTHM 2 / MOTION 1.

Las cuatro skills antislop se aplican durante planificación, implementación y auditoría. La segunda pasada abarcó shell, sidebar, header, resumen, temas y primitivas compartidas. La fase siguiente del login se define abajo; los módulos comerciales conservan composición y comportamiento.

## Inspección y reutilización

- Next 16.3.6 App Router; guías instaladas consultadas sobre CSS y componentes servidor/cliente.
- Layout protegido y AuthProvider/ClientsProvider existentes; servicios, contratos, permisos, validaciones, rutas y Supabase fuera del alcance de edición.
- Tailwind 4, tokens en globals.css, primitivas Radix/shadcn, iconos Lucide y next-themes ya instalado.
- Resumen consume clientes y tareas reales. Se conservan cálculos, periodos, filtros, orden y límites de listas. No se incorporan ventas de demostración ni actividad ficticia.
- ClientFormDialog para altas y edición; Sheet para navegación móvil; menús Radix para perfil y apariencia; Toaster sincronizado con el tema.
- Playwright usa un servidor local y datos explícitos de prueba; sus capturas no representan clientes de producción.

## Identidad y paleta

| Token | Claro | Oscuro | Razón |
| --- | --- | --- | --- |
| Fondo de trabajo | #ffffff | #191b20 | Plano continuo para datos, sin mosaico de tarjetas. |
| Navegación | #f7f8fa | #14161a | Distingue herramientas de contenido. |
| Superficie secundaria | #f3f4f6 | #23262d | Agrupa seguimiento y controles sin bordes repetidos. |
| Superficie flotante | #ffffff | #23262d | Menús y diálogos legibles. |
| Texto | #20242c | #eceef2 | Lectura prolongada con contraste alto. |
| Texto secundario | #606773 | #a7aebb | Contexto legible a 12–14 px. |
| Azul de acción | #2563eb | #2563eb | Continuidad Nexo con texto blanco contrastado. |
| Azul de enlace | #1d4ed8 | #9bbaff | Acento adaptado a cada tema. |
| Selección | #eaf0fd | #242f47 | Localiza el módulo sin un bloque azul dominante. |
| Separador | #e5e7eb | #343840 | Delimita filas y secciones sin encerrar contenido. |
| Borde de campo | #7b818c | #818897 | Controles reconocibles con contraste no textual 3:1. |

Rojo, ámbar y verde solo para estados reales acompañados de texto. Neutros heredados y colores semánticos se adaptan en oscuro mediante tokens Tailwind, incluidos portales, sin reescribir módulos. El blanco de superficies heredadas se adapta por una utilidad común; el texto blanco de botones permanece blanco.

## Tipografía, espacio, radios y superficies

- Segoe UI y fuentes del sistema: legibilidad en español y familiaridad empresarial, sin descargas nuevas.
- Título 24–28 px; sección 15–16 px; cuerpo/navegación 14 px; contexto 12–13 px. Pesos 400/500/600, tamaños rem para ampliación.
- Total de cartera 44–48 px, métricas subordinadas 28–32 px, números tabulares: jerarquía sin iconos decorativos.
- Escala 4/8/12/16/24/32 px. Margen móvil 16 px, tablet 24 px, desktop 36 px; anchura máxima 1480 px.
- Controles desktop 36 px; objetivos táctiles de al menos 44 px en móvil y puntero grueso.
- Radios 6 px controles/selección, 8 px superficie de apoyo, 10 px menús/diálogos. No se usan cápsulas como lenguaje general.
- Superficie abierta en resumen: indicadores sin cuatro cajas, gráfico/distribución sin paneles y clientes con separadores de filas.
- Seguimiento recibe fondo secundario porque contiene trabajo operativo con carga independiente; responsables es una lista compacta.
- Bordes sutiles entre zonas y filas; campos y botones de contorno con límites visibles. Sombra neutra solo en menús/diálogos para expresar superposición.

## Sidebar y topbar

Sidebar de 224 px, brand existente compacta y contexto de empresa sin tarjeta. Resumen separado del grupo comercial; herramientas futuras en grupo secundario con «Pronto» y sus diálogos actuales. Configuración, Usuarios condicionado por su permiso y Ayuda junto al perfil inferior.

Selección: fondo azul tenue, icono azul, peso 600 y aria-current; sin franja lateral decorativa. Filas desktop compactas y filas táctiles amplias. No se añade colapso desktop porque el contenido no lo exige.

Header: empresa/módulo a la izquierda; búsqueda de clientes junto a apariencia, notificaciones y usuario. En móvil, menú etiquetado y búsqueda en segunda fila. Destinos, parámetros y notificación de demostración conservan comportamiento e identificación.

Menú de apariencia con opciones radio Claro/Oscuro/Sistema, foco y selección accesibles. Menús compactos con encabezados discretos y hover preciso. Perfil con iniciales reales, nombre y rol actuales.

## Resumen y gráficos

Encabezado compacto con fecha y Nuevo cliente. Indicadores abiertos: cartera como foco, activos/prospectos/altas como contexto; enlaces de filtros existentes.

Desktop: columna de trabajo a la izquierda y cartera amplia a la derecha. Seguimiento encabeza el recorrido y responsables aparece debajo. Crecimiento y distribución comparten una zona analítica; clientes recientes ocupa el ancho principal. Se abandona el donut porque cantidades y porcentajes con barras por estado permiten comparación directa. Este orden pone las acciones pendientes primero en escritorio y móvil, también al recorrer con teclado.

Tablet: seguimiento y responsables primero; zona analítica en dos columnas cuando cabe. Móvil: indicadores 2×2, seguimiento antes del análisis detallado y gráfico horizontal por filas cuando su contenedor no permite leer seis columnas. Orden DOM y recorrido visual coherentes.

Pregunta del gráfico: «¿cuántos clientes se registraron cada mes?». Ejes/valores HTML, rejilla discreta, barras azules, mes actual identificado por texto, altura acotada y tabla accesible. Consulta de contenedor cambia a filas horizontales sin encoger etiquetas. Cantidades, porcentajes y comparaciones proceden de cálculos existentes.

Clientes recientes conserva cinco registros, fecha, estado y formulario de edición. Responsables conserva asignaciones y proporciones reales. Seguimiento conserva consulta, cálculos, tres próximos registros, vencidos, reintento y enlaces.

## Temas

next-themes existente: attribute="class", storageKey="nexo-theme", defaultTheme="system", enableSystem y disableTransitionOnChange. Script previo a hidratación para resolver el tema; suppressHydrationWarning solo en html. Indicadores de preferencia esperan hidratación. Sistema mantiene la elección «Sistema» aunque cambie el esquema efectivo. localStorage persiste entre recargas, navegación y nuevas sesiones del navegador. Toaster usa el esquema resuelto.

Oscuro tiene navegación, canvas, controles, popovers, texto, estados y gráfico propios; sin inversión de imágenes ni filtros CSS. Inputs/selects respetan color-scheme, portales heredan tokens del documento.

## Responsive, accesibilidad e interacciones

- 320–639 px: Sheet, header en dos filas, métricas 2×2 y objetivos 44 px; al ampliar texto, etiquetas y contexto ajustan líneas dentro de la cuadrícula.
- 640–1023 px: Sheet, header con búsqueda alineada y analítica que reagrupa sin overflow.
- Desde 1024 px: sidebar persistente; columnas de trabajo solo cuando el contenido dispone de ancho suficiente.
- Desde 1280 px: cartera amplia junto a seguimiento; a 1920 px se limita longitud de lectura.
- Tab/Enter/Escape, retorno de foco Radix, skip link, aria-label, aria-current y opciones radio de apariencia.
- Foco visible 2 px en ambos temas, AA medido, controles 3:1, gráfico con alternativa textual y estados con texto.
- Texto al 200%, ajuste de líneas, tablas de otros módulos en scroll local, formularios desplazables con campo enfocado accesible.
- Reduced-motion y forced-colors. Transiciones de color 120 ms y apertura/cierre Radix para comunicar estado; sin animación de contenido.
- Hover/active cambian superficies; selected permanece visible; disabled no interactivo.
- Carga con texto y skeleton estático, sin ceros provisionales. Error con explicación y reintento existente. Vacío con acción de alta; seguimiento vacío con contexto y acceso a Tareas. Avisos acordes al tema.

## Patrones excluidos y decisiones

- Sin KPI cards idénticas: cartera es referencia y otras cifras explican su estado.
- Sin donut: barras por estado permiten comparar sin depender de colores contiguos.
- Sin feed ni avatares ficticios: registros existentes e iniciales reales.
- Sin iconos en cada KPI: etiqueta y número bastan para interpretar la medida.
- Lucide se conserva para destinos/acciones con el vocabulario actual del producto.
- Sin controles de periodos/filtros ficticios: solo comportamiento existente.
- Sin puntos: el CRM es una superficie de lectura, no un canvas de workflows.
- Sin glass, glow, gradientes decorativos, sombras de paneles, títulos gigantes ni tarjetas anidadas.
- Sin dependencias nuevas: React/CSS/Radix y next-themes existentes cubren el alcance.

## Evidencia

Capturas antes/después, lint, typecheck, build, Playwright y auditoría final se registran en `anti-slop/visual-pass-2-2026-10-03.md`. Los límites se documentan por separado de los resultados verificados.

## Login: luz de entrada

Design Read: entrada de Nexo para equipos comerciales, con una escena material sobria y una lámpara colgante que revela el acceso. ENERGY 2 / RHYTHM 2 / MOTION 3, limitado a una coreografía de encendido reversible. El CRM conserva sus diales anteriores.

- Alcance exclusivo: presentación de `/login`, escena y tests de su interacción. El formulario, comprobación de sesión servidor, validación, Supabase Auth y redirects existentes se reutilizan sin cambios.
- Referencia: pantalla metálica negra, interior latón, cable, casquillo y cristal de la imagen proporcionada. SVG detallado con gradientes de material y reflejos, no una bombilla plana ni un asset bitmap nuevo.
- Composición: lámpara colgante arriba y desplazada hacia la izquierda, formulario abierto en el área inferior derecha de la luz; sin tarjeta. En tablet se acerca al eje del formulario; en móvil se reduce a un objeto compacto sobre el acceso.
- Material: metal grafito con sombras direccionales y reflejos discretos; interior dorado y filamento cálido crean profundidad y permiten reconocer apagado/encendido.
- Iluminación: un halo local y una proyección con caída de intensidad salen de la bombilla hacia el formulario. Gradientes y blur controlado describen luz física, no decoración de componentes. El azul Nexo se reserva a marca y submit.
- Claro: escena inicial gris carbón, iluminada con fondo mineral cálido y texto oscuro. Oscuro: escena inicial profunda, iluminada en neutros oscuros con texto claro. Sistema sigue el provider existente; encender no modifica ni persiste la preferencia del tema.
- La lámpara comienza apagada en cada entrada. Un botón físico con `aria-pressed`, nombre Encender/Apagar lámpara y foco visible controla la escena. Indicación discreta: Enciende la luz para continuar.
- Formulario montado para conservar valores al apagar; `inert` y `aria-hidden` lo retiran del foco y árbol accesible mientras está apagado. El foco permanece en la lámpara al activarla, sin abrir automáticamente el teclado móvil.
- Encendido: filamento 150–300 ms, halo 250–550 ms, proyección 300–850 ms y formulario 500–1000 ms. Apagado: formulario primero, ambiente y bombilla después. CSS mantiene reversibilidad sin timers ni loops.
- Movimiento físico: reacción breve de la pantalla al pulsar, sin balanceo perpetuo. Reduced-motion elimina movimiento y esperas largas, mantiene el cambio de estado.
- Formulario con tipografía Segoe UI y CTA azul actual; campos de al menos 48 px, password toggle de 44 px, foco de 2 px, estados existentes con texto. Paleta medida tanto sobre el fondo como sobre el extremo de luz permitido detrás del texto.
- Estilos en CSS Module del login para aislar escena, animación, colores y responsive. No se cambian dashboard, sidebar, header, providers ni primitivas globales.
- Sin video, WebGL, Three.js, fuentes nuevas ni dependencias. SVG y dos capas de luz estáticas; se animan opacidad y transform, no filtros continuos.
- Auditoría y evidencia de esta fase en `anti-slop/login-lamp-2026-10-03.md`.
