# Nexo CRM: responsables reales de Clientes, Fase 7C.2.3

Fecha: 2026-10-22, America/Lima.

Estado: propuesta para aprobación de una implementación posterior.

Entregables: este informe y [SQL estructural propuesto](sql/phase-7c23-client-responsibles.proposed.sql). Ninguno se ha aplicado a Supabase.

La transición recomendada agrega una referencia UUID nullable, conserva el texto original y elimina los nombres de demostración del flujo operativo en una implementación posterior. La ampliación de esquema no basta para habilitar asignaciones: también hacen falta autorización en base de datos, lectura controlada del directorio, control de concurrencia y adaptación de la conversión de Leads.

Alcance realizado: inspección estática de código, SQL versionado, pruebas y documentación. No se consultó producción, no se abrió ni modificó `.env.local`, no se ejecutó SQL ni pruebas de escritura y no se cambiaron código funcional, RLS, Auth, roles, permisos ni datos. No se realizó commit ni push. Había cambios locales ajenos a esta tarea; se conservaron.

**Procedencia de la evidencia.** Se aceptan como confirmados por el usuario los resultados de Supabase real: siete tablas comerciales examinadas con RLS; permisos anónimos de tablas/columnas examinadas restringidos; Clientes sin `responsable_id`; tipos indicados; tres perfiles activos de los roles existentes; Vendedor sin nombres/apellidos; un cliente con texto `Ana García` sin perfil coincidente. Las definiciones detalladas de políticas, grants y RPC que siguen proceden del repositorio. No se ha demostrado que esas definiciones coincidan exactamente con el catálogo remoto ni se inventan UUID de producción. Los resultados reales sustituyen las incertidumbres equivalentes del informe 7C.1; no se afirma que producción tenga hoy CRUD anónimo abierto.

## 1. Diagnóstico del código

Referencias con líneas del repositorio inspeccionado en esta fecha:

| Pieza | Evidencia | Resultado |
| --- | --- | --- |
| Responsables demo | `src/features/clients/demo-data.ts:6` | `OWNERS` contiene Ana García, Carlos Mendoza y Lucía Torres. Son nombres sin UUID, rol ni actividad; el archivo identifica sus datos como ficticios. |
| Contrato de dominio | `src/features/clients/types.ts:12`, `:23` | `Client.owner` y el campo correspondiente de `ClientInput` son texto. |
| Contrato Supabase | `src/lib/supabase/database.types.ts:8` | `ClientRow.responsable` es texto; no hay UUID de responsable ni RPC de Clientes tipada. |
| Alta por defecto | `src/features/clients/client-validation.ts:13` | Una creación empieza con `OWNERS[0].name`, es decir, Ana García, sin selección expresa. |
| Validación | `src/features/clients/client-validation.ts:21`, `:45` | Conserva `owner` sin normalizar; acepta únicamente coincidencia exacta con un nombre de `OWNERS`. No consulta perfiles, UUID, actividad ni permisos de asignación. |
| Formulario | `src/features/clients/client-form.tsx:47`, `:111` | Valida en navegador y construye el selector con los nombres demo como valor e identidad. |
| Provider | `src/features/clients/clients-provider.tsx:75`, `:85` | Delega altas y cambios al servicio; no mantiene directorio ni repite validación de responsable. |
| Lectura del servicio | `src/features/clients/services/clients.service.ts:11`, `:40` | Mapea `responsable` a `owner`; obtiene Clientes mediante `select('*')`, sin relación con Profiles. |
| Escritura del servicio | `src/features/clients/services/clients.service.ts:21`, `:55`, `:61` | Guarda `input.owner` literalmente mediante INSERT/UPDATE con el cliente Supabase del navegador. UPDATE filtra solo por `id`, aunque existe `updated_at`. |
| Errores | `src/features/clients/services/clients.service.ts:32` | Todo `23503` se presenta como dependencia comercial del cliente; con la nueva FK también podría ser un responsable inexistente. |
| Filtros y presentación | `src/features/clients/clients-view.tsx:131`, `:179`, `:214`, `:231` | Filtra por texto, ofrece `OWNERS` y muestra `client.owner` tanto en tabla como en móvil. |
| Parámetro de ruta | `src/app/(crm)/clientes/page.tsx:11` | Solo reconoce `?responsable=` si coincide con un nombre demo. |
| Protección general | `src/app/(crm)/layout.tsx:7`, `src/features/auth/server.ts:8` | `requireProfile()` exige sesión/perfil activo y rol válido. No define autorización específica de asignación. |
| Server Actions | Búsqueda de `use server`, rutas y llamadas Supabase en `src` | Clientes no tiene Server Action ni Route Handler propio ni RPC de guardado. Las acciones existentes de Usuarios están en `src/features/users/actions.ts:1`. |
| Directorio administrativo | `src/features/users/service.ts:9`, `:20` | Exige Administrador activo y lee Profiles con la sesión; no es reutilizable por Gerente/Vendedor como directorio comercial. |
| Conversión de Leads | `supabase/leads.sql:113`, `:143`, `:145` | `convert_lead` toma el nombre desde el UUID del Lead, pero inserta Clientes solo con `responsable` texto. |
| Resumen | `src/features/overview/overview-view.tsx:91` | Agrupa clientes por nombre del responsable, fusionando homónimos. |

