# Fase 1: rediseño visual y Motion System

Fecha: 8 de octubre de 2026. Skills: antislop, antislop-ui, antislop-human y antislop-layoutmobile, aplicadas durante todo el proceso y en la auditoría final. Fuente estética: brief del usuario, con más impacto visual, color, profundidad y glass controlado.

Estado final: PASS. Implementación, validación de navegador y Delivery Gate cerrados por el agente principal. Sin fallos de prueba pendientes.

## Resultado visual

Login con escena azul, lámpara de metal grafito/latón/cristal, reflejos ligados al encendido, filamento, dispersión del haz, luz ambiental, partículas finitas y balanceo amortiguado. El formulario es la única superficie de glass del acceso. El estado apagado conserva valores y retira el formulario del teclado/árbol accesible. En tablet y móvil, el formulario oculto colapsa para evitar scroll vacío.

El CRM utiliza canvas azul tonal, header de vidrio, navegación seleccionada en azul Nexo, superficies sólidas y una cartera principal que contextualiza los indicadores secundarios. El resumen mantiene datos reales, seguimiento antes del análisis, enlaces existentes y fechas visibles en todos los anchos. Las barras destacan el mes actual sin inventar tendencias.

Motion compartido para páginas, botones, campos, menús, dialogs, sheets, overlays, tablas y avisos; entradas y salidas con distintas curvas. La animación de página conserva el árbol de React. Light/Dark/System mantienen el provider, persistencia y aplicación del esquema antes del pintado; el icono de tema confirma la elección. Reduced motion elimina duración, delay e iteraciones decorativas y cancela motion nativo en curso.

## Archivos de esta fase

| Área | Archivos |
| --- | --- |
| Tokens y motion | `src/app/globals.css`, `src/app/workspace.css`, `src/app/motion.css` |
| Shell | `src/components/layout/app-shell.tsx`, `header.tsx`, `theme-switcher.tsx`, `page-motion.tsx` |
| Avisos | `src/components/ui/sonner.tsx` |
| Login | `src/features/auth/login-scene.tsx`, `login-scene.module.css`, `login-lamp.tsx` |
| Resumen | `src/features/overview/overview-view.tsx`, `overview.module.css` |
| Pruebas | Nuevo `tests/motion-system.spec.ts`; capturas afinadas en `tests/login-scene.spec.ts` y `tests/overview-ui.spec.ts` |
| Dirección y auditoría | `DESIGN.md`, `anti-slop/phase-1-design-2026-10-08.md`, este informe |

Los cambios ya presentes de clientes/leads, sus loading components y pruebas permanecen. `ThemeProvider` se inspeccionó y conserva su configuración original, incluida `disableTransitionOnChange`. No hay ediciones de esta fase en servicios Supabase, autenticación, RLS, permisos o CRUD.

## Validación de comandos

- `npm run lint`: PASS, exit 0, sin errores ni advertencias de ESLint.
- `npm run build`: PASS, exit 0, compilación optimizada, TypeScript y generación de 14 rutas. El primer intento compiló pero el sandbox bloqueó un subproceso con `spawn EPERM`; la repetición autorizada terminó correctamente.
- `npm run test:e2e`: suite completa de 95 casos en 12 archivos; primera corrida 90 correctos y 5 pendientes. Se repitieron 32 casos de login/motion/resumen/tareas/temas y después los 7 de motion. Los resultados más recientes de los 32 casos afectados están aprobados; los cinco casos inicialmente pendientes quedaron resueltos. Balance: 95 casos únicos verificados, cero pendientes y cero omitidos.
- `npm run test:e2e -- tests/login-scene.spec.ts tests/motion-system.spec.ts tests/overview-ui.spec.ts tests/tasks.spec.ts tests/themes.spec.ts --reporter=list,json`: 29 correctos de 32, con tres comprobaciones nuevas de teclado corregidas a continuación.
- `npm run test:e2e -- tests/motion-system.spec.ts --reporter=list,json`: PASS, 7/7, exit 0, 43.9 s. Los avisos se enfocan desde modalidad de teclado para comprobar `:focus-visible`, y los botones esperan hidratación antes de pulsar Enter. El detector de reduced motion cruza correctamente Shadow DOM para excluir únicamente las herramientas de desarrollo de Next.js.
- `git diff --check`: PASS; Git únicamente avisa sobre normalización LF/CRLF.

