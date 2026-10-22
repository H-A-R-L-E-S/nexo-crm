# Fase 7B.2: rendimiento, eficiencia y escalabilidad

Fecha de la fase: 2026-10-17
Continuación y cierre: 2026-10-21
Alcance: medición reproducible con backend simulado, inspección estática de consultas y una optimización conservadora para F-04.

## 1. Resumen ejecutivo

La fase confirma F-02, F-03 y F-04. Reportes todavía descarga cinco dominios completos; la paginación visible continúa siendo local; y varias rutas repetían la descarga completa de clientes que ya realiza `ClientsProvider`.

Se implementó una optimización de bajo riesgo: `ClientsProvider` comparte la carga en curso y expone el resultado autorizado a Oportunidades, Ventas, Tareas, Calendario y Reportes. La carga inicial de cada ruta dejó de pedir clientes por segunda vez. Las recargas explícitas siguen consultando datos frescos y las mutaciones actualizan la fuente compartida.

La mejora confirmada es una petición REST menos por carga inicial en cinco módulos. No se afirma una mejora porcentual de tiempo. Las duraciones locales variaron favorablemente, pero una sola muestra con backend simulado no permite atribuir causalidad ni representar Supabase en producción.

No se modificaron SQL, RLS, Auth, roles, permisos, contratos persistentes, importes, IGV, descuentos, fechas ni diseño.

## 2. Estado inicial de rendimiento

Medición inicial con build de producción, Chromium, un worker, datos vacíos simulados y navegación directa. `Contenido útil` termina cuando el encabezado del módulo es visible y la red queda inactiva.

| Módulo | Contenido útil observado | Peticiones comerciales | Peticiones a clientes | Filas simuladas | JSON simulado |
| --- | ---: | ---: | ---: | ---: | ---: |
| Dashboard | 979 ms | 2 | 1 | 0 | 4 B |
| Clientes | 890 ms | 1 | 1 | 0 | 2 B |
| Leads | 936 ms | 2 | 1 | 0 | 4 B |
| Oportunidades | 982 ms | 4 | 2 | 0 | 8 B |
| Ventas | 938 ms | 4 | 2 | 0 | 8 B |
| Tareas | 1307 ms | 6 | 2 | 0 | 12 B |
| Calendario | 1249 ms | 6 | 2 | 0 | 12 B |
| Reportes | 1218 ms | 6 | 2 | 0 | 12 B |
| Usuarios | No capturado en la corrida inicial | No capturado | No capturado | No capturado | No capturado |

Los bytes corresponden exclusivamente al cuerpo JSON vacío de las respuestas interceptadas. No incluyen cabeceras, JavaScript, RSC ni transporte real y no representan producción.

## 3. Herramientas utilizadas

- Inspección estática con `rg`, TypeScript y revisión de servicios, hooks, providers y vistas.
- Documentación instalada de Next.js 16.3.6 sobre Server/Client Components, límites cliente y caché.
- Playwright 1.63 sobre Chromium/Edge instalado, build de producción y backend local simulado.
- Contadores de peticiones por recurso, filas simuladas y bytes del cuerpo JSON.
- `performance.now()` desde el proceso de prueba para duración de navegación hasta contenido útil.
- ESLint, `next typegen`, `tsc --noEmit` y `next build`.

## 4. Metodología de medición

La prueba `tests/performance.spec.ts` recorre Dashboard, Clientes, Leads, Oportunidades, Ventas, Tareas, Calendario, Reportes y Usuarios con la misma sesión y respuestas comerciales vacías. Registra tiempo observado, peticiones REST comerciales, consultas a clientes, filas y bytes JSON aproximados. Además falla si un módulo emite más de una consulta inicial a clientes.

Las comparaciones válidas son los conteos deterministas bajo las mismas rutas simuladas. Los tiempos se conservan como observaciones, sin porcentajes ni afirmaciones de producción. No se conectó esta fase a un proyecto Supabase real, no se usaron datos reales y no se ejecutaron pruebas destructivas.

No se obtuvo una medición representativa con conjuntos grandes. El comportamiento para gran volumen se evaluó estáticamente: los servicios siguen paginando toda la colección en bloques de 500 o 1000, y filtros, agregaciones y opciones de formularios crecen con el total autorizado.

## 5. Hallazgos confirmados

- F-02 confirmado: Reportes obtiene clientes, leads, oportunidades, ventas y tareas completos y reduce los arreglos en el navegador.
- F-03 confirmado: Clientes usa bloques de 1000; Leads, Oportunidades, Ventas, Tareas y Usuarios usan bloques de 500. La UI pagina después de descargar todas las filas.
- F-04 confirmado y parcialmente corregido: cinco módulos repetían `clientes` durante su carga inicial.
- El fan-out restante es mayor en Tareas y Calendario: tareas, clientes, leads, oportunidades y ventas, además del RPC de responsables no incluido en el contador comercial de la tabla.
- Usuarios consulta perfiles en servidor. La prueba del navegador mide navegación y la carga global de clientes, pero no atribuye bytes ni filas a la consulta servidor.

