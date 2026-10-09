# Fase 2: Clientes y Leads

Fecha de cierre: 2026-10-07. Continuación de los cambios iniciados el 2026-10-06. Modo antislop: during, selección de la sesión mediante la instrucción de aplicar las cuatro skills durante todo el trabajo y desde el inicio.

Fuente visual: `DESIGN.md`, conservado sin cambios. Skills leídas desde `.codex/skills/antislop/`, `antislop-ui/`, `antislop-human/` y `antislop-layoutmobile/`. Se consultaron las guías instaladas de Next sobre CSS, componentes servidor/cliente y Playwright antes de implementar.

## Alcance y decisiones

Design Read: directorios de contactos para equipos comerciales, con la identidad compacta y serena de Nexo. ENERGY 1 / RHYTHM 2 / MOTION 1.

- Paleta: tokens existentes de Nexo, para que tablas, campos, menús y diálogos sigan Claro, Oscuro y Sistema sin reglas globales nuevas.
- Composición: título y contador, métricas en línea, herramientas y filas; el contacto y la siguiente acción tienen prioridad sobre tarjetas de resumen.
- Clientes: nombre y empresa juntos; correo y teléfono forman una columna de contacto; estado y responsable mantienen columnas propias.
- Leads: estado temprano, empresa y fuente agrupadas, prioridad, responsable y seguimiento; su composición responde al proceso de calificación.
- Tabla: separadores horizontales, encabezados discretos y filas compactas; texto largo truncado en escritorio con contenido completo y `title`, y ajustado a varias líneas en móvil.
- Móvil: lista semántica con identidad, estado, datos de contacto y menú; conserva las acciones sin desplazar una tabla de escritorio.
- Filtros: barra integrada y filtros activos removibles por separado; cada eliminación conserva los demás filtros y vuelve a la primera página.
- Formularios: fieldsets con identificación/contacto, relación comercial y seguimiento; todos los campos y la validación existentes permanecen.
- Detalle de Leads: contacto, información comercial, seguimiento y notas separados por espacio y líneas, con sus vínculos reales al cliente y a oportunidades.
- Conversión: datos necesarios, candidato existente, explicación y confirmación visible; el RPC y sus resultados conservan su tratamiento original.
- Acciones: un menú por fila reúne edición, relaciones y eliminación; la creación sigue siendo la acción primaria de la página.
- Estados: skeleton estático y texto de carga, error con reintento y vacío contextual; no se muestran cifras provisionales.
- Tipografía: Segoe UI del sistema existente, números tabulares y escala rem para lectura y ampliación.
- Iconos: Lucide existente identifica buscar, abrir acciones, editar, convertir y eliminar; las métricas no llevan iconos decorativos.
- Badges: únicamente estados reales, con texto; las prioridades se expresan con etiquetas accesibles, sin cápsulas adicionales.
- Radios y sombras: controles de 6 px y menús/diálogos de 10 px; la sombra existente expresa superposición, sin paneles flotantes nuevos.
- Movimiento: hover/foco y apertura Radix existentes; sin animación de contenido. La carga de una operación conserva su indicador funcional.
- Aislamiento: componentes y CSS Module compartidos solo por estas presentaciones; no se rediseñaron login, resumen, sidebar, header ni otros módulos.

## Límites preservados

Sin cambios en Supabase, SQL, tablas, RLS, autenticación, perfiles, roles, permisos, servicios, queries, providers, hooks de datos, validadores, tipos ni reglas comerciales. Las URLs y parámetros de relaciones existentes se conservan. Los archivos `loading.tsx` solo proporcionan presentación de carga en las rutas existentes.

Se conservan el orden de consulta, los predicados de búsqueda/filtro, la paginación de Clientes con 8/16/24 registros y Leads con 10, los cálculos de estado/seguimiento y las fechas de Lima. No se añadió ordenamiento porque ninguno de los dos módulos tenía un control de orden. Clientes no tenía una vista de detalle separada: todos sus datos continúan accesibles mediante edición.

