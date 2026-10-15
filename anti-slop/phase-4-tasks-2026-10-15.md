# Fase 4: Tareas y seguimiento comercial

Fecha de cierre: 15 de octubre de 2026.

## Objetivo y alcance

Rediseño visual exclusivo del módulo Tareas: listado, resumen, filtros, vistas Lista y Tablero, alta y edición, detalle y carga de ruta. Se conserva la dirección Nexo CRM vigente para módulos comerciales: ENERGY 3, RHYTHM 2 y MOTION 2; azul para acción y foco; color semántico solo para estados reales; profundidad concentrada en el resumen; tipografía y tokens compartidos; Claro, Oscuro y Sistema.

No se modificaron Supabase, SQL, RLS, autenticación, permisos, servicios, consultas, contratos, validaciones, persistencia, relaciones, rutas ni cálculos de fecha. Se mantienen Pendiente, En progreso, Completada y Cancelada; prioridades Alta, Media y Baja; tipos existentes; control de versión; idempotencia y hora de Lima.

## Archivos modificados

- `src/features/tasks/tasks-view.tsx` y `tasks.module.css`: encabezado, resumen real, filtros, listado, tablero y responsive.
- `src/features/tasks/task-form.tsx` y `task-dialog.module.css`: diálogo, jerarquía del formulario, superficie fija y reflow móvil.
- `src/features/tasks/task-detail-view.tsx` y `task-detail.module.css`: cabecera, relación comercial, metadatos y descripción.
- `src/app/(crm)/tareas/loading.tsx` y `tasks-loading.module.css`: skeleton específico y estático con movimiento reducido.

`DESIGN.md` no cambia porque la fase reutiliza patrones ya documentados en Oportunidades y Ventas y no incorpora un patrón compartido nuevo.

## Decisiones visuales y razones

- Color: el azul Nexo identifica acción y foco; rojo, ámbar y verde conservan significado operativo acompañado por texto.
- Layout: el resumen agrupa los cuatro cálculos reales en una sola superficie para leer urgencia antes del listado.
- Tipografía: Segoe UI y escala existente mantienen lectura empresarial en español y coherencia entre módulos.
- Espacio: una escala compacta separa cabecera, resumen y espacio de trabajo sin convertir cada dato en tarjeta.
- Superficies: vidrio y degradado se limitan al resumen porque es el único nivel que necesita énfasis; tabla, columnas y detalle permanecen sólidos.
- Motion: entrada breve y transiciones de estado orientan el cambio de contexto; no hay loops y `prefers-reduced-motion` las elimina.
- Responsive: los controles se reagrupan por contenido, el tablero pasa de cuatro a dos y una columna, y el formulario cambia a una columna.
- Iconos: se conservan solo los iconos existentes ligados a buscar, recordar y ejecutar acciones reales.

## Funcionalidad conservada

- Búsqueda por título, descripción o relación.
- Filtros combinados de estado, prioridad, tipo, responsable, fechas y vencimiento.
- Orden por vencimiento y paginación de diez registros.
- Lista y tablero con los mismos registros y acciones.
- Métricas reales mediante `taskStats`.
- CRUD y cambios de estado según rol.
- Prevención de envío duplicado y reintento idempotente.
- Relaciones y enlaces con Cliente, Lead, Oportunidad y Venta.
- Fechas y vencimientos calculados con la lógica existente de Lima.
- Estados de carga, error, reintento, vacío global y vacío por filtros.

## Validación

| Comprobación | Resultado |
| --- | --- |
| `npm run lint` | PASS, código 0. |
| `npm run typecheck` | PASS, código 0. |
| `npm run build` | PASS fuera del sandbox, 14 rutas generadas. El primer intento compiló y luego recibió `spawn EPERM` dentro del sandbox. |
| `tests/tasks.spec.ts` | 11/11 PASS. |
| `tests/themes.spec.ts` y `tests/motion-system.spec.ts` | 11/11 PASS. |
| `git diff --check` | PASS; solo avisos informativos LF/CRLF. |
| Alcance protegido | PASS; no hay cambios en servicios, contratos, permisos, fechas, validación, autenticación ni Supabase. |

