# Nexo CRM: interfaz de responsables reales, Fase 7C.2.3B

Fecha de cierre original: 2026-10-24. Comprobación final: 2026-10-27, America/Lima.

Estado: Fase 7C.2.3B completa dentro de su alcance local autorizado. Interfaz UUID preparada y validada mediante mocks, con activación operativa bloqueada. El apartado 6 distingue las pruebas ejecutadas de las pendientes de PostgreSQL.

Se retomó el estado existente, incluidos los componentes parcialmente implementados y los entregables de [7C.2.3](phase-7c23-client-responsibles-plan.md) y [7C.2.3A](phase-7c23a-backend-implementation.md). Se revisaron `AGENTS.md`, `DESIGN.md`, Git, contratos y servicios. Se mantuvo Anti Slop `during`, seleccionado expresamente en esta conversación, con las cuatro skills locales: core, UI, human y layoutmobile.

No se ejecutó SQL, no se abrió una conexión de escritura a Supabase, no se cambiaron datos reales, Auth, RLS, roles, permisos, `.env.local` ni cálculos comerciales. No se realizó commit, push ni despliegue. La Fase 7C.2.3C no se inició.

## 1. Archivos implementados y estado de Git

| Archivo | Preparación o cambio de esta interfaz |
| --- | --- |
| `src/features/clients/responsible-selector.tsx` | Selector UUID con búsqueda, estados, navegación por teclado y conservación de la asignación actual. |
| `src/features/clients/responsible-selector.module.css` | Presentación con tokens Nexo, ajuste de UUID largos, foco, objetivos táctiles y preferencias de accesibilidad. |
| `src/features/clients/responsible-presentation.ts` | Nombre disponible, estado del perfil, índice de búsqueda y elegibilidad según el contrato. |
| `src/features/clients/client-uuid-form.tsx` | Alta y edición preparadas mediante un adaptador explícito; no se conectó al Provider operativo. |
| `src/features/clients/responsibles-activation.ts` | Bloqueo de la API UUID y condición separada para la vista local de pruebas. |
| `src/features/clients/services/client-responsibles.service.ts` | Guard antes de cualquier acceso de red en lectura, alta y actualización UUID. Conserva los controles de 7C.2.3A. |
| `src/app/prueba-responsables-clientes/page.tsx` | Ruta dinámica que devuelve 404 si no cumple las condiciones locales de ensayo. |
| `src/app/prueba-responsables-clientes/preview.tsx` | Vista identificada como prueba local, adaptador de mocks y estados de contexto. |
| `src/app/(crm)/prueba-limite-error/page.tsx` | Conserva el probe de error local y ahora exige flag, Supabase loopback y Host loopback antes de renderizarlo. |
| `src/features/clients/client-form.tsx` | Flujo vigente compatible con el esquema anterior; responsable histórico de solo lectura. |
| `src/features/clients/client-validation.ts` | Validación de contacto reutilizable y conservación del texto histórico, sin `OWNERS` como lista autorizada. |
| `src/features/clients/services/clients.service.ts` | Alta anterior con texto `Sin asignar`; edición sin enviar `responsable` ni `responsable_id`. |
| `src/features/clients/clients-view.tsx` | Filtro histórico construido con los textos de los clientes cargados. |
| `src/app/(crm)/clientes/page.tsx` | Acepta el filtro histórico acotado sin validar contra nombres de demostración. |
| `playwright.config.ts` | Flag de vista local solo en el proceso E2E y Supabase simulado en loopback. |
| `tests/client-responsibles-ui.spec.ts` | Escenarios funcionales, históricos, permisos simulados, responsive, temas y accesibilidad. |
| `tests/support/client-responsibles-fixtures.ts` | Fixtures identificados de prueba, sin creación de usuarios Auth. |
| `tests/support/client-responsibles-mock.ts` | Directorio y guardados en memoria mediante interceptación del navegador. |
| `tests/support/client-responsibles-a11y.ts` | Comprobaciones de contraste calculado, foco, tamaños táctiles y overflow. |
| `tests/support/verify-client-responsibles-preview-closed.mjs` | Comprobación HTTP autenticada con ambos flags en `disabled`, en un proceso temporal ligado a loopback. |
| `tests/unit/client-responsibles-presentation.test.mjs` | Búsqueda, homónimos, elegibilidad y estados históricos. |
| `tests/unit/client-responsibles-activation.test.mjs` | Bloqueo UUID, condiciones de ensayo y compatibilidad de la validación anterior. |
| `anti-slop/phase-7c23b-clients-interface.md` | Este informe. |
| `anti-slop/phase-7c23b-evidence/` | Seis capturas de navegador y seis archivos JSON con mediciones de contraste de esta fase. |

