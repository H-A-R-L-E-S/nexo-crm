# Fase 6B · Reportes y analítica comercial

Fecha de implementación: 2026-10-15. Cierre y verificación de regresión: 2026-10-16 (America/Lima).

## Objetivo y alcance

Se habilitó `/reportes` como centro comercial funcional, limitado a los registros que la sesión autenticada ya puede leer mediante Supabase y sus políticas RLS. No se modificaron Auth, middleware, roles, RLS, SQL, esquema, contratos comerciales ni módulos existentes. Los archivos sin seguimiento `anti-slop/settings-evidence/`, `e 5A rediseño premium del modulo Usuarios` y `tatus` ya existían y no se tocaron.

## Arquitectura

- La ruta protegida reutiliza `requireProfile` y el App Router actual.
- El cliente reutiliza los cinco servicios existentes. Cada uno pagina sus consultas y opera con la clave pública y la sesión; no existe service role en el navegador.
- `metrics.ts` contiene cálculos puros y comprobables. El período se interpreta en `America/Lima` y el dinero usa centavos con `BigInt` y las utilidades comerciales existentes.
- No se agregó una dependencia de gráficas. Las distribuciones son barras HTML/CSS, con tabla equivalente para tecnología asistiva.
- Las cinco fuentes se cargan de forma concurrente. `Promise.allSettled` permite un estado parcial visible si una fuente falla.

## Indicadores y definición

| Indicador | Fuente | Definición |
| --- | --- | --- |
| Clientes totales / activos / prospectos | `clientes` | Conteo global visible por estado. No se presenta como filtrado. |
| Altas de clientes | `clientes.created_at` | Registros creados dentro del período Lima. |
| Leads registrados | `leads.created_at` | Leads creados dentro del período. |
| Leads convertidos | `leads.estado`, `convertido_cliente_id` | Estado Convertido con cliente relacionado. |
| Pipeline abierto | `oportunidades.valor`, `etapa`, `created_at` | Suma exacta de oportunidades del período no Ganada/Perdida. |
| Valor ponderado | `valor × probabilidad` | Centavos por probabilidad, redondeados al céntimo; solo pipeline abierto. |
| Ganadas / perdidas | `oportunidades.etapa` | Conteo de oportunidades creadas en el período por etapa final. |
| Ventas registradas | `ventas.fecha_venta`, `estado`, `total` | Venta no cancelada cuya fecha de venta cae en el período. |
| Importe cobrado | `ventas.fecha_pago`, `estado`, `total` | Solo ventas Pagada, agrupadas por fecha de pago. No equivale a ventas registradas. |
| Importe pendiente | `ventas.fecha_venta`, `estado`, `total` | Solo ventas Pendiente registradas en el período. |
| Tareas abiertas / vencidas / próximas | `tareas.estado`, `fecha_vencimiento` | Pendiente o En progreso; vencida antes de hoy Lima, próxima desde hoy. |
| Tareas completadas | `tareas.completada_at` | Estado Completada cuya fecha de conclusión cae en el período. |

Los denominadores porcentuales no se exponen en esta primera entrega; se evita así presentar tasas ambiguas o dividir entre cero. La moneda es PEN y el formato visible es `S/` con dos decimales.

## Interfaz y exportación

- Resumen ejecutivo, indicadores compactos, distribuciones por estado y lectura operativa.
- Períodos: mes actual, mes anterior, últimos tres meses y año actual.
- Loading sin ceros provisionales, vacío, sin datos, error parcial y reintento.
- CSV UTF-8 con BOM, cabeceras, período explícito y neutralización de celdas que empiecen por `=`, `+`, `-` o `@`. El archivo contiene únicamente el resumen visible y autorizado; no se presenta como Excel.
- Sidebar actualizado solo después de habilitar y probar la ruta.

## Responsive, temas y accesibilidad