Las pruebas de Tareas cubren los tres roles, alta, edición, asignación, completar, reabrir, cancelar y eliminar; búsqueda, filtros, paginación y métricas; las cuatro relaciones comerciales; error, conflicto e idempotencia; móvil, teclado, ausencia de overflow y límites de fecha de Lima. La ronda relacionada cubre Claro, Oscuro, Sistema, contraste de tokens, portales, navegación móvil y movimiento reducido.

## Auditoría de las cuatro skills

### Core

PASS. La composición responde a decidir qué seguimiento atender. Todas las cifras proceden de `taskStats`; no se añadieron datos, estados, acciones, relaciones, navegación ni claims ficticios. Cada control conserva un comportamiento real.

### UI

PASS. ENERGY 3 / RHYTHM 2 / MOTION 2 se expresa mediante un resumen enfático, un espacio de trabajo compacto y transiciones breves. El degradado y la sombra tienen una única función jerárquica. No hay bento, glows, iconos decorativos, tarjetas KPI separadas ni clonación de otro producto.

### Human

PASS en la cobertura ejecutada. Los estados incluyen texto, el foco visible y la operación por teclado se conservan, Radix mantiene Escape y retorno de foco, los errores usan `role=alert`, la carga usa `role=status` y movimiento reducido elimina las animaciones. Las pruebas de temas validan los tokens de contraste en claro y oscuro.

### Layout mobile

PASS. La prueba a 390 px confirma ausencia de overflow, formulario operable y controles reorganizados. Los estilos definen estados adicionales para tablet y escritorio; botones, campos y paginación alcanzan 44 px en móvil.

## Delivery Gate

- R-02 PASS: el texto nuevo no utiliza raya em.
- R-03 PASS: la prueba móvil valida `scrollWidth <= innerWidth`; filtros, resumen, tablero, detalle y diálogo reagrupan contenido.
- R-17/R-38 PASS: métricas y filas usan exclusivamente datos cargados y cálculos existentes.
- R-23/R-24 PASS: no se crearon assets ni destinos de navegación.
- R-25 PASS: se reutilizan tokens medidos y `themes.spec.ts` pasa en ambos temas.
- R-26 PASS: búsqueda, filtros, vistas, paginación, CRUD, enlaces y reintentos se ejercitaron en Playwright.
- R-27 PASS: carga, vacío y error están presentes tanto en listado como detalle.
- R-32 PASS: la prueba de teclado crea una tarea y Radix conserva foco, Escape y retorno.
- R-33 PASS: los cambios se escribieron directamente en TSX y CSS Modules.
- R-34 PASS: las pruebas Claro, Oscuro y Sistema pasan.
- R-35 PASS: lint, typecheck, build y 22 pruebas relacionadas pasan; el recorrido funcional queda registrado arriba.
- R-36 PASS: no hay claims de seguridad, rendimiento o clientes.
- R-01/R-10/R-12/R-13 PASS: degradado, transparencia y sombra se limitan al resumen y overlays con razón jerárquica documentada.
- R-04 PASS: cada icono existente representa su acción concreta.
- R-05/R-14 PASS: la composición deriva del trabajo real y varía entre resumen, tabla, tablero, formulario y detalle.
- R-06 PASS: Segoe UI se conserva por lectura empresarial en español.
- R-09 PASS: badges solo expresan estados reales.
- R-11 PASS: radios diferencian controles, superficies y overlays; no todo es cápsula.
- R-19 PASS: motion breve comunica entrada y estado, sin loops, y respeta movimiento reducido.
- R-20/R-29/R-30 PASS: identidad Nexo, paleta controlada y composición propia se conservan.
- R-31 PASS: las razones principales quedan documentadas en este informe.
- C-1 a C-5 PASS: decisiones intencionales, controles funcionales, composición orientada a contenido, estados resilientes y datos reales.

## Limitaciones restantes

- Tareas no tiene ordenamiento interactivo adicional ni filtros de relación comercial. No se inventaron porque el backend y la interfaz actual no los implementan.
- No se agregó una nueva librería de motion ni drag and drop.
- La validación visual automatizada reutiliza la cobertura existente de temas y móvil; no se generó una matriz redundante de capturas.

No se creó commit ni se hizo push.
