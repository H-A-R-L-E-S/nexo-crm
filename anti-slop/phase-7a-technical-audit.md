# Nexo CRM: auditoria tecnica integral, Fase 7A

Fecha de auditoria: 2026-10-17
Alcance: inspeccion estatica de `src`, configuracion, acceso a Supabase, SQL versionado, UI y pruebas; ejecucion de lint, typecheck, build y Playwright.
Restriccion aplicada: no se modifico codigo funcional, Supabase, RLS, Auth, roles, permisos, contratos ni `.env.local`.

## 1. Resumen ejecutivo

Nexo CRM tiene una base funcional solida. La arquitectura por features es comprensible, los contratos TypeScript son mayormente estrictos, la autenticacion valida al usuario contra Supabase, las rutas privadas vuelven a comprobar el perfil en servidor y las operaciones de mayor riesgo usan RLS o RPC. La linea base se reprodujo con `lint`, `typecheck`, build de produccion y 129 pruebas Playwright aprobadas.

La aplicacion todavia no esta preparada para crecer en volumen sin degradacion. El problema central es que los modulos descargan colecciones completas al navegador, aplican paginacion, filtros y agregaciones localmente, y repiten algunas consultas entre el layout y cada pantalla. Reportes carga cinco dominios completos y calcula todo en el cliente. Tareas puede abrir hasta diez secuencias paginadas de red en una sola carga. No se inventan porcentajes de mejora: el repositorio no incluye telemetria ni una medicion de produccion que permita cuantificarlos.

Se confirmaron dos riesgos funcionales prioritarios. Reportes convierte valores PostgreSQL `date` como instantes UTC y los vuelve a formatear en Lima, por lo que `2026-10-01` se clasifica como `2026-09-30`. Clientes permite guardar responsables ficticios procedentes de un archivo de demostracion. Tambien existe un riesgo operativo alto: `supabase/schema.sql` conserva CRUD anonimo deliberadamente temporal; README advierte no reaplicarlo, pero el repositorio no posee un runner de migraciones que impida hacerlo.

No se encontro una vulnerabilidad critica demostrada ni exposicion de secretos. La clave `service_role` esta aislada mediante `server-only` y solo se obtiene despues de validar sesion y rol de administrador. El estado remoto real de RLS, indices y migraciones queda pendiente de verificacion porque esta fase no se conecto al proyecto Supabase y las pruebas SQL son manuales.

## 2. Estado actual de la arquitectura

- Next.js 16.3.6 con App Router y Proxy. Las paginas y layouts son Server Components por defecto; la mayor parte de las vistas de datos son Client Components.
- El layout privado ejecuta `requireProfile()` y entrega el perfil validado a `AuthProvider`. Proxy llama `auth.getUser()` para todas las rutas no estaticas y el layout vuelve a validar perfil activo y rol.
- Supabase se divide correctamente entre cliente de navegador, cliente de servidor y cliente administrativo. `admin.ts` usa `server-only` y no reutiliza cookies del actor.
- La organizacion por `features` separa tipos, validaciones, servicios, permisos y vistas. Ventas, tareas y oportunidades usan RPC para invariantes transaccionales y control de concurrencia.
- `ClientsProvider` vive en todo el layout CRM. Esto facilita el resumen, pero provoca que cualquier ruta privada cargue todos los clientes aunque no los necesite.
- La UI reutiliza primitivas Radix, tokens compartidos, temas Claro/Oscuro/Sistema, foco visible, reduced motion y estados explicitos. El login usa `next/image` con un atlas WebP local de 154,258 bytes.
- No hay `error.tsx` en App Router. Los errores manejados dentro de vistas tienen estados utiles, pero un fallo durante render o en un Server Component cae en el limite generico de Next.js.
- `next.config.ts` esta vacio. El build funciona, pero Next avisa que un `package-lock.json` externo al repositorio afecta la deteccion de raiz de Turbopack y de output file tracing.

## 3. Hallazgos comprobados

### F-01. Fechas `date` cambian de dia al clasificarse en Reportes