Los formularios, confirmaciones y menús mantienen los handlers de alta, edición, eliminación y conversión. Sus props controladas y callbacks de foco son de presentación. El formulario de Clientes se reutiliza desde Resumen, cuyo recorrido y composición se mantienen.

## Verificación

El primer arranque de Playwright dentro del aislamiento falló con `spawn EPERM` antes de ejecutar pruebas. Los reintentos autorizados usan los servidores HTTP locales del proyecto y el navegador configurado para el proyecto Chromium de Playwright.

| Comando ejecutado | Resultado final |
| --- | --- |
| `npm run lint` | PASS: exit 0, sin errores ni warnings de ESLint. |
| `npm run build` | PASS: exit 0, compilación Turbopack, TypeScript y generación de las 14 páginas finalizados. |
| `npx playwright test tests/crm.spec.ts tests/leads.spec.ts tests/directories-ui.spec.ts` | PASS: 26/26, 4.0 minutos. Clientes 5, Leads 7 y directorios 14. |
| `npx playwright test tests/crm.spec.ts --grep 'paginación de clientes'` | PASS: 1/1, 16.3 segundos; recorrido adicional de paginación. |
| Pruebas relacionadas seleccionadas, comando debajo | PASS: 5/5, 1.1 minutos; navegación, relaciones y formulario compartido. |
| `git diff --check` | PASS: sin problemas de espacios del diff. |
| Comparación de los archivos protegidos contra HEAD | PASS: servicios, SQL, autenticación, permisos, validaciones, contratos, providers, hooks, fechas, shell y `DESIGN.md` intactos. |

32 pruebas distintas aprobadas en estas tres ejecuciones de Playwright. Clientes cuenta con seis comprobaciones, Leads con siete, directorios con catorce y los recorridos relacionados con cinco. No existe `tests/clients.spec.ts`: las pruebas de Clientes están en `tests/crm.spec.ts`.

```powershell
npx playwright test tests/tasks.spec.ts tests/opportunities.spec.ts tests/overview-ui.spec.ts tests/themes.spec.ts --grep 'Nueva tarea desde (Cliente|Lead)|crear desde Cliente|resumen con datos|ambos temas'
```

Incidencias resueltas: las primeras matrices detectaron un nombre de empresa largo que desbordaba el móvil y el atributo Radix que impedía aplicar la altura táctil a los botones de creación; los estilos locales corrigen ambos. Una ejecución posterior tuvo 25 pruebas aprobadas y una comprobación de selector fallida; tras corregir los tres selectores por nombre accesible, la repetición conjunta aprobó las 26.

Observaciones de ejecución: Next informó que ignoró un `package-lock.json` situado fuera del repositorio. El servidor de desarrollo imprimió un aviso de React sobre una actualización antes de montaje durante la prueba de filtros de Leads. Ambos comandos finalizaron correctamente; las seis matrices visuales no registraron errores de página ni mensajes de hidratación. No se alteraron configuración, autenticación ni hooks de datos para silenciar estos avisos.

## Recorrido funcional y visual registrado