## 6. Consultas innecesarias identificadas

Antes del cambio, Oportunidades, Ventas, Tareas, Calendario y Reportes solicitaban clientes desde su hook o vista mientras el layout privado también montaba `ClientsProvider`. Esto duplicaba la colección completa, no sólo una página visible.

La carga inicial ahora usa `ensure()` del provider. Si la colección está cargada, reutiliza el resultado; si está en curso, comparte la misma promesa; si aún no comenzó, inicia una única petición. La acción manual Actualizar conserva una carga forzada mediante `load()`.

Las colecciones completas de F-02 y F-03 no se cambiaron porque resolverlas correctamente requiere contratos paginados o agregados, conteos y paridad con RLS.

## 7. Costes de renderizado

- Reportes ejecuta `reportMetrics` sobre cinco arreglos completos al cambiar datos o período. Su coste sigue siendo lineal con el volumen recibido.
- Clientes, Leads, Oportunidades, Ventas y Tareas filtran y paginan en memoria. Las tablas limitan las filas visibles, pero la descarga y el filtrado no están limitados por la página.
- Tareas y Calendario construyen un directorio combinado de cuatro dominios; además buscan relaciones en arreglos durante el render.
- Los selectores de relaciones conservan colecciones completas como opciones, lo que puede degradarse con miles de registros.
- `overview-view.tsx` es la vista más extensa inspeccionada con 212 líneas y `clients-view.tsx` tiene 256. El tamaño de archivo por sí solo no demuestra un cuello de render, por lo que no se dividieron componentes ni se añadió memoización especulativa.
- Gráficos, animaciones, imágenes y responsive pasaron la suite existente. No se encontró evidencia que justificara eliminarlos o cargar componentes de forma diferida en esta fase.

## 8. Optimización implementada

Una única optimización controlada:

1. `ClientsProvider` mantiene referencias internas al resultado autorizado y a la petición activa.
2. `ensure()` reutiliza el resultado de la carga inicial o la petición concurrente.
3. `load()` conserva la recarga explícita desde Supabase.
4. Altas, ediciones y eliminaciones sincronizan estado y referencia interna.
5. Oportunidades, Ventas, Tareas, Calendario y Reportes usan `ensure()` al montar y `load()` al actualizar manualmente.

No se añadió dependencia, TTL, caché persistente, almacenamiento local ni resultado compartido entre sesiones.

## 9. Mediciones antes y después

Comparación reproducible inmediata con datos vacíos simulados:

| Módulo | Peticiones antes | Peticiones después | Clientes antes | Clientes después | Resultado confirmado |
| --- | ---: | ---: | ---: | ---: | --- |
| Dashboard | 2 | 2 | 1 | 1 | Sin cambio esperado |
| Clientes | 1 | 1 | 1 | 1 | Sin cambio esperado |
| Leads | 2 | 2 | 1 | 1 | Sin cambio esperado |
| Oportunidades | 4 | 3 | 2 | 1 | Una petición menos |
| Ventas | 4 | 3 | 2 | 1 | Una petición menos |
| Tareas | 6 | 5 | 2 | 1 | Una petición menos |
| Calendario | 6 | 5 | 2 | 1 | Una petición menos |
| Reportes | 6 | 5 | 2 | 1 | Una petición menos |
| Usuarios | No capturado | 1 | No capturado | 1 | Sin comparación atribuible |

Tiempos observados en la comparación posterior: Dashboard 851 ms, Clientes 823 ms, Leads 835 ms, Oportunidades 838 ms, Ventas 851 ms, Tareas 811 ms, Calendario 828 ms, Reportes 823 ms y Usuarios 881 ms. No se presentan como mejora confirmada por falta de repeticiones estadísticas y backend real.

Con respuestas vacías, el JSON interceptado bajó de 8 a 6 bytes en Oportunidades/Ventas y de 12 a 10 bytes en Tareas/Calendario/Reportes. La cifra sólo demuestra que desapareció una respuesta `[]`; el ahorro real equivale al payload autorizado de clientes que antes se repetía, pero no fue cuantificado.

## 10. Resultados de pruebas

- Medición posterior específica: PASS, 1/1.
- Regresiones de módulos afectados: PASS, 63/63 en 5,1 minutos.
- `npm run lint`: PASS, sin errores ni advertencias de ESLint.
- `npm run typecheck`: PASS, generación de tipos y TypeScript sin errores.
- `npm run build`: PASS, 17 rutas generadas con Next.js 16.3.6.
- `npm run test:e2e`: PASS, 135/135 en 10,6 minutos, Chromium, un worker.
- Total anterior de Fase 7B.1: 134. Total actual: 135 por la nueva prueba de rendimiento.