Los contratos, mapeo dual, actualización condicionada, tipos Supabase, SQL y pruebas de la fase A se conservaron. Su presencia como archivos nuevos o modificados en Git no significa que se hayan recreado o aplicado en esta fase. Los informes anteriores se mantienen como evidencia de su momento; este documento registra el estado posterior de la interfaz.

`git status --short` al cierre confirma un árbol con cambios locales sin commit, tanto versionados como sin seguimiento. `git diff --cached --name-only` no devuelve archivos: no hay cambios preparados en el índice. Continúan los cambios preexistentes en las tres capturas `anti-slop/users-evidence/`, `anti-slop/settings-evidence/`, los informes y SQL previos y los archivos ajenos `tatus` y `e 5A rediseño premium del modulo Usuarios…`. No se hizo limpieza, restauración, movimiento ni incorporación al índice de ese trabajo. Los resultados generados por Playwright no se confunden con cambios funcionales de este alcance.

## 2. Componentes y comportamiento preparado

`ResponsibleSelector` usa el UUID completo como valor, clave y destino de selección. Muestra el nombre completo disponible, rol, actividad, diagnóstico de perfil incompleto y UUID completo. Los homónimos permanecen como filas distintas; no se resuelven por nombre ni se exponen correos para diferenciarlos.

La búsqueda normaliza acentos y mayúsculas y admite varias palabras sobre nombre, rol, estado y UUID. El índice se memoriza por directorio; la búsqueda considera todos los resultados y presenta hasta 100 filas con un aviso para refinarla. Ese límite reduce el DOM, sin afirmar un rendimiento medido con un directorio real de gran tamaño.

El combobox mantiene el foco en el campo y comunica la opción activa mediante `aria-activedescendant`. Incluye flechas, Home, End, Enter y Escape. Escape cierra primero los resultados; un Escape posterior permite cerrar el diálogo. La selección por puntero tiene el mismo control de elegibilidad. Las etiquetas, errores y ayudas están asociados; carga y resultados se anuncian con `status`, y errores con `alert`.

Se prepararon carga, directorio vacío, búsqueda sin coincidencias, perfiles no asignables, error con reintento y error de guardado. Los fallos no borran los campos. Un conflicto de versión mantiene el formulario y no reintenta automáticamente. Una edición que conserva la referencia actual puede guardar otros campos aunque el directorio no esté disponible.

| Actor activo | Comportamiento preparado |
| --- | --- |
| Administrador | Selección expresa de candidatos activos, completos y autorizados; vinculación o cambio de un cliente existente según el contrato. |
| Gerente | Misma regla de selección autorizada, sin usar el directorio administrativo de Usuarios. |
| Vendedor | En alta solo puede seleccionarse expresamente a sí mismo si es elegible. En edición conserva la asignación existente y no la cambia, tampoco de NULL a su propio UUID. |
| Actor inactivo o no válido | No obtiene selección habilitada. |

`can_assign` es una capacidad recibida que la UI combina con rol y elegibilidad. El frontend no concede permisos: la autorización efectiva de sesión, directorio y escritura deberá verificarse nuevamente en backend y PostgreSQL antes de cualquier activación.

## 3. Decisiones visuales y funcionales

Lectura de diseño: formulario comercial de Nexo para equipos de ventas, con identidad azul y lectura precisa, ENERGY 3 / RHYTHM 2 / MOTION 2, de acuerdo con la dirección CRM vigente de `DESIGN.md`.