| Control o estado | Evidencia ejecutada |
| --- | --- |
| Crear y editar Clientes | Alta, edición, persistencia tras recarga y datos largos; `crm` y `directories-ui`. |
| Eliminar Clientes | Confirmación, cancelar, eliminar según rol y foco en Nuevo cliente al desaparecer la fila. |
| Paginación de Clientes | Páginas 1/2/3/4, anterior/siguiente, selección `aria-current`, 8/16/24 registros, filtro desde otra página y lista a 320 px. |
| Filtros de Clientes | Búsqueda, estado y responsable; retirada individual conserva los demás valores; limpiar restablece el directorio. |
| Crear y editar Leads | Administrador, Gerente y Vendedor; campos, responsable, restricciones, estado y persistencia. |
| Detalle de Leads | Menú y datos comerciales, contacto, notas y datos largos; enlaces del registro convertido. |
| Conversión | Datos incompletos muestran el error existente; alta convierte una vez; correo existente requiere confirmación antes de vincular. |
| Eliminar Leads | Permiso visual por rol, cancelación, eliminación y foco en Nuevo lead cuando desaparece la fila. |
| Filtros y paginación de Leads | Búsqueda, cuatro filtros, retirada independiente, anterior/siguiente y error/reintento. |
| Menús y diálogos | Enter, Home, ArrowDown, Tab, Shift+Tab, Escape, trampa de foco y retorno al activador. |
| Nueva tarea desde Cliente y Lead | Navegación real, relación preseleccionada, alta y vínculo persistente; pruebas de Tareas seleccionadas. |
| Nueva oportunidad desde Cliente y Lead convertido | Navegación real y relaciones preseleccionadas; prueba de Oportunidades seleccionada. |
| Formulario desde Resumen | Edición, creación, Escape, foco y navegación del shell; prueba seleccionada de `overview-ui`. |
| Temas y portales compartidos | Claro y Oscuro, contraste, selects, diálogo, campo Notas y formulario con viewport corto; prueba seleccionada de `themes`. |
| Claro / Oscuro / Sistema de los directorios | Seis matrices, con 320/390/768/1024/1440 px y contenido largo; Sistema responde al cambio de esquema sin cambiar la elección guardada. |
| Carga / error / reintento / vacío | Ambos módulos y los tres modos; skeleton, mensajes, recuperación y apertura del formulario en el vacío. |
| Texto ampliado y teclado móvil | Texto al 200% en listados y formularios; viewport de 390 × 400 simula reducción de altura por teclado, con Notas y guardar completamente visibles al enfocarlos. |

Revisión visual manual de capturas representativas: Clientes claro a 320 px, Clientes oscuro a 1440 px, formulario de Clientes con errores, Leads claro a 1440 px, Leads oscuro a 390 px y Leads Sistema a 768 px. Las capturas se generan con los scripts de pruebas, y `test-results` se renueva con cada ejecución.

Contraste computado con la fórmula WCAG y con texto de estilos efectivos dentro de las pruebas: mínimo de texto de los tokens revisados 4.99:1 en claro y 5.99:1 en oscuro; límites de controles activos de 3.43:1 y 3.75:1 respectivamente sobre las superficies revisadas. El borde de campo inválido oscuro, incluida su transparencia heredada, se calculó en 3.06:1. Los controles deshabilitados se distinguen por su estado y no entran en la comprobación de controles activos.

El viewport reducido y los targets se verificaron en el navegador local, sin afirmar una prueba con teclado físico de teléfono ni con un lector de pantalla real. Los escenarios SQL de producción permanecen fuera de esta fase visual.

Las capturas y registros de las pruebas contienen fixtures identificados explícitamente como datos de prueba. No son información ni evidencia de operaciones de producción.

## Corrección de ESLint y comprobaciones

`src/features/leads/lead-actions.tsx`: la fábrica `dialogProps` se reemplazó por props explícitas de los cuatro diálogos y un `restoreDialogFocus` memoizado con `useCallback`. El ref se consulta cuando Radix emite el evento de cierre, nunca durante render. Se conserva el retorno al menú y el fallback al botón Nuevo lead después de eliminar la fila. No se desactivó `react-hooks/refs` ni se añadieron comentarios `eslint-disable`.

En `directories-ui.spec.ts`, las tres comprobaciones de Nombres, Apellidos y Correo electrónico del cliente con datos largos usan ahora el rol textbox y su nombre accesible. El selector anterior incluía el asterisco visual de la etiqueta aunque está oculto para accesibilidad. Se conservan las comprobaciones exactas de los valores; no se alteró el formulario ni su validación para resolver el test.

## Inventario de archivos de esta fase