Evidencia: [balance consolidado](phase-1-evidence/test-summary.json), [corrida de 32 casos](phase-1-evidence/final-playwright.json), [motion final](phase-1-evidence/final-motion.json) y [reduced motion sin violaciones](phase-1-evidence/reduced-motion.json). El fallo aislado de Tareas no se repitió en la corrida estable: los once casos de esa suite pasaron sin editar su lógica.

## Contraste medido

Fórmula WCAG 2.x aplicada a tokens y composición conservadora de colores; las pruebas de navegador verifican texto renderizado y portales.

| Caso | Ratio mínimo medido |
| --- | --- |
| Texto secundario claro, todos los planos de CRM | 5.03:1 |
| Texto de enlace/lectura oscuro, todos los planos | 6.89:1 |
| Blanco sobre el punto más claro del reflejo del botón | 4.67:1 |
| Texto blanco del indicador de cartera | 5.62:1 |
| Límites de campos claros | 3.21:1 |
| Límites/foco de controles oscuros | 4.41:1 |
| Instrucción del login oscuro con luz compuesta conservadora | 4.74:1 |
| Foco del login claro encendido | 5.40:1 |

Canvas, texto, controles y foco del login cambian juntos al encender para evitar pérdida de contraste por interpolación de paletas. El filamento, luz, reflejos y formulario conservan la coreografía.

## Capturas e interacciones verificadas

Capturas con datos de prueba explícitos, no de producción:

- Login: [oscuro encendido desktop](phase-1-evidence/dark-1440.png), [claro encendido desktop](phase-1-evidence/light-1440.png), [apagado](phase-1-evidence/dark-off.png), [tablet](phase-1-evidence/light-768.png), [móvil](phase-1-evidence/dark-390.png), [texto al 200%](phase-1-evidence/dark-text-200.png).
- Resumen: [desktop con gráfico asentado](phase-1-evidence/overview-1440.png), [tablet](phase-1-evidence/overview-768.png), [móvil](phase-1-evidence/overview-390.png), [vacío](phase-1-evidence/overview-empty.png), [oscuro](phase-1-evidence/overview-Oscuro-1440.png).
- Overlays: [diálogo oscuro](phase-1-evidence/dialog-dark-no-preference.png), [diálogo reducido](phase-1-evidence/dialog-dark-reduce.png), [shell móvil](phase-1-evidence/mobile-shell-320.png).

| Control / estado | Resultado observado |
| --- | --- |
| Lámpara con mouse, Enter y Space | Encender/apagar cambia `aria-pressed`; apagado vuelve inert al acceso; los campos conservan sus valores. |
| Tab desde lámpara | Marca y correo siguen el orden del formulario, sin foco en elementos ocultos. |
| Correo/contraseña vacíos y credenciales incorrectas | Validación y mensajes existentes; foco en el campo inválido. |
| Mostrar/ocultar contraseña | Cambia tipo del campo y etiqueta accesible. |
| Submit pendiente, sesión expirada y error | Feedback visible, bloqueo de doble envío y mensajes preservados. |
| Login válido, recarga, logout y rutas protegidas | Sesión y redirects funcionan contra el servidor simulado; sin edición del flujo. |
| Apariencia: Claro/Oscuro/Sistema | Radio seleccionado, Escape y foco de retorno; persistencia en recarga/navegación/otro contexto; Sistema sigue esquema del navegador antes del pintado. |
| Menú móvil | Abre/cierra con teclado, navega a Clientes y devuelve foco con Escape en 320/640/768 px. |
| Navegación/sidebar y búsqueda | Destinos reales y búsqueda de clientes preservados. |
| Cartera, activos y prospectos | Enlaces aplican sus rutas/filtros reales. |
| Nuevo/editar cliente | Abre formulario, valida, cierra con Escape y devuelve foco al disparador; CRUD en suite completa. |
| Calendario/Reportes/Ayuda | Diálogos informativos existentes y cierres con Escape; los módulos pendientes conservan «Pronto». |
| Notificaciones | Marcar como leída actualiza estado; diálogo centrado, foco atrapado y retorno al disparador. |
| Seguimiento y listas del resumen | Enlaces a Tareas, registros reales, reintentos de clientes/tareas y vacío con acción. |
| Aviso real al guardar perfil de prueba | Tema resuelto, radio 14 px, duración 320 ms o reducida, foco visible de teclado. |
| Entrada de página | Termina; al activar reduced motion en curso se cancela y deja contenido visible, sin remontar el árbol. |
| Diálogos normales/reducidos | Geometría centrada, controles en viewport de 390×400 y campo Notas accesible al enfocar. |
| Estados y módulos comerciales | Lectura, filtros, formularios, permisos visibles y acciones de clientes/leads/oportunidades/ventas/tareas/usuarios verificados en sus suites existentes. |