**Consecuencia actual:** el formulario puede crear una asignación ficticia por defecto. Un cliente convertido desde Leads cuyo responsable real no pertenezca a `OWNERS` puede no superar la validación al editar datos ajenos al responsable. La validación de navegador puede eludirse con una petición REST; el SQL versionado de Clientes no contiene un control equivalente para ese campo.

No se encontró una bitácora específica de reasignaciones en el módulo Clientes. Conservar el texto original y el UUID actual no permite reconstruir cambios intermedios: no se atribuye al sistema un historial de eventos que hoy no ofrece.

## 2. Estructura actual

| Elemento | Estado |
| --- | --- |
| `clientes.id` | UUID. |
| `clientes.responsable` | TEXT NOT NULL; el esquema local añade default `Sin asignar`. Ese default no fue confirmado en el catálogo real. |
| `clientes.responsable_id` | No existe, confirmado por el usuario. |
| `clientes.updated_at` | TIMESTAMPTZ; `schema.sql:85` define actualización mediante trigger. |
| `profiles` | UUID, nombres, apellidos, rol, activo y fechas; el SQL local incluye email y otros campos que no necesita el selector. |
| Relación con Auth | `supabase/auth_roles.sql:8`: `profiles.id` referencia `auth.users.id` con borrado en cascada. |
| Nombres incompletos | El esquema de Profiles admite cadenas vacías; el Vendedor real está en esa situación. |

Las reglas versionadas de acceso son:

| Operación | Administrador activo | Gerente activo | Vendedor activo |
| --- | --- | --- | --- |
| Leer/crear/editar Clientes | Sí | Sí | Sí |
| Eliminar Clientes | Sí | Sí | No |
| Leer Profiles directamente | Equipo | Solo propio | Solo propio |
| Administrar usuarios | Sí, mediante flujo administrativo | No | No |

Fuentes: `supabase/auth_roles.sql:73-84`, `:111-122` y `supabase/user_management.sql:7-9`. El grant de tabla sobre Clientes permite INSERT/UPDATE; no limita qué responsable se escribe. `nexo_private.active_role()` valida perfil activo y excluye sesiones anónimas (`auth_roles.sql:90-97`). No se modificará esa función.

`supabase/schema.sql` conserva permisos de desarrollo antiguos y no debe reaplicarse como parte de esta transición. Su existencia local no contradice las restricciones anónimas que el usuario confirmó en producción.

## 3. Estructura propuesta

| Campo | Contrato propuesto | Finalidad |
| --- | --- | --- |
| `responsable_id` | UUID nullable, sin default, FK a `public.profiles(id)` | Identidad actual vinculada, independiente del nombre. |
| `responsable` | Conservar TEXT NOT NULL y su contenido anterior | Texto histórico original, sin backfill ni reemplazo por renombres o reasignaciones. |
| `updated_at` | Conservar tipo y trigger | Detectar ediciones obsoletas y evitar sobrescribir una reasignación reciente. |

FK propuesta: `ON DELETE RESTRICT ON UPDATE RESTRICT`. Un índice parcial sobre UUID no nulos ayuda a consultar referencias. No se añade `NOT NULL`, default con el usuario actual, cascada de borrado ni unicidad en nombres.

### Identidad, presentación y elegibilidad

Un perfil será elegible para una **nueva** asignación si existe, está activo, tiene uno de los tres roles admitidos y tanto `trim(nombres)` como `trim(apellidos)` son no vacíos. Es una recomendación de negocio pendiente de aprobar con esta implementación; no cambia el rol ni el acceso al CRM del perfil incompleto.

| Estado | Presentación propuesta | Nuevas asignaciones |
| --- | --- | --- |
| Perfil activo completo | Nombre real, rol e identificador corto para desambiguar | Según permisos del actor. |
| Perfil activo incompleto | `Perfil incompleto` e identificador verificable; mostrar las partes del nombre que existan | Bloqueadas hasta completar los datos por el flujo existente. No inventar nombre ni usar el rol como identidad personal. |
| Perfil inactivo ya vinculado | Nombre disponible y texto `Inactivo`; conservar UUID | Se conserva la asignación actual; no se ofrece para otros clientes. |
| Perfil vinculado que pierde nombre | `Perfil incompleto` y UUID; texto histórico accesible | Se conserva; puede editarse el contacto sin reasignarlo. |
| Cliente con UUID NULL | Texto exacto histórico y `Pendiente de vincular` | La vinculación es manual y explícita. NULL no significa cliente libre. |
| UUID cuyo detalle no puede cargarse | Texto histórico y `Estado del usuario no disponible` | No afirmar que está inactivo ni borrar el UUID por falta de lectura. |

Las opciones seleccionables contienen exclusivamente usuarios reales elegibles y autorizados. Un perfil incompleto o inactivo puede aparecer como contexto o valor actual conservado, nunca como nueva opción habilitada. El Vendedor real sin nombre no podrá asignarse nuevos clientes bajo esta recomendación hasta completar su perfil; sí podrá conservar referencias y editar los campos permitidos. La migración no completa su nombre ni crea otra cuenta.

Para homónimos, `key`, `value`, validación, filtros y agrupación utilizan el UUID completo. La etiqueta puede usar un prefijo de UUID, extendiéndolo si colisiona; la identidad nunca depende de ese prefijo ni del nombre. No exponer correos para desambiguar.