- Severidad: alta.
- Estado: confirmado.
- Archivo o modulo: `src/features/reports/metrics.ts`, funcion `limaDateKey` e `inPeriod`.
- Evidencia concreta: `limaDateKey` aplica `new Date(value)` a cualquier string. JavaScript interpreta `2026-10-01` como medianoche UTC; al formatearlo en `America/Lima` produce `2026-09-30`. La comprobacion directa durante la auditoria reprodujo ese resultado. `fecha_venta` y `fecha_pago` son columnas `date` y pasan por esa ruta.
- Impacto esperado: operaciones del primer dia del mes pueden contabilizarse en el periodo anterior. Afecta ventas registradas, pagos, limites de mes y cualquier metrica alimentada por strings sin hora.
- Propuesta de solucion: distinguir contratos `date` de `timestamptz`. Comparar los primeros directamente como claves `YYYY-MM-DD`; convertir solo timestamps a la fecha Lima. Añadir una utilidad unica y tipada.
- Riesgo de modificarlo: medio, porque unificar fechas puede cambiar filtros y pruebas de varios modulos.
- Pruebas necesarias: primer y ultimo dia de mes, cambio diciembre/enero, `date` frente a `timestamptz`, medianoche UTC y medianoche Lima, pagos y ventas en limites de periodo.

### F-02. Reportes agrega cinco dominios completos en el navegador

- Severidad: alta.
- Estado: confirmado.
- Archivo o modulo: `src/features/reports/reports-view.tsx`, `src/features/reports/metrics.ts` y los cinco servicios comerciales.
- Evidencia concreta: `Promise.allSettled` llama `getClientes`, `getLeads`, `getOpportunities`, `getSales` y `getTasks`. Cada servicio pagina en bloques de 500 o 1000 hasta descargar todas las filas autorizadas. `reportMetrics` filtra y reduce esos arrays en el hilo principal. El chunk de la pagina de Reportes mide 33,986 bytes sin contar chunks compartidos ni datos de red.
- Impacto esperado: latencia, transferencia y uso de memoria crecen linealmente con cada tabla. Cambiar el periodo no consulta datos nuevos, pero recalcula arrays completos. En movil puede bloquear interacciones y consumir datos innecesarios.
- Propuesta de solucion: en Fase 7B medir volumen, tiempos y payload; en 7C crear consultas agregadas o RPC de solo lectura por periodo y rol, con DTO minimo. Mantener los calculos monetarios exactos en servidor y no cambiar contratos hasta aprobar el diseño.
- Riesgo de modificarlo: alto, porque una agregacion remota debe conservar RLS, semantica de fechas, estados y exactitud monetaria.
- Pruebas necesarias: paridad del reporte actual contra fixtures, limites Lima, permisos por rol, datos parciales, errores por dominio, CSV e integracion real con RLS.

### F-03. La paginacion visual no limita las consultas de datos

- Severidad: alta.
- Estado: confirmado.
- Archivo o modulo: servicios de Clientes, Leads, Oportunidades, Ventas, Tareas y Usuarios; vistas de directorio.
- Evidencia concreta: todos los `get*` iteran hasta recibir una pagina incompleta y luego las vistas usan `filter()` y `slice()` para buscar, filtrar y paginar. Por ejemplo, Clientes pide paginas de 1000; los otros dominios y Usuarios piden bloques de 500.
- Impacto esperado: el costo inicial depende del total historico, no de las 10 o 12 filas visibles. Tambien limita la utilidad de indices de busqueda y orden de PostgreSQL.
- Propuesta de solucion: definir un contrato comun de consulta con `page`, `pageSize`, filtros, orden y conteo. Migrar modulo por modulo sin alterar la UI, comenzando por Reportes y los directorios con mayor cardinalidad.
- Riesgo de modificarlo: medio-alto, por seleccion persistente, enlaces con filtros, orden estable y conteos de resumen.
- Pruebas necesarias: primera/ultima pagina, filtros combinados, orden determinista, conteo total, URL compartible, mutaciones que cambian de pagina y RLS por rol.

### F-04. Existen consultas duplicadas y un fan-out elevado por ruta