| Archivo | Estado | Motivo |
| --- | --- | --- |
| `src/features/clients/clients-view.tsx` | Modificado | Directorio, filtros, lista móvil, acciones y confirmación. |
| `src/features/clients/client-form.tsx` | Modificado | Formulario agrupado, estilos y cierre con foco. |
| `src/features/leads/leads-view.tsx` | Modificado | Directorio comercial, filtros y presentación móvil. |
| `src/features/leads/lead-form.tsx` | Modificado | Grupos de contacto, comercio y seguimiento. |
| `src/features/leads/lead-detail.tsx` | Modificado | Detalle agrupado y diálogo controlado. |
| `src/features/leads/lead-convert.tsx` | Modificado | Presentación de conversión y candidato existente. |
| `src/features/leads/lead-delete.tsx` | Modificado | Confirmación, errores y foco seguro. |
| `src/features/leads/lead-badges.tsx` | Modificado | Estados y prioridad con tokens semánticos. |
| `src/features/leads/lead-actions.tsx` | Nuevo | Menú de acciones y restauración de foco sin leer refs en render. |
| `src/components/crm/directory.tsx` | Nuevo | Encabezado, resumen, herramientas, filtros y estados compartidos. |
| `src/components/crm/directory.module.css` | Nuevo | Estilos locales responsive y adaptados al tema. |
| `src/app/(crm)/clientes/loading.tsx` | Nuevo | Carga del directorio. |
| `src/app/(crm)/leads/loading.tsx` | Modificado | Carga con el mismo patrón. |
| `tests/crm.spec.ts` | Modificado | Pruebas de Clientes adaptadas a los menús y recorrido de paginación. |
| `tests/leads.spec.ts` | Modificado | CRUD, conversión y permisos mediante los menús. |
| `tests/directories-ui.spec.ts` | Nuevo | Temas, responsive, teclado, contraste, datos largos y estados. |
| `tests/opportunities.spec.ts` | Modificado | Selector del menú que conserva el vínculo desde Clientes y Leads. |
| `tests/tasks.spec.ts` | Modificado | Selector del menú de creación de tarea relacionada. |
| `tests/themes.spec.ts` | Modificado | Comprobación geométrica del formulario en viewport corto. |
| `anti-slop/phase-2-clientes-leads-2026-10-07.md` | Nuevo | Decisiones, resultados, inventario y auditoría. |

## Delivery Gate final, revisado por el agente principal

### Hard Gate

- R-02 PASS: el texto añadido al alcance no contiene raya larga.
- R-03 PASS: las seis matrices no muestran overflow del documento en cinco anchos; texto largo y ampliado se verifican, con targets móviles de 44 px.
- R-17 PASS: todos los contadores proceden de las colecciones y cálculos existentes; los fixtures están confinados a tests.
- R-18 PASS: no se añadieron testimonios, personas de marketing ni fotografías ficticias.
- R-23 PASS: marca, fuentes e iconos existentes reutilizados; sin assets generados ni navegación inventada.
- R-24 PASS: destinos de tarea, oportunidad y cliente vinculado existentes; navegación de relaciones ejecutada.
- R-25 PASS: medición de texto efectivo y fórmula sobre tokens, error y límites de campo cumplen los umbrales indicados arriba.
- R-26 PASS: acciones de CRUD, conversión, filtros, paginación, menús y vínculos tienen comportamiento ejecutado en el recorrido registrado.
- R-27 PASS: ambos módulos tienen carga, vacío y error con reintento, probados en los tres modos.
- R-28 PASS: no se añadió un FAQ ni contenido de relleno.
- R-32 PASS: navegación por teclado, foco visible, trampa de diálogo, Escape y retorno de foco comprobados.
- R-33 PASS: cambios mediante patches explícitos en fuente; ningún script reescribe CSS o implementación.
- R-34 PASS: Claro, Oscuro y Sistema probados, incluidos campos, menús y portales.
- R-35 PASS: lint, build, 32 pruebas y recorrido de acciones registrados; avisos del entorno declarados sin ocultarlos.
- R-36 PASS: no se añadieron afirmaciones de seguridad, rendimiento, cumplimiento ni clientes de producción.
- R-37 PASS: dirección existente aplicada con ENERGY 1 / RHYTHM 2 / MOTION 1; sin redefinir `DESIGN.md`.
- R-38 PASS: aplicación usa los datos existentes y las pruebas identifican sus fixtures; sin información comercial inventada nueva.

### Purpose-Gate