- Estados reales para móvil, tablet y desktop: una, dos y cuatro/seis columnas según contenido.
- Controles de al menos 44 px en móvil, sin scroll horizontal a 320 px en la prueba automatizada.
- Tokens del sistema para Claro/Oscuro/Sistema; sin colores de texto fijos en las gráficas.
- H1/H2 semánticos, labels, regiones, alertas, estado anunciado, alternativa tabular para barras y foco global existente.
- El motion system existente gobierna transiciones. El skeleton y las barras se detienen con `prefers-reduced-motion`.

## Archivos modificados

- `src/components/layout/sidebar.tsx`
- `src/app/(crm)/reportes/page.tsx`
- `src/app/(crm)/reportes/loading.tsx`
- `src/features/reports/metrics.ts`
- `src/features/reports/reports-view.tsx`
- `src/features/reports/reports.module.css`
- `tests/reports.spec.ts`
- `playwright.config.ts`
- `tests/support/start-e2e.mjs`
- `tests/login-bootstrap.spec.ts`
- `tests/overview-ui.spec.ts`
- `tests/themes.spec.ts`
- Este informe.

`DESIGN.md` no se actualizó: no se introdujo un patrón reutilizable fuera de Reportes.

El cierre modificó nueve archivos: `playwright.config.ts`, `tests/support/start-e2e.mjs`, `tests/login-bootstrap.spec.ts`, `tests/overview-ui.spec.ts`, `tests/themes.spec.ts`, `tests/reports.spec.ts`, `src/features/reports/reports-view.tsx`, `src/features/reports/reports.module.css` y este informe. El sidebar, las dos entradas de ruta y `metrics.ts` ya pertenecían a la implementación previa y se conservaron. No hay cambios de este cierre en Supabase, RLS, Auth, permisos, contratos ni cálculos comerciales.

Las capturas de Usuarios regeneradas por la suite se restauraron a sus versiones iniciales. Las tres capturas preexistentes de Configuración se respaldaron antes de la ejecución y se restauraron después, verificando igualdad SHA-256. Los archivos extraños preexistentes se conservaron. No se ejecutó commit ni push.

## Pruebas ejecutadas

- `npm run lint`: PASS, ejecutado nuevamente con el código final, salida 0.
- `npm run typecheck`: PASS, ejecutado nuevamente con el código final, salida 0.
- `npx playwright test tests/reports.spec.ts --reporter=list,json`: 7 PASS, 0 FAIL, 0 omitidas y 0 inestables. Incluye los tres casos originales y cuatro casos nuevos de semántica, temas, reflow, contraste, zoom, teclado y estados. Resultado local: `artifacts/reports-close/reports-final.json`.
- Los tres casos originalmente fallidos ya pasaron al ejecutarse contra el servidor estable; la regresión nueva del arranque también pasó. La última ejecución afectada previa al ajuste final tuvo 5 PASS y tres fallos del nuevo control de texto ampliado; esos tres fallos están resueltos en la ejecución de Reportes descrita arriba.
- Estabilidad de Claro/Oscuro/Sistema: 9 PASS, 0 FAIL, 0 omitidas y 0 inestables (`--repeat-each=3`, todas las ejecuciones deben pasar, sin reintentos). Resultado: `artifacts/reports-close/reports-stability.json`.
- Suite completa final: **129 PASS, 0 FAIL, 0 omitidas, 0 inestables**, salida 0, duración 588,05 s (9 min 48 s). Comando: `npx playwright test --reporter=list,json`; resultado local: `artifacts/reports-close/full-suite.json`. Incluye los tres casos originalmente fallidos y las siete pruebas de Reportes.
- `npm run build`: PASS, salida 0, build independiente con Next.js 16.3.6/Turbopack después de la suite completa. `/reportes` aparece como ruta dinámica. El build webpack del servidor E2E también completó correctamente.

La primera ejecución general del cierre tuvo 128 PASS y 1 FAIL sobre 129 casos. Los tres fallos originales ya habían pasado; el único fallo nuevo fue el reloj de la prueba de accesibilidad, descrito abajo. Se conserva esa ejecución intermedia en `artifacts/reports-close/full-suite-before-clock-fix.json`; la ejecución final anterior es la referencia de cierre.