- Severidad: media.
- Estado: confirmado.
- Archivo o modulo: `src/app/(crm)/layout.tsx`, `clients-provider.tsx`, `use-opportunities.ts`, `use-sales.ts`, `use-tasks.ts`, `tasks-overview.tsx` y `reports-view.tsx`.
- Evidencia concreta: el layout monta `ClientsProvider` en todas las rutas y este carga todos los clientes. Oportunidades vuelve a cargar clientes y leads. Ventas vuelve a cargar clientes y oportunidades. Tareas ejecuta `getTasks()` y, en paralelo, un directorio que carga clientes, leads, oportunidades, ventas y responsables. En Resumen se cargan clientes y tareas por separado; en Reportes se vuelven a cargar clientes.
- Impacto esperado: solicitudes repetidas, mas parseo y estados divergentes entre providers y hooks. Tareas puede requerir hasta diez solicitudes de paginas antes de mostrar el directorio si cada dominio supera 500 filas.
- Propuesta de solucion: medir solicitudes por navegacion; limitar el provider al resumen o suministrar datos de servidor por ruta; introducir una cache de consulta con invalidacion explicita solo si la medicion justifica una dependencia.
- Riesgo de modificarlo: medio, por mutaciones locales y expectativas de recarga.
- Pruebas necesarias: conteo de peticiones por ruta, navegacion entre modulos, alta/edicion/eliminacion, reintento, cambio de sesion y datos obsoletos.

### F-05. Clientes guarda responsables ficticios y arrastra datos de demostracion al bundle

- Severidad: alta.
- Estado: confirmado.
- Archivo o modulo: `src/features/clients/demo-data.ts`, `client-validation.ts`, `client-form.tsx`, `clients-view.tsx` y pagina `/clientes`.
- Evidencia concreta: `OWNERS` contiene Ana Garcia, Carlos Mendoza y Lucia Torres. El formulario obliga a elegir uno de esos nombres y lo persiste como `responsable`. El mismo modulo genera 1,230 clientes ficticios al evaluarse. El build conserva señales de esos datos en chunks compartidos de 16,564 y 20,159 bytes, entre otros.
- Impacto esperado: datos empresariales pueden quedar asignados a personas inexistentes y el navegador evalua contenido de demostracion que produccion no necesita. Viola R-38 de antislop porque contenido realista ficticio entra en una funcion final, no en un placeholder visible.
- Propuesta de solucion: separar `OWNERS` del fixture y sustituirlo por perfiles autorizados reales. Mover todos los fixtures a `tests/` o a un modulo solo de desarrollo sin efectos de nivel superior.
- Riesgo de modificarlo: alto para datos existentes, porque hay strings historicos sin clave foranea ni estrategia de migracion aprobada.
- Pruebas necesarias: responsables activos/inactivos, permisos de reasignacion, datos antiguos, filtros, formulario, eliminacion de un usuario y ausencia de fixtures en chunks de produccion.

### F-06. Clientes no protege ediciones concurrentes

- Severidad: media.
- Estado: confirmado.
- Archivo o modulo: `src/features/clients/services/clients.service.ts` y `clients-provider.tsx`.
- Evidencia concreta: `updateCliente` actualiza por `id` y no compara `updated_at`. Leads y Oportunidades si añaden `.eq("updated_at", updatedAt)`; Ventas y Tareas delegan la version a RPC.
- Impacto esperado: dos usuarios pueden editar el mismo cliente y el ultimo guardado sobrescribe silenciosamente el anterior.
- Propuesta de solucion: extender el contrato de actualizacion con la version leida y devolver conflicto cuando no coincida. No cambiar SQL en 7A.
- Riesgo de modificarlo: medio, por formularios abiertos durante mucho tiempo y actualizaciones optimistas.
- Pruebas necesarias: dos ediciones con la misma version, mensaje de conflicto, recarga, alta sin version y compatibilidad con registros existentes.

### F-07. `schema.sql` conserva acceso CRUD anonimo temporal

- Severidad: alta.
- Estado: riesgo confirmado en el artefacto; estado remoto no verificado.
- Archivo o modulo: `supabase/schema.sql`, lineas de grants y cuatro politicas `Desarrollo:*`; `README.md` documenta el orden correctivo.
- Evidencia concreta: el archivo concede `select`, `insert`, `update` y `delete` a `anon` sobre `clientes` con condiciones `true`. `auth_roles.sql` elimina esas politicas y revoca permisos, y README dice expresamente que no debe reaplicarse `schema.sql` despues.
- Impacto esperado: ejecutar el archivo historico fuera de orden puede reabrir Clientes a la clave anonima hasta volver a aplicar Auth/RLS.
- Propuesta de solucion: en 7C adoptar migraciones incrementales con estado y CI, retirar el SQL historico del camino operativo o añadir una proteccion que falle fuera de bootstrap. Verificar el proyecto remoto antes de produccion.
- Riesgo de modificarlo: alto; no editar ni ejecutar RLS sin respaldo y autorizacion.
- Pruebas necesarias: anon sin acceso, tres roles, usuario inactivo, repeticion idempotente, orden completo desde una base vacia y drift del proyecto remoto.

