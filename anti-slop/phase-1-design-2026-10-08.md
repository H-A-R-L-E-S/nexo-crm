# Nexo CRM: Fase 1, dirección visual

Fuente: brief y prioridades explícitas del usuario en esta sesión. Modo antislop: during, session override. Fecha: 8 de octubre de 2026.

Design Read: CRM para equipos comerciales con azul Nexo expresivo, superficies de lectura estratificadas y una lámpara metálica que revela el acceso. ENERGY 3 / RHYTHM 2 / MOTION 3 en login; ENERGY 3 / RHYTHM 2 / MOTION 2 en CRM.

## Alcance

Login, materiales de la lámpara, luz ambiental, formulario visual, tokens de tema, navegación, header, resumen, menús, diálogos, sheets, controles, avisos y motion de página. Se reutilizan componentes, servicios y datos existentes. El formulario de autenticación y sus redirects no se editan. Clientes/leads tenían cambios previos a esta fase que se preservan.

## Decisiones y propósito

| Decisión | Razón |
| --- | --- |
| Azul de acción #245de2 | Recupera presencia Nexo y mantiene 5.62:1 con blanco antes del reflejo superficial. |
| Canvas claro #edf2fa y blanco en datos | La separación de planos hace visibles los paneles sin añadir bordes dominantes. |
| Canvas oscuro #0a1222 y superficie #121f35 | Los azules tonales aportan profundidad y distinguen lectura de navegación. |
| Luz cálida frente al ambiente azul del login | El encendido de la lámpara tiene una identidad material reconocible. |
| Metal grafito, latón, cristal y filamento | Los reflejos, espesores y capas describen una lámpara física. |
| Glass en formulario y header | Vincula el acceso a la escena de luz y mantiene contexto al desplazar el CRM; otros paneles son sólidos. |
| Blur estático | Proporciona vidrio y dispersión luminosa sin animar filtros en cada frame. |
| Respiración y balanceo amortiguado finitos | Explican la reacción física al encender y permiten que la escena vuelva al reposo. |
| Partículas finitas dentro del haz | Hacen perceptible la dispersión de luz al activarla. |
| Cartera como foco del resumen | El total contextualiza las métricas secundarias, con cifras y enlaces reales. |
| Seguimiento antes del análisis | La siguiente acción comercial guía el recorrido visual y de teclado. |
| Barras con entrada desde su base | Presentan la serie real de registros y destacan el mes actual, sin inventar evolución. |
| Segoe UI y sistema | Mantienen lectura familiar en español, números tabulares y carga sin fuentes externas. |
| Radios diferenciados | Campos y acciones son compactos; paneles principales tienen mayor radio. |
| Sombras en overlays y foco principal | La elevación comunica qué superficie flota y cuál pertenece al canvas. |
| Lucide existente | Las figuras identifican acciones y destinos conocidos sin introducir otro vocabulario. |
| Tema aplicado antes del pintado | Light/Dark/System conservan persistencia y contraste durante la conmutación; el icono animado confirma la elección. |
| Canvas, instrucciones y foco del login cambian juntos | Evita cruces de luminosidad que reducirían el contraste durante el encendido; luz y formulario conservan sus transiciones. |

## Motion system

- Tokens compartidos: feedback 140 ms, controles 200 ms, entrada 320 ms, salida 150 ms, superficies 220 ms; curvas estándar, entrada y salida explícitas.
- Página: una entrada finita del contenedor mediante Web Animations, manteniendo el árbol React y el estado de sus hijos. Cambio a reduced motion cancela la animación activa.
- Botones: feedback de color, reflejo discreto, elevación de 1 px solo con mouse; inputs y select muestran foco y borde reforzado. El tacto conserva feedback activo.
- Menús: entrada desde el anclaje y salida corta; diálogos: escala mínima y desplazamiento de 12 px; sheets: movimiento desde su borde; overlays: opacidad.
- Filas de tablas: cambio de superficie para conservar alineación; avisos reutilizan Sonner y los colores resueltos del tema. Loading reutiliza indicadores existentes.
- Reduced motion elimina duración, delay e iteraciones decorativas, incluidas pseudocapas; conserva geometría de portales y cambios de estado. La lámpara y barras quedan estáticas.
- Forced colors conserva estados, foco, controles y barras. El header tiene alternativa opaca para reduced transparency.

## Responsive y usabilidad

Composición de login distinta en escritorio, tablet y móvil, formulario desplazable y campos montados al apagar. El menú móvil y el header mantienen targets de al menos 44 px hasta 1023 px. El resumen usa consultas de contenedor para reorganizar métricas, seguimiento y análisis según el ancho disponible. Las animaciones no mueven elementos individuales de tablas ni retrasan validaciones.

Las comprobaciones y los límites de ejecución se registran en el informe final de auditoría de esta fase.