| Decisión | Finalidad |
| --- | --- |
| Reutilizar diálogo, campos, tipografía del sistema y tokens existentes | Integrar la selección en el CRM y conservar Claro, Oscuro y Sistema. |
| Nombre principal seguido de rol, estado y UUID completo | Facilitar la lectura sin perder identificación inequívoca. |
| Bloques separados para asignación actual y nueva selección | Distinguir conservación histórica de una reasignación todavía no guardada. |
| Texto explícito `Inactivo`, `Perfil incompleto` y `No asignable` | Explicar el estado sin depender del color ni inventar identidades. |
| Azul en foco, selección y acción de guardado | Mantener el lenguaje de interacción de Nexo. |
| Radios y espacios de las primitivas existentes | Conservar jerarquía entre campo, lista y diálogo, sin añadir paneles decorativos. |
| Icono de búsqueda Lucide ya instalado | Indicar el propósito del único campo de búsqueda, sin incorporar otra biblioteca. |
| Filas y controles con mínimo de 44 px y UUID con ajuste de líneas | Facilitar interacción táctil y evitar desbordamiento desde 320 px. |
| Lista dentro del flujo del formulario desplazable | Evitar resultados fuera del diálogo al usar pantallas estrechas. |
| Transición breve de superficie, `reduced-motion` y `forced-colors` | Comunicar interacción respetando preferencias del sistema. |

Se mantuvo la composición del módulo. No se añadieron imágenes, avatares, métricas, responsables ficticios operativos ni navegación comercial nueva. Los fixtures solo aparecen en una vista rotulada de prueba.

## 4. Compatibilidad con el backend y protección del despliegue

El flujo operativo sigue usando `ClientFormDialog`, `ClientsProvider` y el servicio anterior. Lee `select('*')`, que consulta las columnas existentes sin nombrar `responsable_id`. El mapeo dual admite filas anteriores sin esa propiedad y las representa con `ownerId = null`.

El formulario vigente elimina las opciones de `OWNERS`. Las altas guardan expresamente el texto `Sin asignar`, sin enviar UUID ni depender de un default remoto no confirmado. La edición envía únicamente columnas de contacto y estado; omite tanto `responsable` como `responsable_id`. El filtro usa textos de registros visibles, con compatibilidad para el parámetro histórico `?responsable=`, sin convertirlo en una identidad UUID.

`CLIENT_RESPONSIBLES_UUID_ENABLED` es una constante de código con valor `false`. No existe un toggle de navegador, sesión o entorno que habilite el servicio real. `getClientResponsibles`, `createAssignedCliente` y `updateAssignedCliente` comprueban el bloqueo antes de obtener el cliente Supabase o consultar red, Profiles, la RPC o la columna nueva.

El formulario nuevo recibe `ClientResponsibleFormAdapter`. En esta etapa solo se usa con mocks. Para editar conserva el `updatedAt` original del cliente con el que se abrió el formulario y lo entrega como `expectedUpdatedAt`. Si no cambia de responsable, omite `responsableId`; una reasignación explícita entrega el UUID. El servicio preparado de fase A aplica `id` y `updated_at` como condiciones y trata cero filas como conflicto. La UI no sustituye ese token por una versión reciente de caché.

**Límite del flujo vigente:** la actualización anterior sigue filtrando por `id`, sin concurrencia optimista integrada. Esa protección está preparada en el formulario/adaptador UUID, todavía desconectado. No se afirma que todas las escrituras actuales de Clientes tengan ya control de versión.

### Rutas locales de prueba

La ruta usa `force-dynamic` y exige simultáneamente:

1. Flag servidor `NEXO_E2E_CLIENT_RESPONSIBLES=enabled`.
2. URL Supabase HTTP(S) con hostname exacto `localhost`, `127.0.0.1` o `[::1]`, sin credenciales, ruta adicional, query ni fragmento.
3. Host solicitado loopback exacto, validado con las mismas restricciones.

Si falta una condición responde mediante `notFound()`. Una URL Supabase remota bloquea la ruta aunque se configure el flag. No hay enlace en el CRM ni manejadores de escritura en `/__test/client-responsibles/*`: sus respuestas y guardados dependen exclusivamente de interceptaciones de Playwright, en memoria.