### F-08. Las pruebas SQL y RLS no forman parte de la suite automatizada

- Severidad: alta.
- Estado: confirmado.
- Archivo o modulo: `supabase/tests/*.sql`, `package.json`, `playwright.config.ts` y `tests/support/auth-server.mjs`.
- Evidencia concreta: el unico script de pruebas es `playwright test`. Playwright usa un servidor HTTP simulado local y claves de prueba. README indica que los SQL deben ejecutarse manualmente y que no sustituyen la verificacion remota.
- Impacto esperado: 129 pruebas verdes no demuestran que el esquema desplegado, las funciones `security definer`, grants o RLS reales coincidan con el repositorio.
- Propuesta de solucion: en 7D levantar Supabase/PostgreSQL efimero en CI, aplicar migraciones en orden y ejecutar los SQL dentro de transacciones. Añadir una comprobacion separada de drift remoto para el despliegue.
- Riesgo de modificarlo: bajo para la aplicacion, medio para infraestructura CI.
- Pruebas necesarias: todos los SQL actuales, reaplicacion idempotente, orden de migraciones, concurrencia y ejecucion sin secretos en logs.

### F-09. Falta aislamiento de fallos a nivel de ruta

- Severidad: media.
- Estado: confirmado.
- Archivo o modulo: `src/app/(crm)`.
- Evidencia concreta: no existe ningun `error.tsx`. Las vistas cliente manejan errores de red, pero fallos de render, importacion, `requireProfile`, Server Components o serializacion no tienen recuperacion especifica del CRM.
- Impacto esperado: un fallo inesperado reemplaza una pantalla completa por el limite generico y ofrece menos contexto o capacidad de reintento.
- Propuesta de solucion: añadir un limite de error compartido y, donde aporte valor, limites por detalle. Registrar un identificador de incidente sin mostrar datos sensibles.
- Riesgo de modificarlo: bajo.
- Pruebas necesarias: error de Server Component, error durante render cliente, reset/reintento, temas, teclado y ausencia de secretos en el mensaje.

### F-10. La configuracion de produccion no fija raiz ni cabeceras defensivas

- Severidad: media.
- Estado: configuracion confirmada; explotabilidad pendiente de despliegue.
- Archivo o modulo: `next.config.ts`.
- Evidencia concreta: el archivo no define opciones. Build y servidor E2E avisan que Next ignora `C:\Users\Usuario\package-lock.json` externo y recomiendan `turbopack.root` u `outputFileTracingRoot`. Tampoco hay evidencia versionada de CSP, `X-Content-Type-Options`, `Referrer-Policy` o una politica de framing.
- Impacto esperado: builds dependientes del entorno y una capa defensiva del navegador incompleta si el hosting no añade esas cabeceras.
- Propuesta de solucion: fijar la raiz con la API vigente de Next 16 despues de validar la guia instalada; inventariar scripts, estilos, Supabase e imagenes antes de desplegar CSP. Confirmar primero que el proveedor no las aplica.
- Riesgo de modificarlo: medio, especialmente CSP sobre Next, estilos inline y portales.
- Pruebas necesarias: build local/CI, trazado standalone si se usa, cabeceras por ruta, login, Supabase, temas y ausencia de violaciones CSP.

### F-11. Un caracter prohibido por el filtro visual permanece en Ventas

- Severidad: baja tecnicamente; prioridad antislop alta por ser Hard Gate.
- Estado: confirmado.
- Archivo o modulo: `src/features/sales/sales-view.tsx`.
- Evidencia concreta: se usa el caracter em dash como valor provisional de metricas durante carga o error. R-02 lo prohibe en texto generado por el sistema de diseño.
- Impacto esperado: inconsistencia con la direccion antislop, sin impacto funcional relevante.
- Propuesta de solucion: tras aprobacion, usar un texto de estado explicito o un simbolo permitido que no se anuncie ambiguamente.
- Riesgo de modificarlo: bajo.
- Pruebas necesarias: carga, error, lector de pantalla y snapshots de Ventas.

### F-12. Hay componentes de Resumen sin uso y responsabilidades visuales grandes