## Delivery Gate: auditoría final del agente principal

Cada PASS corresponde al alcance modificado de esta fase. Se inspeccionaron también las superficies heredadas alcanzadas por los tokens compartidos. Las cuatro skills permanecieron activas durante la implementación.

### Bloque 1: Hard Gate

| Regla | Estado | Evidencia |
| --- | --- | --- |
| R-02, copy | PASS | El texto nuevo de login/resumen no contiene em dash ni emoji; se conservan registros y evidencia ajenos. |
| R-03, responsive | PASS | Login/temas comprueban 320, 390, 640, 768, 1024, 1280, 1440 y 1920 px; scrollWidth no supera innerWidth. |
| R-17, datos | PASS | Indicadores y barras proceden de useClients; loading/error no presentan cifras provisionales. |
| R-18, testimonios | PASS | No se añadieron testimonios, personas ni fotos ficticias al producto. |
| R-23, assets | PASS | Marca existente conservada; la lámpara fue pedida explícitamente y se amplió en SVG nativo. |
| R-24, navegación | PASS | Links y filtros reales ejercitados; Calendario/Reportes mantienen su estado Pronto y diálogo existente. |
| R-25, contraste | PASS | Tokens, texto renderizado y portales medidos; normal mínimo 4.67:1 en la zona más clara del CTA y controles ≥3:1. |
| R-26, controles | PASS | Tabla de interacciones registra comportamiento real de cada familia editada; no se añadieron controles sin acción. |
| R-27, estados | PASS | Carga/error/vacío/reintento del resumen y seguimiento, más pending/error del login, pasaron. |
| R-28, FAQ | PASS | Esta fase no añade FAQ ni preguntas genéricas. |
| R-32, teclado | PASS | Enter/Space/Tab/Escape, focus trap/retorno, campos ocultos inert y aviso con foco visible comprobados. |
| R-33, fuente | PASS | Ediciones directas con apply_patch; los scripts de contraste/reportes no reescriben UI ni CSS. |
| R-34, temas | PASS | Light/Dark/System, portales, estados, persistencia y esquema resuelto de Sonner verificados. |
| R-35, ejecución | PASS | Lint/build y casos de navegador ejecutados; capturas finales y controles registrados; logs de la corrida estable revisados. |
| R-36, afirmaciones | PASS | No se añadieron promesas de seguridad, rendimiento, clientes ni compliance. |
| R-37, dirección | PASS | Brief explícito vigente, diales y motivos escritos en DESIGN.md y documento de dirección. |
| R-38, contenido | PASS | Producto consume sus datos; las capturas declaran fixtures de prueba y no representan clientes reales. |

### Bloque 2: Purpose Gate

| Técnica / regla | Estado | Propósito comprobado |
| --- | --- | --- |
| Gradientes, R-01 | PASS | Describen metal/luz física y destacan cartera/mes actual; no cubren todas las tarjetas. |
| Iconos, R-04 | PASS | Lucide existente identifica destinos y acciones; no se añadieron iconos de magia o IA. |
| Tipografía, R-06 | PASS | Segoe UI mantiene lectura española sin descargas; jerarquía y cifras tabulares descritas en dirección. |
| Patrones, R-07 | PASS | No hay grid ni orbes decorativos; líneas del gráfico marcan valores reales. |
| Flechas, R-08 | PASS | Una flecha de cartera señala navegación; submit conserva su indicación de acceso existente. |
| Badges, R-09 | PASS | Estados reales; sin cápsula decorativa sobre H1 ni estatus de actividad inventado. |
| Glass, R-10 | PASS | Una superficie por pantalla: formulario de login o header del CRM; paneles de datos sólidos. |
| Sombras, R-12 | PASS | Elevación en formulario/overlays y foco de cartera; no sombra grande en cada elemento. |
| Glow, R-13 | PASS | Restringido a iluminación física de bombilla/halo; sin glow general en botones, tablas y badges. |
| Tarjetas, R-14 | PASS | Una métrica principal, secundarios abiertos, seguimiento y análisis con tamaños dictados por contenido. |
| Motion, R-19 | PASS | Sway/dust/respiración finitos; entradas por acción, timings comunes y ausencia de movimiento/esperas en reduce. |
| Ilustración, R-22 | PASS | La lámpara pedida activa la escena y el acceso; sin ilustraciones ajenas al producto. |