`/prueba-limite-error` conserva su finalidad de probar el límite de errores del layout CRM, pero ya no depende solo de `NEXO_E2E_ERROR_PROBE`. Reutiliza las mismas condiciones de loopback con su propio flag. Así, configurar accidentalmente el flag en un entorno con Supabase remoto o servir la petición con Host público no habilita el probe.

El smoke HTTP final compiló con ambos flags establecidos explícitamente como `disabled`, inició `next start` en el puerto 3101 y autenticó una sesión contra el Auth simulado local. `/prueba-responsables-clientes` respondió HTTP 404. La ruta anidada `/prueba-limite-error` presentó el contenido `not-found` sin montar el probe ni exponer su cadena secreta. Su estado HTTP fue 200 porque Next ya había iniciado la respuesta del layout en streaming antes de procesar `notFound()`; este comportamiento está documentado por Next para respuestas transmitidas. La inaccesibilidad se acredita por el contenido de página inexistente y la ausencia del componente de prueba, no atribuyéndole un 404 que no emitió. Con el flag local habilitado, la ruta UUID también rechazó un Host público con 404. Todas estas comprobaciones usaron loopback y mocks, sin consultar producción.

El ensayo E2E ejecuta un build de producción local con esos valores explícitos y `next start --hostname 127.0.0.1`; por ello `NODE_ENV=production` por sí solo no identifica un despliegue remoto ni bloquea este ensayo. El build ordinario no incluye el flag de prueba. El encabezado Host no es una frontera de red confiable: no debe publicarse el servidor de ensayo ni usarse este guard como autorización para desplegarlo. Mantener el flag fuera de producción y el servidor de mocks ligado a loopback forma parte de las condiciones de operación.

No se incorporó una función privilegiada, una lectura global de Profiles ni un uso nuevo de `service_role` desde navegador. El directorio mínimo previsto sigue siendo la RPC y la vista privada preparadas en fase A, todavía sin ejecutar ni acreditar en PostgreSQL.

## 5. Protección de la historia y casos especiales

| Caso | Conservación preparada |
| --- | --- |
| Ana García, UUID NULL | Muestra `Ana García` y `Pendiente de vincular`; no preselecciona a nadie. Editar contacto omite ambos campos de responsable. |
| Otro texto histórico | Se conserva exactamente; la normalización de contacto no aplica `trim()` al texto histórico. |
| Perfil inactivo vinculado | Muestra su identidad y estado; permite conservar la referencia sin ofrecerla para una nueva asignación. |
| Perfil incompleto vinculado | Conserva UUID, muestra las partes disponibles del nombre y el diagnóstico. No exige reasignar para editar contacto. |
| Perfil totalmente sin nombre | Muestra `Perfil sin nombre`, UUID y `Perfil incompleto`; no inventa un nombre. |
| Detalle UUID no disponible | Conserva la referencia y el texto; no deduce inactividad ni borra el vínculo por un error de lectura. |
| Homónimos | Selección y payload por UUID completo, sin vinculación automática por coincidencia nominal. |
| Cambio elegido pero cancelado | `Conservar asignación actual` restaura el UUID anterior o NULL antes de guardar. |

El texto histórico no se reenvía desde el formulario UUID. El SQL de fase A prepara su inmutabilidad en actualizaciones y el nombre inicial validado del alta vinculada. Son defensas propuestas, sin confirmación de ejecución. No se tocó el cliente real de Ana García; las comprobaciones locales usan fixtures separados.

## 6. Pruebas ejecutadas y pendientes

| Comprobación local ejecutada en este cierre | Resultado acreditado |
| --- | --- |
| `npm run lint` | PASS. |
| `npm run typecheck` | PASS, tipos de rutas y TypeScript. |
| `npm run build` | PASS previo con Next 16.3.6/Turbopack. En la comprobación final también aprobó `npm run build -- --webpack` con Auth local y ambos flags explícitamente `disabled`. |
| `npm run test:unit` | PASS, 62 pruebas, incluidos los 47 casos backend previos y los nuevos de interfaz/activación. |
| Playwright, interfaz UUID | PASS, 21 escenarios de interfaz en Chromium/Edge con mocks locales. |
| Playwright, regresión comercial | PASS, 71 casos adicionales. Ejecución final conjunta: 92 aprobados, cero fallos, 8.7 minutos. |
| `npm run test:e2e -- tests/error-boundary.spec.ts --max-failures=1` | PASS, 2 regresiones: ocultación del error, recuperación, temas, reflow, zoom, teclado y navegación segura. |
| `node tests/support/verify-client-responsibles-preview-closed.mjs` | PASS: sesión simulada reconocida; responsables HTTP 404; error-probe con contenido not-found, sin montar el probe ni exponer su secreto. |
| `git diff --check` | PASS, sin errores de whitespace en archivos versionados; revisión adicional de 20 archivos nuevos de código/documentación sin espacios finales. |
| PostgreSQL/RLS real | NO EJECUTADO. No se ejecutó SQL ni se acreditó una base aislada autorizada. |