- Severidad: baja.
- Estado: confirmado.
- Archivo o modulo: `src/features/overview/stat-card.tsx`, `sales-chart.tsx`, `overview/demo-data.ts` y `overview.module.css`.
- Evidencia concreta: los dos componentes no tienen consumidores en `src`; `sales-chart` mantiene una cadena de datos demo. `overview.module.css` tiene 599 lineas y concentra responsive, estados y graficos.
- Impacto esperado: superficie de mantenimiento, riesgo de que fixtures vuelvan a produccion y mayor costo de revision. No se comprobo una penalizacion de runtime de los componentes no importados.
- Propuesta de solucion: eliminar la cadena muerta despues de confirmar historial y dividir CSS solo por responsabilidades que cambien de forma independiente, sin refactor cosmetico.
- Riesgo de modificarlo: bajo.
- Pruebas necesarias: build, Resumen completo, busqueda de referencias y comparacion visual de breakpoints.

## 4. Rendimiento

### Confirmado

- El costo dominante no es un grafico externo: no existe libreria de charts. Los graficos actuales son HTML/CSS y un SVG sin dependencia pesada.
- Hay 56 archivos con directiva `use client`. Es razonable para formularios y filtros, pero la frontera actual lleva consultas completas y agregaciones al navegador.
- Reportes descarga todos los datos visibles de cinco tablas.
- Tareas construye su directorio con cuatro dominios completos mas responsables y carga la lista de tareas por separado.
- `ClientsProvider` consulta Clientes en toda ruta privada.
- Los filtros y paginacion son locales.
- El login reutiliza una unica URL WebP en cuatro capas; el navegador puede cachear el recurso, pero pinta varias copias. No se midio costo GPU ni memoria de decodificacion.
- No hay importaciones dinamicas para formularios o dialogos grandes. Esto es una oportunidad pendiente de medicion, no una recomendacion automatica.

### Pendiente de medicion

- Core Web Vitals en dispositivo movil real.
- Payload real de Supabase por tabla y por rol.
- Tiempo hasta interaccion en Reportes, Tareas y Resumen con 10 mil o mas filas autorizadas.
- Re-renders mediante React Profiler.
- Costo de pintura del login y del atlas en GPU de gama baja.
- Tamaño transferido por ruta con compresion del hosting.

## 5. Seguridad

### Fortalezas comprobadas

- Proxy usa `auth.getUser()` y no confia solo en la cookie.
- El layout ejecuta `requireProfile()` y rechaza perfiles ausentes, inactivos o con rol invalido.
- Usuarios vuelve a autorizar cada Server Action mediante `adminContext()` y valida entradas `unknown`.
- `service_role` permanece en un modulo `server-only`, no usa cookies y se solicita despues de validar al administrador.
- Funciones SQL `security definer` revisadas fijan `search_path = ''` y revocan ejecucion publica.
- Ventas y Tareas usan RPC para idempotencia, versiones y reglas comerciales.
- Exportacion CSV antepone apostrofo a valores que empiezan con `=`, `+`, `-` o `@`, mitigando formulas de hoja de calculo. Exporta indicadores agregados, no registros completos.
- No se imprimio ni inspecciono el contenido de `.env.local`.

### Riesgos y limites

- F-07 y F-08 son los riesgos principales de despliegue.
- Los servicios de navegador dependen correctamente de RLS, pero descargan `select("*")` en Clientes, Leads, Tareas y Profiles. DTOs explicitos reducirian exposicion accidental futura.
- `next.config.ts` no aporta cabeceras defensivas versionadas. Debe verificarse el hosting antes de afirmar que faltan en produccion.
- No hay evidencia local sobre MFA, limites de intentos de login, rotacion de claves, backups o logs de auditoria. Son sospechas pendientes de verificacion en Supabase, no fallos confirmados.
- El estado remoto de signup anonimo y proveedores Auth solo consta como instruccion de README, no como configuracion comprobada.

## 6. Calidad de codigo

- La separacion por features y los tipos de dinero como texto mas `BigInt` son buenas decisiones.
- Validaciones y permisos estan duplicados en algunos servicios, pero esa duplicacion protege mensajes especificos; no conviene unificarla sin una taxonomia de errores.
- F-06 muestra una inconsistencia real de concurrencia.
- F-12 identifica codigo muerto comprobado.
- Los hooks de Leads, Oportunidades, Ventas y Tareas repiten el mismo control de version, carga y error. Conviene extraerlo solo si la migracion de consultas demuestra una interfaz comun estable.
- Los archivos TS/TSX de produccion no superan 268 lineas; los mayores archivos son CSS y pruebas. No se encontro una dependencia circular con evidencia concluyente.
- Las dependencias declaradas tienen uso observable. No se confirma una dependencia npm completamente inutilizada.