Observaciones de salida, sin ocultarlas: Next.js mantiene el aviso preexistente sobre un `package-lock.json` ubicado fuera del repositorio. Durante la suite, el servidor también registró `The destination stream closed early` alrededor del caso móvil de Auth; ese caso y los demás pasaron, sin errores cliente en los casos de Reportes. No se alteró autenticación para suprimir el mensaje. La validación E2E se limita al proyecto Chromium/Edge configurado y a los mocks locales; no certifica políticas RLS contra una base de producción.

Histórico: la entrega inicial tenía 121 PASS y 3 FAIL sobre 124 casos. El cierre conserva los 124 casos y agrega una regresión de arranque y cuatro pruebas de accesibilidad/estados, sin borrar pruebas ni introducir reintentos o esperas artificiales.

## Reproducción y correcciones del cierre

1. Los casos de Resumen y temas se reprodujeron con el código original: ambos agotaban la espera buscando `Calendario Pronto`. Las mismas rutas ya tienen enlaces activos. Se reemplazó la expectativa del modal por comprobaciones de `href`, URL, H1, `aria-current`, regreso a Resumen y persistencia del tema. Resumen verifica también Enter y foco visible. Ayuda conserva su diálogo y Escape; continúan las comprobaciones previas de edición, filtros, búsqueda y notificaciones.
2. El caso oscuro de Oportunidades pasó al volver a ejecutarlo: el fallo anterior era intermitente. Se inspeccionó su trace original, preservado en `artifacts/reports-close/prior-opportunities-trace.zip` (SHA-256 `7916915EB6CC969BF1F5968A8CCF52F9CC85BE04E7D491A008233D75CD9ABF33`). La lámpara y el selector de tema permanecían deshabilitados simultáneamente, sin inicio del código cliente. El runtime webpack tenía estado HTTP 200 pero solo 31 bytes de transferencia comprimida, frente a 28 784 y 28 786 bytes en los traces que sí arrancaron. El cuerpo JavaScript no está almacenado, por lo que el trace demuestra el fallo de arranque y la transferencia anómala, pero no el mecanismo exacto de truncado.
3. Una reproducción controlada contra `next dev` sirvió un runtime vacío: reprodujo ambos controles deshabilitados y el formulario `inert`. Al restaurar el recurso y recargar, ambos controles se habilitaron y la animación abrió el acceso. Se corrigió la infraestructura de pruebas para compilar con webpack y ejecutar `next start` con el mismo entorno local de mocks. Esto elimina las recompilaciones durante E2E, siguiendo la guía instalada de Next.js sobre Playwright. No se modificó el login, su animación, sus temporizadores, el helper de autenticación ni los timeouts de las pruebas.
4. Se agregó una regresión de arranque que comprueba respuestas JavaScript no vacías, ausencia de errores cliente, disponibilidad de lámpara/apariencia y apertura animada en tres entradas al login.
5. La revisión de accesibilidad encontró identificadores con espacios usados por `aria-labelledby` en las distribuciones: se sustituyeron por `useId`. La prueba del 200 % también reprodujo desbordamiento por el ancho mínimo del selector y de las barras; se ajustaron únicamente la adaptación del control, el reflujo de las filas y el ajuste del texto. Una tabla con `sr-only` aplicada directamente conservaba un ancho intrínseco de 359 px y extendía el documento de 390 a 463 px; ahora la clase se aplica a su contenedor y se conserva la tabla accesible. También se permite ajustar encabezados largos. No se cambiaron métricas ni cálculos.
6. La primera suite general del cierre detectó React 418 en el caso nuevo de tema Sistema. El trace sitúa el error durante `clockSetFixedTime`, antes de la navegación a `/reportes`, mientras el Resumen aún se hidrataba. La fuente instalada de Playwright (`node_modules/playwright-core/lib/coreBundle.js`, método `setFixedTime` e inyección `ClockController`) instala el reloj con valor epoch 0 antes de aplicar asincrónicamente la fecha solicitada. Se retiró ese reloj innecesario del test de accesibilidad, conservando todas las aserciones y la captura de errores. Las pruebas puras de cálculos siguen recibiendo su fecha explícita. Evidencia local: `artifacts/reports-close/reports-clock-diagnosis.json` y `reports-system-clock-trace.zip`. No se modificó el Resumen ni la autenticación.