Advertencia preexistente: Next.js ignora `C:\Users\Usuario\package-lock.json` por estar fuera del repositorio. No se corrigió porque corresponde a F-10 y está fuera del alcance.

Playwright sobrescribió tres capturas versionadas de Usuarios durante la suite. Se restauraron exactamente a `HEAD` porque no tenían cambios al iniciar y están fuera del alcance.

## 11. Auditoría Anti Slop

Design Read aplicado: CRM operativo para equipos comerciales, identidad azul Nexo y superficies existentes. ENERGY 3 / RHYTHM 2 / MOTION 2.

- Core: PASS. No se añadió contenido ficticio, control inerte, estadística comercial ni afirmación de rendimiento no medida.
- UI: PASS. No hubo cambios visuales, de composición, color, iconos, motion, gráficos o componentes.
- Human: PASS. Las regresiones conservaron estados de carga/error/vacío, teclado, foco, contraste, zoom y los tres temas.
- Layout mobile: PASS. Las pruebas específicas y completas conservaron reflow, controles táctiles y ausencia de overflow en los módulos cubiertos.

Delivery Gate:

- R-02 PASS: no se añadió texto de interfaz con el carácter prohibido.
- R-03 PASS: pruebas de 320/390 px, zoom y reflow aprobaron.
- R-17/R-18/R-23/R-38 PASS: no se añadieron cifras, personas ni assets ficticios.
- R-24/R-26 PASS: no se añadieron enlaces ni controles; las acciones existentes aprobaron su recorrido.
- R-25/R-32/R-34 PASS: contraste, teclado, foco y Claro/Oscuro/Sistema aprobaron.
- R-27 PASS: carga, error, vacío y reintento aprobaron en los módulos afectados.
- R-35 PASS: build, 63 regresiones específicas y 135 pruebas completas aprobaron.
- R-36 PASS: el informe separa evidencia simulada de producción y no fabrica porcentajes.
- R-37 PASS: `DESIGN.md` y los diales vigentes se mantuvieron.
- Purpose Gate PASS: no se introdujo ninguna técnica visual nueva.
- Liveliness PASS: el producto conserva foco, jerarquía, acento azul, ritmo e identidad documentados.
- Craftsmanship PASS: funcionalidad, estados, responsive y permisos conservaron su cobertura.

## 12. Riesgos identificados

- La optimización no reduce colecciones completas ni el número de páginas internas cuando se superan 500 o 1000 filas.
- Una ruta que no consume clientes sigue pagando la carga global de `ClientsProvider`; retirarlo del layout requiere rediseñar el alcance del provider y sus consumidores.
- Tareas y Calendario conservan el mayor fan-out y directorios completos.
- Reportes conserva agregaciones en el hilo principal y cinco dominios completos.
- La suite sólo ejecuta Chromium; Firefox, WebKit, dispositivos físicos y CPU móvil real siguen sin medirse.
- No existe telemetría de producción para navegación, contenido útil, memoria o bloqueo del hilo principal.

## 13. Mejoras que requieren cambios en Supabase

Pendientes de aprobación, sin implementar:

- F-02: consultas agregadas o RPC de sólo lectura por período y rol para Reportes, con paridad exacta de fechas Lima y dinero.
- F-03: contrato paginado con página, tamaño, filtros, orden estable y conteo total para cada directorio.
- Selecciones mínimas por caso de uso en lugar de `select("*")` donde el contrato pueda reducirse sin romper formularios.
- Índices sólo después de obtener planes reales y volumen representativo en Supabase.

Estas propuestas requieren validar RLS, permisos, conteos, URL de filtros, mutaciones y paridad comercial antes de implementarse.

## 14. Recomendaciones priorizadas

1. Medir Supabase real en un entorno no destructivo con volúmenes representativos, planes de consulta y payloads.
2. Diseñar y aprobar el contrato paginado de F-03, comenzando por el directorio de mayor cardinalidad.
3. Diseñar y aprobar agregaciones de Reportes para F-02 con pruebas de paridad.
4. Evaluar el alcance de `ClientsProvider` sólo después de migrar consumidores, para evitar otra carga global innecesaria.
5. Añadir repetición estadística, CPU throttling y dispositivos móviles reales antes de afirmar mejoras de tiempo o render.

## 15. Siguiente fase recomendada

La Fase 7B.2 queda cerrada con una optimización confirmada y una prueba de regresión reproducible. La siguiente fase debe ser una propuesta separada y autorizada para acceso a datos paginado/agregado. No se inició Fase 7C en este trabajo.

Funciones y permisos conservados: login, Supabase Auth, sesiones, roles, RLS, IGV, descuentos, importes, idempotencia, fechas de Lima, Clientes, conversión de Leads, etapas de Oportunidades, Ventas, Tareas, Calendario, CSV, Reportes y Usuarios aprobaron la suite completa.