## 7. Visual y accesibilidad

### Fortalezas comprobadas

- `DESIGN.md` define identidad, paleta y diales: CRM ENERGY 3 / RHYTHM 2 / MOTION 2; login ENERGY 3 / RHYTHM 2 / MOTION 3.
- Existen temas Claro, Oscuro y Sistema, tokens oscuros para clases heredadas, foco global visible, forced colors y reduced motion.
- Las pruebas recorren los tres temas, 320 px, zoom 200%, teclado, modales, tablas, formularios, login fotografico y estados de carga/error/vacio.
- Tablas tienen captions, los graficos presentan alternativa tabular y los estados no dependen solo del color.
- El login usa imagen local con dimensiones intrinsecas mediante `next/image`, control de lampara con `aria-pressed` y retiro del formulario oculto del arbol de foco.

### Hallazgos antislop

- F-05: R-38 HIGH. Responsables ficticios se usan como contenido final y persistente.
- F-09: R-27 HIGH. Los errores manejados existen, pero faltan limites para fallos no previstos de ruta.
- F-11: R-02 HIGH segun la prioridad de Hard Gate, aunque el impacto tecnico sea bajo.
- F-12: C-3/R-38 LOW. Queda una cadena muerta de componentes y datos demo.
- No se confirma incumplimiento de contraste, overflow, foco, reduced motion, temas o controles muertos en los recorridos automatizados actuales.

## 8. Cobertura y estabilidad

### Linea base ejecutada

| Comprobacion | Resultado | Evidencia |
| --- | --- | --- |
| `npm run lint` | PASS | Sin errores ni advertencias de ESLint. |
| `npm run typecheck` | PASS | `next typegen` y `tsc --noEmit` completados. |
| `npm run build` | PASS | Build Next 16.3.6 completo; 16 paginas generadas. El primer intento dentro del sandbox fallo con `spawn EPERM`; fuera del sandbox paso. |
| `npm run test:e2e` | PASS | 129 aprobadas, 0 fallidas, Chromium, 1 worker, 10,9 minutos. |

### Cobertura fuerte

- Auth, rutas privadas, sesiones revocadas, perfiles inactivos y logout.
- Roles de Administrador, Gerente y Vendedor en los modulos principales.
- CRUD, conflictos e idempotencia de Leads, Oportunidades, Ventas, Tareas y Usuarios mediante transporte simulado.
- Dinero, IGV, redondeo y estados de ventas.
- Fechas de calendario y timestamps Lima en tareas.
- Temas, responsive, teclado, foco, zoom, reduced motion, estados y login.
- Reportes, CSV, datos parciales y estados de interfaz.

### Brechas

- F-01 no esta cubierto: la prueba de limites Lima usa timestamps, no strings PostgreSQL `date` en el primer dia del mes.
- No se ejecutan RLS ni RPC reales como parte de npm/CI.
- No hay prueba de migracion desde cero ni deteccion de drift.
- No hay prueba de concurrencia de Clientes.
- No hay presupuesto de bundle, numero de peticiones o tiempo de respuesta.
- Solo se ejecuta un proyecto Chromium. Falta WebKit movil y, si el publico lo requiere, Firefox.
- No hay pruebas de limites de error `error.tsx` porque no existen.
- No hay cobertura de cabeceras de seguridad del despliegue.

## 9. Recomendaciones priorizadas

### Prioridad 0: antes de optimizar

1. Corregir F-01 con pruebas de regresion para `date` y `timestamptz`.
2. Diseñar la sustitucion segura de responsables ficticios de F-05; no borrar ni reescribir datos existentes sin mapa aprobado.
3. Verificar en Supabase remoto que las politicas anonimas de F-07 no estan activas y capturar evidencia sin exponer secretos.

### Prioridad 1: escalabilidad y seguridad

4. Medir y rediseñar Reportes con agregaciones autorizadas en servidor.
5. Implementar paginacion y filtros en Supabase por modulo.
6. Reducir consultas duplicadas del layout y de los directorios.
7. Automatizar migraciones y pruebas SQL/RLS.
8. Añadir control de concurrencia a Clientes.

### Prioridad 2: resiliencia de produccion