La configuración de diagnóstico limitó temporalmente cada acción a 20 segundos para reproducir los selectores obsoletos. Esa configuración y el test de diagnóstico del runtime vacío se retiraron al terminar; las pruebas permanentes conservan sus límites originales.

## Auditoría Anti Slop

Se aplicaron las cuatro skills instaladas durante el cierre. Alcance de la auditoría: Reportes, los enlaces activados y la presentación del login en las pruebas afectadas. Se conserva la dirección vigente de `DESIGN.md`: ENERGY 3 / RHYTHM 2 / MOTION 2 en CRM. No se introdujeron assets ni un rediseño.

Razones de diseño conservadas: el azul identifica Nexo y las barras comparan cantidades con etiquetas, sin depender del color; Segoe UI mantiene legibilidad y continuidad con el CRM; los importes del resumen se agrupan para distinguir cobros, pipeline y deuda; los conteos secundarios ocupan una franja compacta. Las superficies y gradientes separan el resumen financiero del desglose, y el espacio relaciona cada dato con su definición. Los iconos Descargar y Reintentar representan acciones existentes. El skeleton señala una consulta en curso y cesa al resolverla; las transiciones usan el sistema vigente y respetan movimiento reducido.

### Delivery Gate del cierre

| Regla | Resultado y evidencia |
| --- | --- |
| R-02 | PASS: revisión del texto de Reportes y del cierre sin guiones largos. |
| R-03 | PASS: pruebas a 320, 390, 640, 768, 1024 y 1440 px; a 390 px con texto al 200 %, sin overflow ni texto recortado. |
| R-17 | PASS: las cifras conservan las fuentes de los cinco servicios existentes; fixtures explícitos exclusivamente en pruebas. |
| R-18 | PASS: no hay testimonios ni identidades ficticias añadidas al producto. |
| R-23 | PASS: no se crearon assets visuales ni destinos nuevos en este cierre. |
| R-24 | PASS: Calendario y Reportes navegan a sus rutas funcionales; H1 y enlace activo comprobados. |
| R-25 | PASS: parejas de tokens usadas por texto, superficies, extremos de gradientes, barras, bordes y foco medidas con la fórmula WCAG. Mínimos: Claro 5,03:1 texto y 3,21:1 no textual; Oscuro 7,30:1 y 4,43:1. |
| R-26 | PASS: filtro cambia el período, CSV inicia descarga y Reintentar recupera una fuente fallida. |
| R-27 | PASS: carga anunciada sin cifras, error parcial, reintento y vacío con CSV deshabilitado ejercitados con mocks. |
| R-28 | PASS: no se añadió FAQ. |
| R-32 | PASS: foco visible del selector, Tab hacia Exportar CSV, Enter para Reintentar y navegación; Escape cierra Ayuda. |
| R-33 | PASS: correcciones directas en TSX/CSS; ningún script reescribe código de interfaz. |
| R-34 | PASS: Claro, Oscuro y Sistema, incluyendo cambio del esquema efectivo del dispositivo. |
| R-35 | PASS: build de pruebas, controles ejercitados y ausencia de errores cliente en los casos de Reportes. Resultados generales en la sección de validaciones. |
| R-36 | PASS: no se añadieron afirmaciones de seguridad, certificación o rendimiento. |
| R-37 | PASS: dirección existente leída y conservada, con los diales declarados arriba. |
| R-38 | PASS: sin contenido fabricado añadido a la aplicación. |
| R-01 | PASS: paleta y gradientes de superficie conservan la identidad y jerarquía descritas arriba. |
| R-04 | PASS: iconos existentes limitados a descargar y reintentar, con acción real. |
| R-06 | PASS: tipografía de sistema definida por Nexo para lectura y continuidad. |
| R-07 | PASS: no se agregaron patrones de fondo. |
| R-08 | PASS: sin flechas decorativas añadidas. |
| R-09 | PASS: sin badges decorativos ni etiqueta redundante sobre H1. |
| R-10 | PASS: no se agregó glass; permanece en el shell existente. |
| R-12 | PASS: no se añadieron sombras flotantes a cada bloque. |
| R-13 | PASS: no se añadió glow. |
| R-14 | PASS: resumen financiero, franja de conteos y distribuciones conservan funciones distintas. |
| R-19 | PASS: sin cambios en la animación del login; motion reducido elimina esperas y transiciones en Reportes. |
| R-22 | PASS: no se añadieron ilustraciones. |
| Liveliness | PASS: diales explícitos, resumen financiero como foco, espacio estructural, azul como acento y voz visual Nexo conservados. |
| C-1 | PASS: decisiones justificadas en el párrafo anterior. |
| C-2 | PASS: navegación, filtro, CSV, reintento y temas ejercitados. |
| C-3 | PASS: bloques ligados a preguntas comerciales existentes, sin secciones añadidas de relleno. |
| C-4 | PASS: semántica, estados, temas, reflow, texto ampliado y teclado comprobados. |
| C-5 | PASS: sin nuevos datos ni afirmaciones ficticias. |
| R-05 | PASS: jerarquía existente de resumen, conteos y desglose conservada. |
| R-11 | PASS: radios del módulo conservados; sin cápsulas nuevas. |
| R-15 | PASS: Exportar CSV y Reintentar describen sus acciones. |
| R-16 | PASS: sin copy promocional añadido. |
| R-20 | PASS: identidad Nexo y lenguaje comercial propios del CRM conservados. |
| R-21 | PASS: apariencia elegida por el usuario y Sistema funcional. |
| R-29 | PASS: azul, neutros y semánticos existentes; sin paleta adicional. |
| R-30 | PASS: sin imitación de otro producto. |
| R-31 | PASS: razones de color, composición, tipografía, espacio, superficies e iconos registradas. |