### Matriz recomendada de asignación, para aprobación posterior

| Acción sobre el responsable | Administrador/Gerente activo | Vendedor activo |
| --- | --- | --- |
| Crear cliente desde formulario | Elegir expresamente un perfil elegible | Elegir expresamente su propio UUID, si es elegible. |
| Vincular un cliente histórico con UUID NULL | Selección manual autorizada | No; conservar el estado pendiente. |
| Reasignar cliente ya vinculado | Otro perfil elegible, con confirmación y versión vigente | No; conservar la asignación. |
| Editar otros datos de un cliente | Conservar UUID y texto, incluso inactivos o pendientes | Igual, sujeto al permiso actual de editar Clientes. |
| Vaciar un UUID ya vinculado | No ofrecer durante esta fase | No. |

Es una restricción nueva del campo de asignación, coherente con los controles de Leads/Oportunidades; no se presenta como permiso ya existente de Clientes. Se mantienen los tres roles y los permisos actuales sobre el resto del cliente.

Para un alta vinculada, el backend obtiene del perfil validado el texto inicial de `responsable`. En clientes existentes, incluso al reasignar, conserva el texto original byte a byte. La UI muestra como responsable actual la identidad del UUID y deja el texto como dato histórico separado. No se reconstruye el UUID a partir del texto.

**Caso Ana García:** conservar `responsable = 'Ana García'`, `responsable_id = NULL` y todos los demás valores. Ni nombres coincidentes futuros ni el usuario que abra el formulario provocan una vinculación. Una eventual asignación solo se hará mediante acción posterior expresa de Administrador/Gerente; el texto original permanece.

## 4. Riesgos de migración

| Riesgo | Tratamiento propuesto |
| --- | --- |
| Vincular por nombre a la persona equivocada | Ningún JOIN por nombre, normalización aproximada, coincidencia de email ni backfill. Selección por UUID verificado. |
| Creer que la FK autoriza asignaciones | La FK valida existencia; no comprueba activo, nombre ni autoridad del actor. Exigir control de base de datos para escrituras directas. |
| Mezclar responsable actual y texto original | Lectura dual con etiquetas explícitas. El nombre histórico no sustituye una identidad UUID vigente. |
| Romper clientes legados o inactivos al editar | Validar elegibilidad solo cuando se incorpora o cambia el UUID. Conservar el valor actual al editar otros campos. |
| Perder una reasignación por edición antigua | PATCH de campos modificados y comparación con el `updated_at` leído; conflicto visible sin reintento ciego. |
| Inactivación o cambio de nombre entre selección y guardado | Revalidación transaccional y bloqueo del perfil al asignar; la operación concurrente se serializa. |
| Romper conversión de Leads | Coordinar `convert_lead` antes de rechazar todos los INSERT con UUID NULL. No copiar nombres como identidades. |
| Abrir Profiles a Gerente/Vendedor | No ampliar sus políticas ni reutilizar el endpoint administrativo. Usar un directorio mínimo expresamente autorizado. |
| Bloqueos DDL | Ensayo con volumen representativo, ventana aprobada y timeouts; si se exceden, rollback y revisión. No prometer ausencia de bloqueos. |
| Eliminar un usuario con referencias | RESTRICT impide perder vínculos; también puede bloquear la eliminación de Auth por la cascada a Profiles. Usar inactivación, sin cambiar Auth. |
| Rollback a interfaz que solo entiende texto | Mantener esquema y una versión de aplicación con lectura dual; la UI antigua podría mostrar una asignación desactualizada. |
| Activar solo la ampliación SQL | El UUID sería editable con los grants actuales sin la regla comercial. No habilitar el flujo hasta completar y probar las defensas. |

