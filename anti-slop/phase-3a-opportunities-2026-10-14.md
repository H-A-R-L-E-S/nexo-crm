# Fase 3A · Oportunidades

Fecha de cierre de auditoría: 14 de octubre de 2026.

## Alcance y dirección

Rediseño exclusivo de la presentación del módulo Oportunidades. Se conserva la identidad vigente de Nexo CRM: ENERGY 3, RHYTHM 2 y MOTION 2; azul como acción primaria; color semántico por etapa; vidrio limitado al resumen; tarjetas con profundidad leve; Segoe UI y tokens compartidos. Supabase, RLS, autenticación, permisos, servicios, contratos, cálculos monetarios y reglas comerciales no se modificaron.

El pipeline mantiene seis etapas y el guardado existente mediante selector. No se incorporó drag and drop: habría creado una segunda vía de persistencia, concurrencia y recuperación de foco para una operación comercial ya resuelta por `StageControl`. El selector conserva la probabilidad sugerida, el control de versión y el feedback existentes.

## Resultado funcional y visual

- Resumen comercial con valor total y ponderado, oportunidades abiertas, ganadas del mes y tasa de cierre; todos proceden de los cálculos existentes.
- Pipeline semántico por etapa. En móvil se navega una etapa a la vez; tablet usa dos columnas; escritorio ofrece carril horizontal local de seis columnas.
- Tarjetas con cliente, importe, probabilidad, responsable, cierre, cambio de etapa y acciones de detalle, tareas, edición y eliminación según permiso.
- Vista Lista con tarjetas móviles, tabla de ocho columnas en escritorio y paginación existente.
- Búsqueda, seis filtros, chips independientes, limpiar, actualizar y estados de carga, error, reintento y vacío.
- Formularios agrupados por oportunidad/cliente, información comercial y cierre/contexto; validaciones y payloads originales conservados.
- Detalle con etapa, importe, probabilidad, relaciones, responsable, fechas y descripción extensa.
- Claro, Oscuro y Sistema; Sistema se comprobó en esquemas efectivos claro y oscuro.
- Motion System compartido, feedback de hover/active/focus, reduced motion, forced colors y reduced transparency.
- Corrección responsive final: en esta ruta, el título del encabezado puede reducirse y partir línea al ampliar texto al 200 %, sin modificar el shell compartido ni otras rutas.

## Matriz responsive revisada

| Ancho | Presentación comprobada |
| --- | --- |
| 320 y 390 px | Navegación por etapas, una columna, lista móvil, filtros apilados, objetivos de 44 px y texto al 200 % sin overflow horizontal. |
| 768 y 1024 px | Pipeline de dos columnas, filtros de tres columnas y reflow estable. |
| 1440 px | Seis etapas en carril local, tabla profesional, filtros completos y ancho de lectura limitado por el shell. |
| 390 × 400 px | Diálogo desplazable; textarea y acción principal enfocadas permanecen visibles. |

## Auditoría Anti Slop

### Core

PASS. La jerarquía responde a la tarea comercial: cartera, filtros, elección de vista y oportunidades. No se añadieron datos ficticios de producto, KPIs decorativos, dependencias ni patrones ajenos a Nexo. El resumen es la única superficie de vidrio; las tarjetas usan una superficie al 96 % y sombra leve.

### UI

PASS. Cada etapa tiene texto y color; el color no es la única señal. Radios, bordes y profundidad distinguen resumen, columnas, tarjetas y diálogos sin anidar paneles decorativos. Se reutilizan `DirectoryHeader`, primitivas Radix/shadcn, tokens y Motion System. Las 52 capturas cubren temas, tamaños, lista, pipeline, formularios, detalle y estados.

### Human y accesibilidad

PASS para Oportunidades. El recorrido por teclado abre y cierra diálogos, conserva el foco, cambia etapa y lleva el foco a la tarjeta reubicada. Los controles visibles en móvil miden al menos 44 × 44 px. Los estados usan `role=status` o `role=alert`, los diálogos atrapan y restituyen foco, y etiquetas/ayudas están asociadas. Las mediciones automáticas no detectaron pares por debajo del umbral; el degradado del resumen tiene un mínimo calculado de 5,25:1 para texto normal. Reduced motion no deja animaciones activas en el módulo.

### Layout mobile

PASS. Se comprobó reflow, contenido extremo, importes grandes, nombres largos, texto al 200 %, formularios con viewport corto y ausencia de overflow a 320, 390, 768, 1024 y 1440 px. La prueba espera que el layout se estabilice tras cambiar el viewport y sigue fallando ante cualquier overflow persistente, con diagnóstico del elemento responsable.

## Validaciones

| Comprobación | Resultado |
| --- | --- |
| `npm run lint` | PASS, código 0. |
| `npm run build` final con `.env.local` | PASS, código 0; compilación, TypeScript y 14 rutas completadas. |
| Pruebas visuales nuevas de Oportunidades | 11/11 PASS. |
| Pruebas funcionales existentes de Oportunidades | 9/9 PASS. |
| Suite completa | 110/111 PASS en 10,1 min. |
| `git diff --check` | PASS; solo avisos informativos LF/CRLF de Git. |
| Alcance protegido | PASS: sin diff en servicios de Oportunidades, autenticación, middleware ni Supabase. |

Las 20 pruebas de Oportunidades pasaron dentro de la suite completa. Cubren CRUD por tres roles, filtros, estadísticas, paginación, relaciones desde Cliente/Lead, conflicto al cambiar etapa, autenticación, cálculos exactos y cierres de Lima, además de temas, responsive, contraste, teclado, estados y capturas.

La suite completa encontró un problema preexistente fuera del alcance: `tests/login-photographic.spec.ts`, caso «glass en ambos temas y alternativa opaca al reducir transparencias», espera `backdrop-filter: blur(16px)` y Chromium devuelve `none`. Se reprodujo aislado 0/1. No hay cambios locales en login y no se modificó para evitar ampliar esta fase.

## Evidencia

Las capturas y la medición del degradado están en [`opportunities-evidence`](opportunities-evidence/). Las capturas `review-*-desktop.png` y `review-*-mobile.png` son la revisión limpia final; las `fixtures-*` documentan tamaños, temas, contenido extremo, formularios, detalle y estados.

La primera solicitud de repetir Playwright fuera del sandbox fue rechazada porque el revisor automático agotó su cuota y no pudo evaluar el comando; no fue una declaración de inseguridad. No se eludió esa revisión. En esta continuación, las solicitudes permitidas ejecutaron los mismos comandos de forma explícita contra servidores locales de prueba.

No se creó commit ni se hizo push.
