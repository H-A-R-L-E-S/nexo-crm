# Fase 3B · Ventas

Fecha de cierre: 15 de octubre de 2026.

## Objetivo y alcance

Rediseño visual del listado, alta/edición, carga y detalle de Ventas. Se conserva la dirección Nexo CRM vigente: ENERGY 3, RHYTHM 2 y MOTION 2; azul para acción y jerarquía; superficies con profundidad moderada; tipografía y tokens compartidos; claro, oscuro y sistema.

No se modificaron Supabase, SQL, RLS, autenticación, permisos, servicios, consultas, contratos, rutas, cálculos monetarios, precisión decimal, validaciones ni persistencia. No se añadieron comprobantes o documentos porque el módulo no los implementa.

## Componentes modificados

- sales-view.tsx y sales.module.css: encabezado, resumen, filtros activos, listado, estados y responsive.
- sale-form.tsx y sales-dialog.module.css: superficie del diálogo, agrupación inicial y controles adaptados al tema.
- sale-detail-view.tsx y sale-detail.module.css: cabecera comercial, relaciones, metadatos, desglose, totales y observaciones.
- ventas/loading.tsx y sales-loading.module.css: skeleton específico, estático con reduced motion.
- tests/sales.spec.ts: cobertura directa de Claro/Oscuro/Sistema, 320/768/1440 px, foco y reduced motion.

## Resultado visual y funcional

- Encabezado compacto con contexto y única acción principal existente.
- Resumen jerárquico: ingresos pagados como importe principal; ventas registradas, pendiente de cobro y ventas del mes como contexto. Todos usan salesStats y formateadores existentes.
- Búsqueda y seis filtros existentes. Cada filtro activo se retira sin borrar los demás.
- Tabla semántica compacta en escritorio. En móvil, las mismas filas se reorganizan verticalmente sin duplicar contenido, roles ni acciones.
- Estados de carga, error, reintento, vacío global y vacío por filtros con texto específico.
- Formulario con encabezado fijo, controles por tokens, reflow a una columna, objetivos táctiles y submit/idempotencia originales.
- Detalle con número, estado, importe, cliente, oportunidad, responsable, fechas, pago, ítems, totales y observaciones.
- Entrada de contenido y hovers entre 150–280 ms; sin loops. prefers-reduced-motion elimina animaciones.

## Responsive y accesibilidad

- Escritorio: resumen jerárquico, filtros en seis columnas y tabla escaneable.
- Laptop/tablet: resumen apilado y filtros en tres columnas.
- Móvil: resumen y filtros reconfigurados; filas de tabla reordenadas; acciones y paginación táctiles; sin overflow horizontal a 320 px.
- Tabla y desglose conservan encabezados semánticos; valores móviles incorporan etiquetas visibles.
- Foco visible heredado de primitivas y explícito en selects; Radix conserva Escape, trampa y retorno de foco.
- Estados usan role=status o role=alert; estado y pago no dependen solo del color.
- Sistema se verificó con esquema efectivo claro; Claro y Oscuro se seleccionaron explícitamente.

## Validaciones exactas

| Comprobación | Resultado |
| --- | --- |
| npm run lint final | PASS, código 0. |
| npm run typecheck | PASS, código 0. |
| npm run build final | PASS, código 0; 14 rutas generadas. |
| tests/sales.spec.ts funcionales originales | 10/10 PASS. |
| Temas, responsive, foco y reduced motion añadidos | 3/3 PASS. |
| Integración opportunities.spec.ts + tasks.spec.ts | 20/20 PASS. |
| git diff --check | PASS; solo avisos informativos LF/CRLF. |

Ventas cubre alta, edición, pago y restricciones por rol; creación desde oportunidad Ganada; búsqueda, filtros, rango y paginación; error y reintento; idempotencia; conflicto de versión; móvil, teclado y formularios; autenticación; redondeo, descuentos, IGV y exclusión de canceladas. La integración confirma Venta desde Oportunidad y Tarea desde Venta.

El primer build dentro del sandbox compiló pero TypeScript recibió spawn EPERM; el mismo comando autorizado fuera del sandbox completó. La repetición inicial de Playwright fue rechazada porque el revisor automático agotó su cuota; no se ejecutó ni se eludió. En la continuación, el comando explícito fue autorizado y completó.

## Auditoría Anti Slop

### Core

PASS. La composición responde al trabajo real de cobro y operación. No hay métricas, acciones, relaciones, documentos ni contenido inventado.

### UI

PASS. El resumen concentra profundidad y el azul jerarquía/acción. La tabla usa jerarquía numérica, foco por fila y reflow móvil semántico. Vidrio, gradiente, sombra y radios se limitan a superficies con propósito.

### Human

PASS en la cobertura ejecutada. Teclado, foco, Escape/retorno de foco de Radix, estados perceptibles, objetivos táctiles, textos largos y reduced motion permanecen operables. Los colores proceden de tokens medidos del sistema; estados incluyen texto.

### Layout mobile

PASS. Se verificaron 320, 390, 768 y 1440 px; el test falla ante overflow horizontal. Tabla, detalle, filtros y formularios cambian de composición.

## Limitaciones y mejoras futuras

- Ventas no tiene comprobantes, documentos, exportación ni ordenamiento interactivo; no se inventaron.
- No se añadió otra librería de motion ni una vista alternativa.
- Las capturas de tema quedan en test-results como artefactos temporales.
- DESIGN.md no cambia: se reutilizan reglas documentadas y no aparece un patrón global nuevo.

No se creó commit ni se hizo push.