- R-01 PASS: azul Nexo expresa acción y selección; estados semánticos acompañados de texto, sin gradientes nuevos.
- R-04 PASS: Lucide existente se reserva a buscar y acciones concretas, con motivos documentados arriba.
- R-06 PASS: Segoe UI existente y números tabulares sostienen lectura comercial y ampliación.
- R-07 PASS: canvas continuo para datos, sin patrones de fondo decorativos.
- R-08 PASS: flechas de paginación y conversión indican función; sin flechas ornamentales en cada botón.
- R-09 PASS: badges únicamente para estados reales, sin promociones ni cápsulas sobre el título.
- R-10 PASS: no se añadió glassmorphism ni desenfoque de superficies.
- R-12 PASS: sombra existente únicamente en menús y diálogos por superposición.
- R-13 PASS: sin glow nuevo en tablas, controles o fondos.
- R-14 PASS: métricas en línea y filas de contactos sustituyen las tarjetas repetidas.
- R-19 PASS: hover y apertura Radix existentes; skeleton estático, reduced-motion conservado e indicador solo mientras una operación está pendiente.
- R-22 PASS: no se añadieron ilustraciones genéricas.

### Liveliness

- Diales PASS: ENERGY 1 / RHYTHM 2 / MOTION 1 declarados antes de editar.
- Coherencia PASS: interfaz serena, ritmo de encabezado/herramientas/filas y movimiento para cambios de estado.
- Foco PASS: directorio y acción de creación predominan; métricas subordinadas en línea.
- Espacio PASS: separadores y grupos organizan los registros y campos, sin tarjetas anidadas.
- Acento PASS: azul Nexo en la acción principal y la selección; prioridad y estado tienen motivos semánticos.
- Motivo PASS: filas compactas, tipografía del sistema, iniciales existentes y números tabulares conectan los módulos con la base aprobada.
- Design Read PASS: directorios para equipos comerciales dentro de la identidad Nexo, registrado antes de implementar.

### Craftsmanship y Quality Locks

- C-1 PASS: decisiones de paleta, composición, radio, tipografía y espacio justificadas en este informe y `DESIGN.md`.
- C-2 PASS: acciones y enlaces comprobados en el recorrido registrado, con errores y cancelación visibles.
- C-3 PASS: Clientes prioriza cartera y contacto; Leads prioriza calificación, fuente y seguimiento.
- C-4 PASS: estados, temas, cinco anchos, texto al 200%, formularios con poca altura y teclado verificados dentro del alcance.
- C-5 PASS: contadores reales de las colecciones existentes y fixtures identificados, sin claims fabricados.
- R-05 PASS: composición por necesidades del directorio, sin bento, hero ni mosaico de tarjetas.
- R-11 PASS: controles de 6 px y diálogos/menús de 10 px; estados de 4 px, sin cápsulas generalizadas.
- R-15 PASS: Nuevo cliente, Nuevo lead, Editar, Convertir y Reintentar expresan acciones concretas.
- R-16 PASS: lenguaje operativo en español, sin términos de marketing añadidos.
- R-20 PASS: identidad Nexo y jerarquía comercial conservadas, con composición específica para cada módulo.
- R-21 PASS: provider y preferencia existentes intactos; Claro, Oscuro y Sistema funcionan.
- R-29 PASS: neutros y azul de marca; verde, ámbar y rojo acotados a estados reales.
- R-30 PASS: precisión visual de la dirección aprobada, sin trasladar marca o contenido de Attio.
- R-31 PASS: cada decisión principal tiene una razón escrita en este informe.

### Suplementos de las cuatro skills

- antislop PASS: modo resuelto, dirección previa, motivos y los cuatro bloques del gate revisados personalmente.
- antislop-ui PASS: paleta de la fuente visual, acento acotado, ritmo por función, estados reales, sin emoji decorativo, pills promocionales, cards anidadas ni contenido inventado.
- antislop-human PASS: texto y controles medidos, foco alto contraste, teclado y Escape, labels y semántica, estados perceptibles, ampliación y formulario con altura reducida.
- antislop-layoutmobile PASS: lista propia en móvil, estados de tablet/laptop/escritorio, campos apilados, targets de 44 px, ajustes de texto largo y cero overflow en los anchos probados.