### Bloque 3: Liveliness

| Criterio | Estado | Evidencia |
| --- | --- | --- |
| Diales explícitos | PASS | ENERGY 3/RHYTHM 2; MOTION 3 login y 2 CRM, fijados antes de implementar. |
| Diales coherentes | PASS | Lámpara con coreografía; CRM con respuesta breve y lectura estable. |
| Foco por pantalla | PASS | Lámpara apagada, formulario encendido y cartera principal del resumen. |
| Espacio estructural | PASS | Acceso y objeto separados; seguimiento precede al análisis y responsables permanece abierto. |
| Acento deliberado | PASS | Azul Nexo identifica acceso, cartera y módulo seleccionado; luz cálida localizada en lámpara. |
| Identidad | PASS | Monograma existente, azul Nexo y lámpara de entrada reconocible. |
| Design Read previo | PASS | Registrado al comenzar esta fase y en el documento de dirección. |

### Bloque 4: Craftsmanship y Quality Locks

| Criterio / regla | Estado | Evidencia |
| --- | --- | --- |
| C-1, intención | PASS | Tabla de decisiones justifica paleta, layout, luz, vidrio, tipo, espacio y motion. |
| C-2, función | PASS | Controles registrados y pruebas contra backend local; sin nuevos botones vacíos. |
| C-3, contenido | PASS | Se conservan datos y decisiones comerciales; no se agregan secciones de marketing. |
| C-4, resistencia | PASS | Temas, ocho anchos, 200%, viewport corto, teclado, error/vacío/loading y reduced motion comprobados. |
| C-5, evidencia | PASS | Valores reales de provider; fixtures identificados y resultados JSON conservados. |
| R-05, composición | PASS | Cartera asimétrica respecto a secundarios; seguimiento, responsables y análisis responden a su contenido. |
| R-11, radios | PASS | Campos/acciones compactos y paneles/overlays con radio mayor; no sistema de cápsulas. |
| R-15, CTA | PASS | Iniciar sesión, Nuevo cliente, Ver cartera, Reintentar y acciones concretas existentes. |
| R-16, copy | PASS | Sin claims de IA ni frases de marketing sobre rendimiento o seguridad. |
| R-20, identidad | PASS | La escena de lámpara y continuidad azul/monograma dan una entrada propia a Nexo. |
| R-21, esquema | PASS | Selector operativo Claro/Oscuro/Sistema; sin tema fijo impuesto. |
| R-29, paleta | PASS | Azul y neutros tonales; latón cálido localizado, colores semánticos solo para estados reales. |
| R-30, originalidad | PASS | Se siguió el brief Nexo/lámpara; no se clonó una interfaz de otro producto. |
| R-31, motivos | PASS | Todas las decisiones mayores tienen razón escrita en el documento de dirección. |

## Auditoría complementaria de las cuatro skills

| Skill | Estado | Evidencia final |
| --- | --- | --- |
| antislop | PASS | Los cuatro bloques anteriores pasan; no hay fallos abiertos de la fase. |
| antislop-ui | PASS | Identidad/paleta propia, jerarquía por contenido, un glass por pantalla, sombras selectivas y motion finito con propósito. |
| antislop-human | PASS | AA calculado, controles/foco ≥3:1, teclado y Escape, estados con texto, zoom 200% y campos visibles en viewport corto. |
| antislop-layoutmobile | PASS | Composiciones distintas, consultas de contenedor, ocho anchos sin overflow, targets 44 px en móvil/tablet, menú accesible y datos/fechas legibles. |

## Límites del alcance

- Fase 1 completada y validada; esta pasada no desarrolla Calendario/Reportes ni rediseña en detalle todos los módulos de la Fase 2. Los componentes y tokens compartidos se propagan a ellos.
- La lámpara es una ilustración vectorial con materiales y luz compuestos en CSS/SVG; no es un render físico 3D. Blur permanece estático, sin video/WebGL ni nuevas dependencias.
- La respiración, balanceo y polvo regresan al reposo; la actividad visual no sigue indefinidamente durante la escritura.
- La validación automatizada utiliza datos claramente identificados de prueba y backend local, no la base de producción. Navegador Chromium/Edge; otros motores, teclado virtual y FPS en dispositivos físicos quedan sin medición. Viewport corto emula el área disponible para el formulario.