La suite de interfaz preparada verifica alta con elección expresa, edición por Administrador/Gerente, restricciones de Vendedor, homónimos, perfiles incompletos e inactivos, Ana García, conservación sin directorio, carga, vacío, búsqueda, error/reintento, rechazo de autorización y conflicto. La regresión del flujo operativo comprueba que no consulta el directorio UUID ni envía columnas nuevas y que conserva el texto histórico en PATCH.

La regresión aprobada incluye CRUD de Clientes, filtros, temas y estados de Clientes/Leads, conversión simulada de Leads, Oportunidades, Ventas, cálculos exactos, Reportes/CSV y Tareas con relaciones comerciales. El recorrido de peticiones por módulo también aprobó con datos simulados; no se usa esa medición como promesa de rendimiento remoto. El resultado final de Playwright registra `status: passed` y `failedTests: []`.

Las ejecuciones emitieron avisos no bloqueantes: Next ignora un `package-lock.json` fuera del repositorio; Node detecta sintaxis ESM en los módulos TypeScript importados por las pruebas unitarias; el navegador informa la preferencia de color de consola. No se alteraron la configuración de raíces, el tipo global del paquete ni archivos externos para silenciarlos.

Las pruebas visuales ejecutadas recorren Claro, Oscuro y Sistema, anchos 320/640/900/1280 px, texto al 200%, navegación de teclado, foco y retorno al disparador, cierre progresivo con Escape, objetivos táctiles de al menos 44 × 44 px a 320 px, cálculo de contraste del texto y bordes y ausencia de errores de página. Sistema se comprobó siguiendo cambios del sistema de oscuro a claro. Se conservaron capturas a 320 y 1280 px y los JSON de medición en [phase-7c23b-evidence](phase-7c23b-evidence/). La ejecución con navegador local y mocks no representa datos remotos ni una certificación integral de accesibilidad.

| Tema medido | Pares de texto | Contraste mínimo de texto | Contraste mínimo del borde de campo |
| --- | --- | --- | --- |
| Claro | 47 | 4.90:1 | 3.85:1 |
| Oscuro | 47 | 5.62:1 | 4.54:1 |
| Sistema, preferencia oscura | 47 | 5.62:1 | 4.54:1 |

Son mediciones del DOM y colores compuestos de los estados capturados, calculadas con luminancia relativa WCAG. El foco del combobox se comprobó además con ancho mínimo de 2 px y contraste mínimo de 3:1. Las capturas muestran el diálogo desplazado hasta el selector, por lo que el encabezado puede quedar fuera del área visible; no son capturas de un formulario completo sin desplazamiento.

Durante la validación se corrigió un defecto real: Radix podía consumir Escape y cerrar el diálogo antes de que el combobox cerrara los resultados. `onEscapeKeyDown` evita ese cierre cuando la lista está expandida; las pruebas verifican ambos pasos de Escape. También se acotaron los localizadores de opciones al listbox para no contar las opciones del selector nativo de Estado. La ejecución posterior de los 21 escenarios aprobó.

La comprobación final del 27 de octubre detectó otro defecto antes del PASS: `/prueba-limite-error` solo comprobaba su flag y podía renderizarse si una configuración local heredada lo dejaba en `enabled`. Se añadió el guard de URL Supabase y Host loopback. La primera expectativa de HTTP 404 para esa ruta anidada tampoco era válida bajo streaming de Next; se sustituyó por la comprobación de contenido `not-found` y ausencia del probe. Tras esos cambios aprobaron las dos regresiones de error y el smoke autenticado de ambas rutas. Los intentos previos fallidos no se presentan como aprobados.