Las comprobaciones de FK no equivalen a autorización RLS y las restricciones entre tablas requieren un diseño adicional; no se propone un CHECK que consulte Profiles. Véanse [RLS de PostgreSQL](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) y [restricciones de PostgreSQL](https://www.postgresql.org/docs/current/ddl-constraints.html).

## 5. SQL propuesto, sin ejecutar

Archivo separado: [phase-7c23-client-responsibles.proposed.sql](sql/phase-7c23-client-responsibles.proposed.sql).

Contiene preflight de columnas, una transacción con timeouts, adición de `responsable_id`, FK RESTRICT, índice parcial y consultas posteriores de estructura. Está fuera de cualquier directorio de migraciones automáticas. La reejecución debe fallar por objeto existente para exigir revisión de deriva; no se usa `IF NOT EXISTS` para ocultar un estado inesperado.

El cambio central es:

```sql
ALTER TABLE public.clientes ADD COLUMN responsable_id uuid;
ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_responsable_id_fkey
  FOREIGN KEY (responsable_id) REFERENCES public.profiles(id)
  ON UPDATE RESTRICT ON DELETE RESTRICT;
CREATE INDEX clientes_responsable_id_idx
  ON public.clientes (responsable_id)
  WHERE responsable_id IS NOT NULL;
```

**Alcance deliberado:** este SQL cubre únicamente la expansión estructural. No instala el futuro directorio, trigger de integridad, contrato de guardado ni cambios de conversión; no debe aprobarse como solución funcional completa. Sus definiciones finales serán parte de la implementación posterior y deberán revisarse antes de ejecutar cualquier migración. El archivo no contiene DML, cambios de RLS, grants ni funciones de Auth. No se ejecutó siquiera en una transacción con rollback.

Agregar una columna nullable sin default permite conservar las filas existentes con UUID NULL. La DDL puede tomar bloqueos y la FK/índice requiere una evaluación operativa del entorno; los límites de cinco segundos para adquirir bloqueo y treinta por sentencia son parámetros iniciales a ensayar, no una garantía de rendimiento. Referencia: [ALTER TABLE de PostgreSQL](https://www.postgresql.org/docs/current/sql-altertable.html).

Antes de una aplicación autorizada se debe registrar, mediante lecturas aprobadas:

1. Versión real de PostgreSQL; tipos/defaults, PK/UNIQUE de `profiles.id`, constraints, índices, triggers y número de clientes.
2. Definiciones exactas de `pg_policies`, flags RLS/FORCE, propietarios y ACL de Clientes/Profiles, incluidos grants de columnas. Comparar su igualdad después, exceptuando la nueva columna y su FK/índice.
3. Definiciones, firmas, owners, permisos EXECUTE y `search_path` de `active_role`, directorios y `convert_lead`; esquemas expuestos por la API. No asumir que están desplegados por existir localmente.
4. Copia recuperable autorizada y comparación de `id`, `responsable`, `updated_at` y relaciones comerciales. La expansión no debe disparar actualizaciones de filas.
5. Derechos efectivos sobre la nueva columna: un grant a toda la tabla suele cubrirla; no añadir grants por intuición. Confirmar que `anon` no obtiene lectura ni escritura de tabla o columna nueva.

Con escrituras suspendidas, inmediatamente después de la expansión todos los UUID deben seguir NULL. Cualquier vinculación en ese momento exige detenerse e investigar. Las verificaciones globales necesitan un operador que pueda ver toda la tabla; un SELECT filtrado por RLS no prueba integridad global.

## 6. Cambios requeridos en frontend y backend

### Frontend y contratos

| Archivo o área | Cambio posterior requerido |
| --- | --- |
| `clients/types.ts`, `lib/supabase/database.types.ts` | Añadir `ownerId: string \| null` y `responsable_id: string \| null`. Conservar `owner` como texto histórico compatible y tipar el directorio mínimo. Separar entradas de contacto y asignación. |
| `client-validation.ts` | Eliminar dependencia operativa de `OWNERS`; validar formato UUID, selección elegible y permisos para mejorar feedback. Distinguir conservar de reasignar; no exigir cambiar un legado al editar teléfono. |
| `client-form.tsx` | Selector con UUID, sin elección automática al crear; valor actual histórico independiente. Mostrar carga, vacío, error y reintento. Si falla el directorio, bloquear nuevas asignaciones y permitir conservar la existente al editar otros campos. |
| `clients-provider.tsx` | Mantener cache/deduplicación de Clientes; cargar el directorio una vez por sesión/alcance autorizado y refrescarlo tras cambios relevantes. Diferenciar fallo de clientes y fallo de responsables. |
| `clients.service.ts` | Leer ambos campos, escribir solo campos permitidos y usar versión esperada. Un PATCH ordinario no debe reenviar un UUID obsoleto ni el texto histórico. Distinguir UUID no válido, no autorizado, conflicto y dependencias comerciales. |
| `clients-view.tsx`, `clientes/page.tsx` | Filtros por UUID para vinculados; filtros históricos separados para UUID NULL. Mantener enlaces legados como búsqueda de texto histórico, nunca convertir ese texto a UUID. |
| `overview/overview-view.tsx` | Agrupar vinculados por UUID; históricos por una clave separada de texto. No sumar ambos como si fueran una persona ni fusionar homónimos. Mantener totales. |
| Fixtures y mocks | Añadir UUID nullable y el directorio; retirar la dependencia de nombres ficticios como validación de negocio. Los datos sintéticos serán solo fixtures en memoria, no cuentas de Auth. |

El directorio tendrá dos usos distintos: **candidatos asignables** y **etiquetas históricas**. Recibir un perfil para mostrar una referencia no le concede autoridad al actor para asignarlo.

Dirección visual de referencia: `DESIGN.md`, CRM ENERGY 3 / RHYTHM 2 / MOTION 2. Se conservarán componentes, tokens y composición actuales. Las mejoras del selector tienen una finalidad concreta: identificar personas sin confusión y explicar estados reales. No se crea interfaz, asset, fotografía, iconografía ni navegación nueva en esta fase.

### Defensa de las escrituras

Se recomienda mantener el cliente de sesión y el control RLS de Clientes, añadiendo un trigger de integridad que cubra INSERT/UPDATE directos. Una Server Action por sí sola no protege la tabla porque existe acceso REST con los grants actuales. Si se introduce una acción o RPC de guardado, debe validar de nuevo la sesión y las entradas; no usar un cliente administrativo para Clientes.

Contrato del control futuro, pendiente de codificación y revisión:

```text
actor = auth.uid() + active_role() existentes; no aceptar rol enviado por el cliente.
En UPDATE: preservar responsable original; rechazar alteración directa del texto.
Comparar responsable_id mediante IS DISTINCT FROM, incluyendo el caso NULL.
Si no cambia el UUID: permitir conservar legado, inactivo o incompleto.
Si cambia: exigir acción autorizada por la matriz, UUID existente y perfil elegible.
Rechazar vaciar una referencia ya vinculada y reasignaciones del Vendedor.
Validar y bloquear el perfil durante la nueva asignación, en la misma transacción.
En alta vinculada: derivar responsable desde el perfil, sin confiar en el texto recibido.
Mantener updated_at y los permisos RLS de Clientes; no actualizar otros módulos.
```

El control de existencia/actividad en Profiles puede necesitar una función privada con lectura privilegiada y salida mínima, siguiendo el patrón local de triggers de Leads/Oportunidades. Eso requiere revisión específica de owner, privilegios y alcance; no concederle ejecución pública ni modificar `active_role`. La autorización de acceso a la fila Cliente sigue en RLS. No deshabilitar políticas ni triggers para solucionar errores.

Para concurrencia, los servicios oficiales deben enviar el `updated_at` leído y actualizar solo si coincide. Cero filas modificadas implica recargar y resolver, sin reemplazar datos recientes. Probar también la precisión del timestamp. Esta precondición del servicio no se presenta como garantía frente a cualquier escritura SQL ajena al contrato.

### Conversión de Leads

La expansión nullable conserva el funcionamiento actual de `convert_lead`; continuará creando filas sin UUID hasta adaptarla. Su actualización debe distinguir:

- **Cliente nuevo:** considerar exclusivamente `lead.responsable_id` como identidad fuente. Copiarlo solo si el perfil sigue siendo elegible y la asignación está autorizada para el actor según el contrato aprobado de conversión. Nunca resolver por nombre.
- **Fuente nula, inactiva, incompleta o no asignable por ese actor:** durante la transición conservar el texto y UUID NULL, con resultado explícito pendiente de vinculación; no sustituir por el actor ni por otro usuario. Para exigir UUID en todas las altas futuras hará falta resolver este caso mediante selección autorizada dentro de la conversión.
- **Cliente existente vinculado a un Lead:** conservar íntegros su UUID y texto; la vinculación comercial no reasigna al cliente.
- **Reintento o conflicto de correo:** conservar la idempotencia y confirmación existentes; no crear otro cliente ni duplicar una asignación.

La política recomendada para Vendedor al crear desde formulario no autoriza a apropiarse de un cliente histórico ni a copiar un UUID ajeno desde un Lead. El contrato de conversión debe resolver esa diferencia expresamente.

## 7. Compatibilidad con RLS

### Lo que permiten las políticas actuales

Un SELECT directo de Profiles, incluso desde servidor con el JWT del usuario, devuelve únicamente el perfil propio a Gerente/Vendedor. Una RPC `SECURITY INVOKER` que simplemente haga ese SELECT tiene la misma limitación. Mover la consulta al servidor no amplía derechos. Un join desde Clientes tampoco convierte Profiles en un directorio visible.

El repositorio ya define cuatro directorios mínimos con autorización explícita:

| RPC | Evidencia |
| --- | --- |
| `lead_responsibles()` | `supabase/leads.sql:93-102` |
| `opportunity_responsibles()` | `supabase/opportunities.sql:91-100` |
| `sale_responsibles()` | `supabase/sales.sql:117-124` |
| `task_responsibles()` | `supabase/tasks.sql:44-51` |

Devuelven `id, nombres, apellidos, activo, rol`; autorizan mediante `active_role()` y contemplan inactivos con referencias de su módulo. Son `SECURITY DEFINER`. No devuelven email ni metadatos de Auth.

### Acceso mínimo recomendado

Para nuevas opciones activas se puede reutilizar una RPC existente, por ejemplo `lead_responsibles`, **si su despliegue y permisos reales se verifican**. Filtrar sus resultados por actividad, integridad y matriz del actor reutiliza una vía ya autorizada, sin ampliar la lectura directa de Profiles. No depender de datos demo si falta la RPC: mostrar error de configuración.

Esa reutilización no resuelve un inactivo referenciado únicamente desde Clientes. La solución completa recomendada es proponer `client_responsibles()` con el mismo DTO mínimo y autorización explícita de perfil activo. Debe devolver activos del ámbito aprobado y los inactivos necesarios para mostrar referencias de Clientes visibles para el actor. Un campo de elegibilidad puede derivarse de esos datos, pero el guardado debe volver a comprobarlo.

**Distinción de seguridad:** una RPC `SECURITY DEFINER` no lee Profiles bajo la RLS del llamador; usa los privilegios de su propietario. Mantener las políticas intactas no implica que esa lectura sea RLS pura. La nueva RPC sería una capacidad privilegiada mínima que debe aprobarse y revisarse expresamente. Si se prohíbe toda lectura privilegiada adicional, no puede prometerse un directorio completo de equipo con las políticas actuales: usar las RPC ya autorizadas y mostrar un estado histórico no disponible cuando falte el detalle. Referencias: [funciones Supabase](https://supabase.com/docs/guides/database/functions) y [modelo RLS de PostgreSQL](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

Condiciones para la futura RPC específica:

1. Autorización derivada de `auth.uid()` y `active_role()`, no de parámetros de rol o UUID de actor. Rechazar `anon`, sesión Auth anónima, perfil ausente, inactivo o rol inválido.
2. DTO cerrado, sin `SELECT *`, email, tokens ni acceso a `auth.users`; sin SQL dinámico ni parámetros arbitrarios de columnas.
3. `search_path = ''`, nombres cualificados, owner y privilegios comprobados; retirar EXECUTE de PUBLIC/anon y otorgar solo lo necesario a authenticated, siempre con validación interna.
4. No consultar Clientes con privilegios elevados para ignorar su visibilidad. La selección de referencias históricas debe conservar la evaluación de sus RLS, por ejemplo obteniendo primero las referencias bajo el contexto invocador y resolviendo solo esos perfiles mediante un helper acotado y revisado. No confiar en una lista de UUID enviada por navegador como prueba de acceso.
5. No ampliar grants ni políticas de Profiles. Gerente/Vendedor deben seguir viendo solo su fila mediante SELECT directo después del cambio. No exponer `nexo_private` como esquema API.
6. No modificar ni reutilizar el servicio administrativo de Usuarios; no usar `service_role` en navegador ni como atajo de servidor para este directorio.

El detalle invocador/helper es una decisión técnica que exige revisión de privilegios y pruebas de acceso antes de generar el SQL funcional final. No se incluye una RPC incompleta en el archivo estructural ni se afirma que ya exista una solución validada en PostgreSQL real.

## 8. Estrategia de transición

**Expansión:** tras aprobación y ensayo, agregar solo la estructura. Todos los clientes actuales conservan texto, ID, fechas y relaciones; el UUID empieza NULL. No ejecutar ningún seed ni script histórico de esquema/roles.

**Lectura compatible:** implementar ambos campos y el directorio verificado. Si hay UUID, mostrar su identidad; si no, mostrar texto pendiente. Un fallo de directorio no cambia datos. Las consultas de clientes conservan contrato, paginación por lotes y deduplicación existentes.

**Escritura controlada:** activar nuevas opciones reales junto con los controles de base de datos, concurrencia y cambios coordinados de conversión. Durante coexistencia, NULL sigue siendo válido para filas anteriores y conversiones pendientes explícitas. Esa excepción no debe confundirse con una alta plenamente vinculada. No imponer todavía `NOT NULL` ni un rechazo global de INSERT NULL.

**Vinculación manual:** Administrador/Gerente revisa cada cliente pendiente, selecciona UUID verificado y confirma. No hay trabajo masivo automático. Ana García permanece pendiente hasta una decisión humana posterior; abrir o guardar otros campos no es esa decisión.

**Consolidación futura:** medir pendientes y conflictos con datos reales autorizados. Eliminar compatibilidad de escritores antiguos solo después de adaptar todos los productores de Clientes y verificar que no quedan pestañas/versiones antiguas creando texto demo. Conservar el campo histórico incluso entonces. Un endurecimiento global de altas o una bitácora de eventos adicional requerirá alcance y SQL revisados; no forma parte de la expansión propuesta.

## 9. Plan de rollback

| Momento | Respuesta |
| --- | --- |
| Falla de DDL antes del COMMIT | La transacción revierte. El operador debe emitir ROLLBACK si su sesión queda abortada; investigar sin reintento automático ni reaplicar `schema.sql`. |
| Expansión aplicada, sin uso de UUID | Conservar estructura aditiva y mantener aplicación compatible. No es necesario eliminar columna/FK para detener el despliegue. |
| Ya existen nuevas asignaciones o reasignaciones | Detener nuevas asignaciones y desplegar una versión conocida con lectura dual. Conservar UUID, FK y texto original. |
| Error de directorio | Mantener datos y edición de otros campos; mostrar texto histórico con estado no disponible. No escribir NULL como reparación. |
| Defecto en validación | Suspender la operación de asignación afectada y corregir sus controles. No deshabilitar RLS, Auth ni restricciones para continuar. |

La versión antigua basada solo en `owner` no es un rollback válido tras reasignar: el texto original puede diferir del responsable UUID actual. Preparar y probar previamente una versión compatible de recuperación. No volver a generar texto desde UUID, no vaciar UUID ni ejecutar DROP COLUMN, DROP CONSTRAINT o borrados para restaurar la interfaz. Una restauración de backup que pueda sobrescribir trabajo posterior exige un plan y una autorización separados.

## 10. Pruebas necesarias

### Cobertura actual y límites

`tests/crm.spec.ts:73` prueba CRUD, filtros y recarga; `:176` prueba acciones visibles por rol. Su mock acepta POST/PATCH sin comprobar responsables (`:45-58`). `tests/directories-ui.spec.ts:144` y `:241` cubren temas, teclado, tamaños y filtros textuales. Ninguna prueba demuestra hoy la nueva FK o la autorización de UUID.

Playwright usa Supabase simulado en `127.0.0.1:54321` (`playwright.config.ts:31-44`), no PostgreSQL real. `tests/support/auth-server.mjs:112` simula que solo Administrador ve todo Profiles. Los scripts `supabase/tests/auth_roles.sql`, `leads.sql`, `opportunities.sql`, `sales.sql`, `tasks.sql` y `user_management.sql` sí ejercitan reglas SQL, pero son manuales y escriben datos. No se ejecutaron: terminar con ROLLBACK no los convierte en operaciones de solo lectura. No hay una prueba SQL dedicada a responsables UUID de Clientes.

### Matriz de aceptación propuesta

Todas las escrituras siguientes son pruebas **futuras**, en base aislada expresamente autorizada. En esta fase solo se define el plan; los fixtures de UI en memoria no crean cuentas ni datos de producción.

| ID | Caso | Evidencia exigida |
| --- | --- | --- |
| T01 | Alta con usuario real por Administrador/Gerente | Payload y fila contienen el UUID elegido; texto inicial obtenido del perfil; persistencia tras recarga. |
| T02 | Alta por Vendedor completo | Solo permite su UUID tras elección expresa; manipular otro UUID fracasa también por REST. |
| T03 | Reasignar por Administrador/Gerente | Cambia UUID al elegido; conserva exactamente texto original; ninguna relación comercial cambia. |
| T04 | Reasignar por Vendedor | Rechazo en backend aun manipulando formulario, acción o REST; fila idéntica. |
| T05 | Cliente histórico Ana García | Sigue NULL y texto idéntico tras expansión, lectura, abrir/cancelar y editar teléfono/notas. No se vincula por coincidencia. |
| T06 | Otro histórico o texto Sin asignar | Editar datos de contacto no exige responsable demo ni modifica la asignación. Vendedor no puede apropiarse del NULL. |
| T07 | Perfil inactivo histórico | Conserva UUID y texto; muestra estado inactivo cuando hay detalle autorizado; edición ordinaria funciona; no es candidato nuevo. |
| T08 | Perfil incompleto activo | Se identifica con UUID y estado real, sin nombre inventado; no recibe nueva asignación. Completar datos por flujo existente permite elegirlo después. |
| T09 | Perfil asignado pierde nombre | Permite editar contacto y conserva referencia; ninguna sustitución automática por otro perfil. |
| T10 | Nombres duplicados | Dos opciones inequívocas por UUID; elegir una no vincula a la otra. Filtros y Overview mantienen grupos separados. |
| T11 | UUID inexistente o mal formado | Rechazo sin escritura parcial; probar FK y validación, sin depender de un único código de error según qué capa rechace primero. |
| T12 | UUID válido inactivo/incompleto | INSERT y PATCH directos fracasan para nueva asignación, aunque el UUID exista. |
| T13 | Conservar frente a vaciar | UUID sin cambios se acepta en edición ordinaria; cambiarlo a NULL se rechaza en el contrato propuesto. |
| T14 | Manipular texto histórico | Un PATCH directo que lo reescriba fracasa; reasignar no lo reemplaza. |
| T15 | Edición obsoleta | Dos sesiones con la misma versión: la segunda recibe conflicto sin deshacer la reasignación de la primera. |
| T16 | Inactivación o renombre concurrente | Guardado y cambio de perfil se serializan; no se incorpora una asignación inválida por una lectura antigua. |
| T17 | RLS de Clientes | Tres roles activos conservan acceso actual; Vendedor no elimina; anon, perfil inactivo/ausente y sesión anónima no asignan ni escriben. |
| T18 | RLS directa de Profiles | Gerente/Vendedor continúan viendo solo su fila; Administrador activo ve equipo. Comparación de políticas y grants antes/después. |
| T19 | Directorio/RPC | Roles autorizados obtienen solo DTO previsto; sin emails/metadatos; anon/inactivo rechazados. Inactivos solo según referencias visibles. |
| T20 | Directorio falla o está vacío | Carga, vacío, error y reintento explícitos; nunca fallback a demo ni guardado silencioso de otra persona. |
| T21 | Convertir Lead nuevo | Comprobar fila Cliente real, no solo respuesta RPC; UUID fuente solo bajo reglas aprobadas, o NULL pendiente explícito. |
| T22 | Vincular Lead a cliente existente | Conserva ambos campos, idempotencia y confirmación de correo; no duplica ni reasigna. |
| T23 | Relaciones comerciales | Oportunidades/Ventas/Tareas conservan cliente_id, enlaces y selección; no heredan responsable de Clientes por una regla nueva implícita. |
| T24 | Reportes y cálculos | Igualdad de indicadores, fechas, CSV e importes antes/después de cambiar solo responsable. Ventas mantiene subtotal, descuentos, impuestos y total exactos. |
| T25 | Integridad de la expansión | Igualdad de filas, IDs, texto, timestamps y relaciones; UUID todos NULL al terminar; FK/índice correctos; políticas/Auth intactos. |
| T26 | Recuperación | Ensayar fallo de transacción y volver a versión compatible tras una reasignación sin eliminar ni reescribir datos. |
| T27 | UI y accesibilidad | Temas Claro/Oscuro/Sistema; anchos 320/390/768/1024/1440; teclado, foco, Escape, 200% zoom, nombres largos, objetivos táctiles y contraste. |
| T28 | Consultas y sesiones | Mantener deduplicación de Clientes y presupuesto de consultas; directorio no comparte datos entre sesiones ni sigue usando cache de un actor anterior. |

Dependencias a verificar: `opportunities/use-opportunities.ts:24`, `sales/use-sales.ts:24`, `tasks/use-tasks.ts:17` y `reports/reports-view.tsx:32` consumen Clientes. `reports/metrics.ts:46`, `:57` cuenta por estado/fechas, sin depender del responsable. `tests/leads.spec.ts:39-45` simula conversión sin materializar el Cliente: requiere ampliar cobertura de integración real. `supabase/tests/leads.sql:77-81` ofrece un patrón para conservar inactivos sin ampliar SELECT de Profiles.

Comandos propuestos para la fase de implementación, **no ejecutados ahora**:

```text
npm run typecheck
npm run lint
npm run test:e2e -- tests/crm.spec.ts tests/directories-ui.spec.ts tests/leads.spec.ts tests/opportunities.spec.ts tests/sales.spec.ts tests/reports.spec.ts tests/tasks.spec.ts tests/calendar-dates.spec.ts tests/overview-ui.spec.ts tests/performance.spec.ts
npm run build
```

Añadir los casos de validación y una prueba SQL dedicada de Clientes en el entorno aislado. Ejecutar la suite completa una vez después de la focalizada. No utilizar usuarios ni credenciales de producción para hacer pasar pruebas.

## 11. Orden exacto de implementación

1. **Estado actual de esta entrega:** revisar informe y SQL como propuesta. No ejecutar nada de lo propuesto sobre una base ni cambiar el flujo funcional.
2. **Autorización expresa de implementación:** aprobar estructura, preservación del texto, elegibilidad, matriz de asignación, acceso mínimo por RPC y tratamiento de conversión pendiente. Esta entrega no constituye esa autorización.
3. **Preflight remoto de solo lectura autorizado:** obtener catálogo real, RPC, propietarios, ACL, RLS, triggers, versión y baseline; resolver deriva antes de escribir SQL funcional final.
4. **Preparar localmente el cambio completo:** contratos duales, selector real, servicios con versión, trigger de integridad, directorio acotado, adaptación de `convert_lead`, fixtures y pruebas. Leer nuevamente las guías de la versión instalada de Next antes de escribir código. No tocar `.env.local`.
5. **Revisión del SQL funcional y recuperación:** entregar para revisión definiciones finales de funciones/triggers y su autorización, además del SQL estructural ya propuesto. No aprobar una RPC privilegiada solo por analogía con las existentes.
6. **Ensayo aislado autorizado:** aplicar expansión y controles en base de prueba, comprobar rollback, ejecutar matriz T01-T28 y validaciones locales. Corregir antes de preparar despliegue real.
7. **Aprobación expresa de producción:** revisar evidencia del ensayo, diff final, ventana, backup y versión compatible de recuperación. La autorización de desarrollo no implica autorización para escribir producción.
8. **Ventana de expansión:** suspender escrituras de Clientes y conversiones, capturar baseline, aplicar transacción aditiva y comprobar NULL e igualdad de datos/políticas. Ante divergencia, detener sin enlazar clientes.
9. **Despliegue coordinado:** instalar directorio y controles revisados junto con la conversión adaptada y aplicación de lectura dual; comprobar que no quedan escritores antiguos activos. Mantener la compatibilidad NULL documentada, sin endurecimiento global prematuro.
10. **Activación controlada:** habilitar nuevas asignaciones reales solo cuando frontend, backend y DB estén alineados. Verificar roles, errores y preservación; reanudar operaciones y observar conflictos/fallos con datos autorizados.
11. **Revisión manual posterior:** vincular históricos únicamente mediante acciones expresas de Administrador/Gerente. No incluir a Ana García en un proceso automático ni completar perfiles con datos inventados.
12. **Cierre con evidencia:** comparar integridad y regresiones comerciales, registrar resultados y pendientes. Mantener campo histórico y UUID nullable; cualquier retirada de compatibilidad o ampliación de alcance requiere revisión independiente.

### Delivery Gate Anti Slop de esta entrega

Modo `during`, elección expresa del usuario en esta sesión. Skills leídas: core, UI, human y layoutmobile instaladas en `.codex/skills/`. El gate se aplica al entregable documental; no certifica una interfaz ni una migración ejecutadas.

- **PASS, R-02:** informe y SQL revisados para excluir el carácter de guion largo prohibido en texto nuevo.
- **PASS, R-17/R-18/R-23/R-36/R-38 y C-5:** hechos reales atribuidos al usuario, evidencia local con archivo/línea y propuestas etiquetadas; sin UUID, personas, assets, estadísticas ni resultados de pruebas inventados.
- **PASS, Purpose-Gate y R-31:** las decisiones escritas tienen motivo verificable: UUID por identidad, NULL por compatibilidad, RESTRICT por referencias, texto original por conservación y directorio mínimo por autorización.
- **PASS, C-3:** los once apartados corresponden al informe solicitado; SQL separado enlazado y límites funcionales explícitos.
- **PASS, R-35 en alcance documental:** revisión estática de archivos, referencias y diff; SQL, build, pruebas y clics de UI no ejecutados ni presentados como aprobados.
- **No aplica, Hard Gate visual y Quality Locks de UI:** no se entregan pantallas, estilos, navegación ni componentes modificados. Contraste, teclado, temas, estados y responsive quedan como aceptación T20/T27; no se atribuyen resultados actuales.
- **No aplica, Liveliness visual:** no se genera diseño. Se conserva como referencia la dirección CRM existente de `DESIGN.md`, ENERGY 3 / RHYTHM 2 / MOTION 2; no se inventa otra dirección para un cambio de integridad.