9. Añadir limites de error y observabilidad segura.
10. Fijar la raiz de build y definir cabeceras despues de verificar hosting.
11. Separar fixtures de produccion y retirar componentes muertos.
12. Añadir presupuestos medibles de bundle, red y rendimiento movil.

## 10. Plan propuesto para 7B, 7C, 7D y 7E

### Fase 7B: medicion y correcciones de exactitud

- Corregir F-01 y cubrir limites America/Lima.
- Instrumentar por ruta: numero de peticiones, filas, bytes, duracion y costo de render.
- Capturar perfiles de Reportes, Tareas, Resumen y login en movil.
- Medir chunks por ruta y confirmar el costo de `demo-data`.
- Definir presupuestos iniciales basados en la medicion, no en porcentajes inventados.

### Fase 7C: acceso a datos y seguridad de produccion

- Diseñar RPC o vistas agregadas para Reportes, con autorizacion y DTO minimo.
- Introducir paginacion, filtros y orden remotos por modulo.
- Eliminar fan-out y consultas duplicadas sin alterar comportamiento.
- Versionar migraciones, bloquear el uso fuera de orden de `schema.sql` y verificar drift remoto.
- Resolver responsables de Clientes con identidades reales y estrategia de datos historicos.
- Evaluar y desplegar cabeceras defensivas.

### Fase 7D: pruebas e infraestructura

- Integrar Supabase/PostgreSQL efimero en CI.
- Ejecutar migraciones, pruebas SQL, idempotencia y concurrencia.
- Añadir pruebas de Clientes concurrentes, limites de error, cabeceras y `date`.
- Ampliar matriz a WebKit movil y navegadores requeridos.
- Establecer umbrales de bundle, requests y tiempos basados en 7B.

### Fase 7E: endurecimiento y entrega

- Cerrar observabilidad, recuperacion de errores, logs sin PII, backups y runbooks.
- Validar Supabase remoto: RLS, Auth providers, signup, rotacion de claves y restore.
- Ejecutar prueba de carga con volumen representativo y dispositivos moviles reales.
- Repetir lint, typecheck, build, SQL/RLS y E2E completos.
- Emitir checklist de produccion y decision go/no-go con evidencia.

## 11. Delivery Gate de auditoria

Este gate informa el estado observado; no autoriza correcciones en Fase 7A.

- R-02 FAIL documentado: Ventas contiene un em dash como placeholder. Hallazgo F-11.
- R-03 PASS en alcance probado: Playwright cubrio 320 px, reflow y ausencia de overflow en modulos principales.
- R-17 PASS: las cifras de negocio visibles proceden de datos consultados; no se hallaron estadisticas promocionales inventadas.
- R-18 PASS: no existe seccion de testimonios ni avatares fotograficos ficticios.
- R-23 PASS: el atlas fotografico del login esta respaldado por la direccion y auditoria previa registradas en `DESIGN.md`.
- R-24 PASS en recorridos probados: navegacion principal y enlaces comerciales resolvieron destinos existentes.
- R-25 PASS en alcance automatizado: pruebas de temas y modulos verificaron contraste; no equivale a una auditoria manual de cada pixel fotografico.
- R-26 PASS en recorridos probados: 129 pruebas ejercitaron controles principales; no se afirma cobertura exhaustiva de todo control posible.
- R-27 FAIL: no hay limites `error.tsx` para errores no controlados. Hallazgo F-09.
- R-32 PASS en alcance probado: teclado, Escape, foco y portales tienen cobertura automatizada.
- R-34 PASS en alcance probado: Claro, Oscuro y Sistema pasaron la suite.
- R-35 PASS: lint, typecheck, build y 129 pruebas fueron ejecutados en esta auditoria.
- R-37 PASS: `DESIGN.md` define direccion y diales.
- R-38 FAIL: responsables ficticios de demo participan en formularios de produccion. Hallazgo F-05.
- Purpose Gate PASS en lo inspeccionado: gradientes, glass, iconos y motion tienen razones registradas en `DESIGN.md`.
- Liveliness PASS: diales, acento azul, jerarquia, ritmo e identidad fotografica estan documentados y cubiertos por pruebas visuales.
- Craftsmanship FAIL por C-4 y C-5/R-38: faltan limites de error y persiste contenido ficticio funcional.

La Fase 7A termina aqui. No se inicio ninguna optimizacion de 7B.