Click-through registrado: Calendario → `/calendario` → Resumen; Reportes → `/reportes` → Resumen; Ayuda → diálogo → Escape; lámpara → acceso animado al login en tres entradas; apariencia → Claro/Oscuro/Sistema; Período → Mes anterior; Exportar CSV → descarga `.csv`; error simulado → Reintentar por Enter → resumen recuperado. Las alternativas tabulares de ambas distribuciones permanecen disponibles en el árbol accesible.

Las comprobaciones de accesibilidad son automatizadas y de inspección del código/árbol accesible; no equivalen a una evaluación manual con lector de pantalla. Las pruebas usan exclusivamente el servidor local y sus mocks, sin modificar datos reales de Supabase.

## Limitaciones y pendientes

- Supabase no dispone de RPC o vista agregada de reportes. Para no cambiar SQL ni contratos, esta fase reutiliza los servicios paginados existentes y agrega en el navegador. Es correcto y respeta RLS, pero para volúmenes muy altos conviene una futura API/RPC agregada, diseñada y autorizada expresamente.
- No se implementaron responsable, rango personalizado ni series temporales porque los servicios actuales no ofrecen agregación segura específica para Reportes y no se autorizó ampliar contratos.
- No hay tasa de conversión histórica: el modelo conserva el estado actual del lead, no un historial de transiciones.
- El importe cobrado representa el total de ventas marcadas Pagada por fecha de pago; no modela pagos parciales porque esa entidad no existe.
- El alcance de datos y las funcionalidades del módulo se mantienen; este cierre verifica regresiones y accesibilidad, sin ampliar filtros, agregaciones ni contratos de backend.

## Estado final

El cierre solicitado de la Fase 6B está terminado y listo para revisión/subida a GitHub, conservando las limitaciones funcionales anteriores. No quedan pruebas o comprobaciones automatizadas obligatorias pendientes del cierre. Se conservan las observaciones de ejecución y el alcance de accesibilidad descritos arriba; no se hizo una publicación ni una verificación contra datos reales.