Comandos de reproducción: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:unit` y `npm run test:e2e -- tests/client-responsibles-ui.spec.ts tests/crm.spec.ts tests/directories-ui.spec.ts tests/leads.spec.ts tests/opportunities.spec.ts tests/sales.spec.ts tests/reports.spec.ts tests/tasks.spec.ts tests/performance.spec.ts`. La regresión puntual final fue `npm run test:e2e -- tests/error-boundary.spec.ts --max-failures=1`. El smoke HTTP requiere un build local con ambos flags `disabled` y el Auth simulado en 54321; se ejecuta mientras está disponible ese servidor, sin resetearlo. El script fija explícitamente los flags deshabilitados, se detiene si falta Auth y nunca intenta una URL remota.

Pendientes que no se sustituyen por mocks ni por inspección de código:

- Compilación y ejecución de los dos SQL funcionales y de `supabase/tests/client_responsibles.sql` en una base aislada expresamente autorizada.
- Autorización real por cada rol, RLS por fila, grants/owners, esquemas expuestos y llamada directa al núcleo privado de conversión.
- Carreras entre sesiones: cambios de actividad/nombre, dos conversiones simultáneas y actualizaciones condicionadas tras bloqueo.
- Contrato HTTP/PostgREST y RPC real, sesión caducada, rollback y comparación de históricos antes/después.
- Recorrido de integración con el esquema desplegado de ensayo en Clientes, Leads, Oportunidades, Ventas/cálculos, Reportes/CSV, Resumen y Tareas. La regresión mock no acredita esa integración.
- Ensayo con lector de pantalla y teclado virtual en dispositivo físico. Texto al 200% mediante tamaño raíz y viewports de navegador no equivalen a todos los zooms y dispositivos.

### Delivery Gate Anti Slop

Revisión de cierre ejecutada por el agente principal, aplicada a los componentes locales de esta fase. Las evidencias son el código, las pruebas de navegador ejecutadas y las capturas inspeccionadas en Claro/Oscuro a 320 y 1280 px. Este PASS de interfaz local no acredita PostgreSQL ni autoriza producción.

| Hard Gate | Resultado y evidencia |
| --- | --- |
| R-02 | PASS: copia nueva sin raya larga decorativa; revisión de selector, diálogo y preview. |
| R-03 | PASS: sin overflow horizontal a 320/640/900/1280 px y texto al 200%; capturas de móvil y escritorio. |
| R-17 | PASS: no se añadieron estadísticas ni cifras comerciales. |
| R-18 | PASS: sin testimonios, avatares ni cargos inventados como prueba social. |
| R-23 | PASS: sin imágenes, marcas o navegación nueva; fixtures limitados a pruebas rotuladas y autorizadas. |
| R-24 | PASS: la interfaz nueva no añade enlaces de navegación; las acciones de diálogo y tema tienen destino funcional. |
| R-25 | PASS: mínimos medidos 4.90:1 en texto y 3.85:1 en bordes; JSON conservados. |
| R-26 | PASS: alta, edición, cancelar, cerrar, reabrir, seleccionar, conservar, reintentar y cambiar tema ejecutados en navegador. |
| R-27 | PASS: carga retenida, directorio vacío, sin coincidencias, fallo/reintento y rechazo/conflicto comprobados. |
| R-28 | PASS: no existe FAQ ni contenido de relleno en el formulario. |
| R-32 | PASS: flecha abajo, End, Enter, Tab y Escape; foco visible y retorno al disparador comprobados. |
| R-33 | PASS: comportamiento escrito en los componentes y estilos de origen; sin parches externos al DOM del producto. |
| R-34 | PASS: Claro, Oscuro y Sistema ejecutados, incluidos cambios de preferencia del sistema. |
| R-35 | PASS: build y recorrido funcional de los 21 casos de interfaz; capturas y verificaciones de consola. |
| R-36 | PASS: resultados locales diferenciados expresamente de PostgreSQL/RLS no ejecutados. |
| R-37 | PASS: lectura de `DESIGN.md`, ENERGY 3 / RHYTHM 2 / MOTION 2 y razones registradas. |
| R-38 | PASS: datos de ensayo identificados como mocks; no se ofrecen nombres demo como responsables operativos. |

| Purpose-Gate | Resultado y evidencia |
| --- | --- |
| R-01 | PASS: selector sin gradientes o halos; el azul identifica foco y selección. |
| R-04 | PASS: lupa Lucide existente para búsqueda; iconos de tema existentes para Claro/Oscuro/Sistema. |
| R-06 | PASS: tipografía de sistema del CRM; UUID con cifras tabulares para comparación, sin titular monoespaciado. |
| R-07 | PASS: sin retículas ni patrones de fondo nuevos. |
| R-08 | PASS: botones con verbo de acción, sin flechas decorativas. |
| R-09 | PASS: estados en texto legible; sin cápsulas promocionales. |
| R-10 | PASS: se conserva solo la superposición del diálogo existente; el selector usa superficies opacas. |
| R-12 | PASS: elevación reservada al diálogo existente; filas y campos sin sombras añadidas. |
| R-13 | PASS: sin glow nuevo en campos, opciones o estados. |
| R-14 | PASS: filas de personas dimensionadas por nombre, estado y UUID; sin tarjetas de características. |
| R-19 | PASS: transición de opción de 120 ms para señalar interacción; `reduced-motion` la elimina. |
| R-22 | PASS: sin ilustraciones ni recursos visuales generados. |

| Liveliness | Resultado y evidencia |
| --- | --- |
| Diales explícitos | PASS: ENERGY 3 / RHYTHM 2 / MOTION 2, conforme a la dirección comercial existente. |
| Coherencia con diales | PASS: jerarquía de formulario y microinteracciones discretas, sin animación continua. |
| Foco de pantalla | PASS: identidad actual y decisión de responsable en el bloque comercial; captura con foco visible en búsqueda. |
| Espacio estructural | PASS: grupos de identificación, contacto y relación; separación entre referencia actual y candidatos. |
| Acento deliberado | PASS: azul de Nexo en foco, selección y guardar; superficies neutras. |
| Motivo de identidad | PASS: se conservan bordes, tipografía, azul y jerarquía de campos del CRM. |
| Lectura previa | PASS: dirección y finalidad documentadas antes del cierre, sin rediseñar otros módulos. |

| Craftsmanship y Quality Locks | Resultado y evidencia |
| --- | --- |
| C-1 | PASS: decisiones de color, texto, espaciado y UUID justificadas en el apartado 3. |
| C-2 | PASS: todos los controles nuevos tienen conducta comprobada; preview rotulado y aislado. |
| C-3 | PASS: campos de contacto y asignación responden al trabajo de Clientes, sin secciones promocionales. |
| C-4 | PASS: estados, temas, viewports y teclado de la matriz local ejercitados; límites de dispositivo físico declarados. |
| C-5 | PASS: evidencias de navegador y mocks separadas de resultados reales de base de datos. |
| R-05 | PASS: composición de formulario comercial, con grupos y filas; sin plantilla de landing. |
| R-11 | PASS: radios de campo, opción y diálogo conservan la escala existente; sin formas de píldora generalizadas. |
| R-15 | PASS: acciones concretas `Guardar cliente`, `Guardar cambios`, `Cancelar` y `Conservar asignación actual`. |
| R-16 | PASS: mensajes operativos en español, sin reclamos de marketing. |
| R-20 | PASS: referencia histórica, estado de perfil y UUID ordenan una decisión específica del CRM. |
| R-21 | PASS: tres temas disponibles y probados; no se impone Oscuro. |
| R-29 | PASS: tokens existentes, azul de interacción y color semántico de error. |
| R-30 | PASS: se prolongan los componentes Nexo existentes, sin copiar otra composición de producto. |
| R-31 | PASS: cada decisión principal tiene finalidad escrita en el apartado 3. |

Los suplementos UI/human/layoutmobile se aplicaron a los mismos controles: texto de estado además del color, límites visibles, foco, reflujo, objetivos táctiles y ausencia de funciones exclusivas de hover. La comprobación física de teclado virtual y lector de pantalla sigue en la lista de pendientes; no se presenta como ejecutada.

## 7. Riesgos conocidos

1. **Backend sin validación PostgreSQL.** Los permisos simulados y pruebas TypeScript no demuestran que los triggers, directorio o conversión resistan escrituras reales. Bloquea activar UUID.
2. **Activación incompleta.** Cambiar una constante no es un procedimiento de despliegue. Aún deben conectarse el adaptador y la lectura dual real después de acreditar el contrato completo.
3. **Interfaz vigente intencionalmente transitoria.** Guarda altas pendientes y conserva texto. Los filtros y agrupaciones comerciales siguen teniendo semántica histórica; todavía no proporcionan agrupación general por identidad UUID.
4. **Concurrencia anterior.** El flujo vigente no se presenta como optimista; esa garantía solo corresponde al contrato preparado y a su futura integración verificada.
5. **SQL y catálogo real.** No se han acreditado owners, grants, `FORCE RLS`, esquemas API ni coincidencia de políticas de producción con el repositorio.
6. **Servidor de ensayo.** Debe permanecer ligado a loopback y con ambos flags fuera de producción o en un valor distinto de `enabled`. Los guards también exigen URL Supabase y Host loopback; aun así, no sustituyen el aislamiento de red del entorno E2E.
7. **Escala y accesibilidad real.** No se ha medido un directorio remoto grande ni probado todos los navegadores, lectores y teclados móviles. El límite visible de búsqueda no es una paginación de servidor.
8. **Historia frente a identidad actual.** Tras una futura reasignación, el texto puede diferir del usuario UUID. El rollback debe conservar lectura dual; no conviene volver a una versión que confunda ambos datos.

## 8. Condiciones para activar y siguiente paso

La activación permanece deshabilitada. Esta fase no autoriza migraciones ni comienza la Fase 7C.2.3C. Para preparar el siguiente ensayo se requiere:

1. Revisar este diff local junto con los SQL y el informe de fase A, sin aplicar simultáneamente el SQL estructural anterior y los archivos funcionales que lo sustituyen.
2. Autorizar expresamente una base PostgreSQL aislada y las escrituras de ensayo. Identificar versión, catálogo, políticas, grants, owners, Auth de prueba y perfiles existentes requeridos por la suite; no crear cuentas ficticias para lograr un PASS.
3. Solo en esa etapa autorizada, aplicar primero `supabase/client_responsibles.sql`, después `supabase/client_responsibles_directory.sql` y ejecutar la suite SQL con sus guards. Registrar resultados reales y escenarios multisesión, sin retirar los controles de entorno por comodidad.
4. Comprobar que los históricos siguen con texto exacto y NULL y que la conversión conserva idempotencia, visibilidad y clientes existentes. Verificar que Ana García no obtiene una vinculación automática.
5. Acreditar la matriz de roles, capacidades del directorio y rechazo de UUID inexistentes/inactivos/incompletos o no autorizados mediante la API real.
6. Con autorización posterior de integración, conectar el adaptador al servicio y al Provider, conservar el `updated_at` original y preparar lecturas/filtros por UUID con semántica histórica explícita. Repetir la regresión comercial y visual contra ese entorno aislado.
7. Revisar entonces el cambio de código que habilita UUID. Excluir ambos flags de ensayo de cualquier configuración remota y verificar que ninguna ruta monte su contenido de prueba en el build candidato con configuración ordinaria.
8. Definir una versión recuperable con lectura dual y pruebas de rollback antes de solicitar por separado cualquier aprobación de producción. No se realiza aquí ese despliegue.

Fase 7C.2.3B completa localmente: selector UUID accesible y responsive, formulario con adaptador, presentación de estados, preservación histórica y barreras de activación. Lint, typecheck, builds, 62 unitarias, 92 casos Playwright previos, 2 regresiones puntuales de la ruta de error y el smoke de ambas rutas aprobaron. Deshabilitado: directorio y escritura UUID operativos. Pendiente antes de producción: PostgreSQL/RLS aislados, concurrencia real, integración autenticada y autorización posterior de activación y despliegue. Se detiene aquí esta etapa.
