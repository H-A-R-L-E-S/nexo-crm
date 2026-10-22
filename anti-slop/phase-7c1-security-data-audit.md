# Nexo CRM: auditoría de seguridad y acceso a datos, Fase 7C.1

Fecha: 2026-10-21  
Alcance: inspección estática del repositorio, SQL versionado, autorización, consultas, integridad y pruebas locales.  
Restricción aplicada: no se modificaron RLS, Supabase Auth, SQL, datos, roles, permisos, contratos ni lógica comercial. No se consultó un proyecto Supabase real.

## 1. Resumen ejecutivo

El diseño versionado tiene una defensa razonable en profundidad para perfiles, Leads, Oportunidades, Ventas, Tareas y administración de usuarios. Las rutas privadas validan la identidad mediante `auth.getUser()`, el layout exige un perfil activo y las operaciones administrativas vuelven a comprobar en servidor que el actor sea Administrador. Las políticas y RPC versionadas consultan `nexo_private.active_role()`, que rechaza perfiles inactivos y sesiones anónimas. Las funciones `SECURITY DEFINER` fijan `search_path = ''` y sus permisos se revocan antes de conceder solo lo necesario.

No se demostró una vulnerabilidad crítica en el código inspeccionado. Tampoco puede afirmarse que producción tenga esta configuración: las migraciones son manuales y no se obtuvo evidencia del catálogo remoto. Esta es la principal incertidumbre de seguridad.

Los riesgos confirmados de mayor prioridad son:

1. `supabase/schema.sql` continúa concediendo CRUD anónimo sobre Clientes. `auth_roles.sql` lo revoca si se aplica después, pero volver a ejecutar el esquema inicial reabre el acceso. El riesgo es operativo y alto.
2. Clientes conserva `responsable` como texto libre y la UI solo ofrece tres nombres ficticios. No existe FK a `profiles`, control de usuario activo ni identidad estable.
3. Clientes no usa concurrencia optimista. `updated_at` se actualiza por trigger, pero `UPDATE` y `DELETE` filtran solo por `id`, por lo que una edición obsoleta puede sobrescribir otra.
4. F-02 y F-03 siguen vigentes: Reportes descarga cinco dominios completos y los directorios descargan colecciones completas antes de filtrar, agregar y paginar en el navegador.
5. Clientes, Leads y Oportunidades permiten escritura directa desde el navegador. La autorización de rol queda correctamente en RLS/triggers según los archivos versionados, pero Clientes carece de las restricciones de asignación y versión que ya existen en otros módulos.

La prioridad para 7C.2 debe ser obtener una fotografía de solo lectura del catálogo remoto, cerrar el riesgo de reaplicar `schema.sql`, diseñar la migración de responsables de Clientes y añadir concurrencia optimista a ese módulo. La paginación y los agregados deben abordarse después mediante contratos pequeños con pruebas de paridad y RLS.

## 2. Estado de seguridad actual

### 2.1 Controles confirmados en el repositorio

- El proxy cubre todas las rutas salvo assets y valida la sesión contra Supabase con `auth.getUser()`. No autoriza confiando solo en una cookie o en `getSession()`.
- El layout CRM ejecuta `requireProfile()`, que exige perfil existente, rol reconocido y `activo = true`.
- `/configuracion/usuarios` vuelve a exigir Administrador en un Server Component. Ocultar el enlace no es el único control.
- Cada Server Action de Usuarios obtiene `adminContext()` antes de leer o mutar. El cliente `service_role` se crea después de esa comprobación y solo se utiliza para `auth.admin.createUser()`.
- La clave administrativa está en una variable sin prefijo `NEXT_PUBLIC_` y el módulo que la usa importa `server-only`.
- Las altas de Auth comienzan inactivas durante provisión. Si falla la configuración posterior, la cuenta queda inactiva y no se elimina silenciosamente.
- Los RPC de Usuarios, Ventas y Tareas vuelven a validar rol activo en PostgreSQL. No dependen de la interfaz.
- Las FK relevantes usan `ON DELETE RESTRICT` para conservar historial. Los items de una venta usan `ON DELETE CASCADE` respecto de su venta.
- Ventas y Tareas usan `request_id` para idempotencia y `updated_at` para control de versión.
- Leads y Oportunidades comparan `updated_at` en sus actualizaciones desde el cliente.
- La exportación CSV de Reportes neutraliza prefijos de fórmula `=`, `+`, `-` y `@`.
- El límite de error registra únicamente un mensaje fijo y `error.digest`; no se encontró registro de tokens, contraseñas ni payloads comerciales.

### 2.2 Límites de la evidencia

- No se inspeccionó el catálogo de una base remota.
- No se comprobó la configuración real de registro público, login anónimo, JWT, claves API ni rotación de secretos.
- Los tests Playwright interceptan Supabase o usan un servidor local simulado. No demuestran RLS real.
- Los scripts `supabase/tests/*.sql` son pruebas útiles del diseño, pero no fueron ejecutados en esta fase porque no existe una conexión de prueba autorizada.
- No se abrió ni se imprimió `.env.local`.

## 3. Riesgos confirmados

| ID | Criticidad | Hallazgo confirmado | Impacto | Evidencia de repositorio |
| --- | --- | --- | --- | --- |
| S-01 | Alta | El esquema inicial concede CRUD de Clientes a `anon` con políticas `using (true)` y `with check (true)`. | Una aplicación accidental o fuera de orden puede permitir lectura, creación, edición y borrado sin sesión. | `supabase/schema.sql`; la mitigación posterior está en `supabase/auth_roles.sql`. |
| S-02 | Alta | Clientes usa un responsable textual y ficticio, sin FK, UUID ni comprobación de actividad. | Asignaciones inválidas, homónimos, pérdida de trazabilidad y datos que no representan usuarios autorizados. | `src/features/clients/demo-data.ts`, `client-form.tsx`, `clients.service.ts`, `schema.sql`. |
| S-03 | Alta | La edición y eliminación de Clientes no comparan `updated_at`. | Último escritor gana; una pestaña obsoleta puede sobrescribir o borrar cambios recientes. | `clients.service.ts` filtra solo por `id`. |
| S-04 | Media-alta | Reportes descarga cinco colecciones autorizadas completas y agrega en el navegador. | Escala lineal, mayor exposición de datos al cliente y respuestas costosas. | `reports-view.tsx`, `metrics.ts`. |
| S-05 | Media-alta | Clientes, Leads, Oportunidades, Ventas, Tareas y Usuarios cargan colecciones completas por lotes antes de paginar localmente. | Coste y memoria crecen con toda la organización, no con la página visible. | Servicios y vistas; F-03 ya documentado en 7B.2. |
| S-06 | Media | La gestión de SQL es manual y no hay historial de migraciones aplicado por entorno. | Es difícil demostrar orden, deriva y reversibilidad; `auth_roles.sql` además advierte que puede sobrescribir una versión posterior del trigger. | Cabeceras de los SQL y README. |
| S-07 | Media | Los tres roles pueden leer todas las filas comerciales en las políticas versionadas. | Si el modelo esperado era cartera por vendedor, hoy existe lectura lateral por diseño. | Políticas `*_read` y `clientes_select_authenticated`. Requiere decisión comercial, no se clasifica como vulnerabilidad sin esa decisión. |
| S-08 | Baja-media | `profiles_read_self` permite leer el propio perfil aunque esté inactivo. | Expone únicamente la propia fila, pero debe confirmarse como comportamiento deliberado. El layout sí bloquea el CRM. | `auth_roles.sql`. |

No se confirmó exposición de `service_role`, bypass administrativo desde Server Actions ni aceptación de rol desde `user_metadata`.

## 4. Hallazgos pendientes de comprobación

1. Si RLS está habilitado y forzado en todas las tablas remotas relevantes.
2. Si permanecen políticas antiguas o permisivas, especialmente las cuatro políticas de desarrollo de Clientes.
3. Si `anon` conserva privilegios de tabla, secuencia o ejecución de funciones.
4. Si todas las firmas de RPC tienen exactamente los `REVOKE` y `GRANT` versionados.
5. Si `nexo_private` no está expuesto por PostgREST y conserva sus privilegios restringidos.
6. Si las funciones `SECURITY DEFINER` remotas fijan un `search_path` seguro y pertenecen a un rol apropiado.
7. Si el registro público y las sesiones anónimas están desactivados en Supabase Auth.
8. Si existen índices, constraints, triggers o columnas que no figuran en los archivos locales.
9. Si el volumen, selectividad y planes reales justifican índices adicionales.
10. Si la regla comercial exige visibilidad global o datos por responsable para Vendedor.
11. Si al desactivar un usuario deben revocarse inmediatamente todas sus sesiones. El código bloquea su siguiente navegación/consulta mediante perfil y RLS, pero no llama a una revocación global de Auth.

## 5. Análisis de RLS y permisos versionados

### 5.1 Matriz de tablas

| Tabla | RLS versionado | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- | --- |
| `clientes` | Sí | Todo perfil activo con rol válido | Todo perfil activo con rol válido | Todo perfil activo con rol válido | Administrador o Gerente activo |
| `profiles` | Sí | Propia fila; Administrador activo ve el equipo | Sin grant directo | Propio nombre/apellido por grant de columnas; administración por RPC | Sin grant |
| `leads` | Sí | Los tres roles activos, todas las filas | Los tres; trigger fuerza al Vendedor como responsable propio | Los tres; Vendedor no puede reasignar | Administrador o Gerente |
| `oportunidades` | Sí | Los tres roles activos, todas las filas | Los tres; trigger controla asignación | Los tres; trigger controla reasignación | Administrador o Gerente |
| `ventas` | Sí | Los tres roles activos, todas las filas | Solo mediante `save_sale` | Solo mediante RPC | Política para borrador y RPC con validación de rol/estado |
| `venta_items` | Sí | Visible cuando la venta padre es visible | Solo mediante `save_sale` | Solo mediante `save_sale` | Solo dentro del flujo de venta |
| `tareas` | Sí | Los tres roles activos, todas las filas | Solo mediante `save_task` | Solo mediante RPC | Solo mediante `delete_task` |

En los archivos finales, `anon` no recibe acceso a las tablas comerciales ni a RPC. La excepción versionada es `schema.sql`, que representa el estado temporal anterior y debe tratarse como artefacto peligroso, no como migración repetible.

### 5.2 Funciones `SECURITY DEFINER`

- Triggers de perfil: `nexo_create_profile`, `nexo_sync_profile_email`.
- Ayudante privado: `nexo_private.active_role`.
- Triggers de integridad: `prepare_lead`, `prepare_opportunity`.
- Directorios mínimos: `lead_responsibles`, `opportunity_responsibles`, `sale_responsibles`, `task_responsibles`.
- Flujos atómicos: `convert_lead`, `save_sale`, `set_sale_status`, `delete_sale`, `save_task`, `set_task_status`, `delete_task`, `admin_update_profile`.
- Ayudantes privados de Ventas y Tareas.

Aspectos positivos: nombres de objetos cualificados, `search_path = ''`, revocación a `public` y `anon`, comprobación interna del actor y bloqueo de filas en operaciones sensibles. El catálogo remoto debe confirmar que no existe una sobrecarga antigua con permisos distintos.

### 5.3 Escalamiento y acceso ajeno

- El rol inicial de un nuevo perfil se fija a Vendedor y no acepta rol/estado desde `user_metadata`.
- Un usuario solo puede cambiar sus nombres por grants de columna. RLS por sí sola no bastaría, pero el grant evita modificar `rol`, `activo` o `email`.
- `admin_update_profile` vuelve a verificar Administrador activo, evita la autodesactivación y protege al último Administrador activo bajo un bloqueo transaccional.
- Vendedor no puede asignar Leads, Oportunidades o Tareas a otra persona según triggers/RPC.
- Vendedor sí puede leer filas de otros responsables porque las políticas SELECT son globales. Esto es una decisión de alcance que debe aprobarse expresamente.
- Las búsquedas por identificador manipulado no exceden lo que RLS permita. Como RLS actual permite lectura global para roles activos, un UUID ajeno no aporta aislamiento por responsable.

## 6. Seguridad de rutas, Server Actions y operaciones

| Superficie | Control servidor o base | Estado de prueba |
| --- | --- | --- |
| Rutas CRM | Proxy valida Auth; layout exige perfil activo | Playwright cubre falta de sesión, cookie falsa, sesión revocada, perfil inactivo/faltante |
| URL de Usuarios | Server Component exige Administrador | Playwright cubre acceso directo de Gerente y Vendedor |
| Server Actions de Usuarios | `adminContext()` en cada acción | Playwright invoca acción con sesión Vendedor y confirma rechazo |
| Alta de usuario | Contexto admin, preflight RPC, `service_role` solo en servidor | Playwright simula éxito y alta parcial; SQL de prueba cubre provisión |
| Cambio de rol/estado | RPC vuelve a comprobar admin, versión y último admin | UI/Server Action simulados y tests SQL versionados |
| Clientes | Operaciones directas; autoridad final en RLS | E2E simulado, sin test SQL dedicado posterior a auth_roles |
| Leads/Oportunidades | RLS + triggers; borrado limitado por rol | E2E simulado y tests SQL versionados |
| Ventas/Tareas | Escritura por RPC con rol, estado, versión e integridad | E2E simulado y tests SQL versionados |
| Exportación de Reportes | Solo datos ya cargados bajo RLS; neutraliza fórmulas | Test de Reportes, no autorización real |

Brechas de prueba recomendadas:

- Ejecutar todos los scripts `supabase/tests/*.sql` en una base efímera creada desde cero y en el orden documentado.
- Añadir prueba SQL específica para Clientes: `anon`, usuario inactivo, DELETE de Vendedor y persistencia de versión.
- Añadir pruebas de acceso por UUID ajeno una vez decidida la visibilidad por responsable.
- Probar firmas antiguas de RPC y privilegios de secuencias/funciones en el catálogo remoto.
- Probar revocación inmediata si se adopta como requisito; hoy solo se garantiza bloqueo en la siguiente operación protegida.

## 7. Estado de consultas y paginación

### 7.1 Estado por módulo

| Módulo | Carga actual | Riesgo y propuesta |
| --- | --- | --- |
| Dashboard | Reutiliza Clientes completo y consulta Tareas | Sustituir por conteos y listas acotadas: altas por período, distribución, recientes y próximas. |
| Clientes | Bloques de 1000, `select('*')`, filtros y páginas locales | Endpoint/RPC paginado con columnas mínimas, filtros normalizados, orden `(created_at desc, id)` y conteo. |
| Leads | Bloques de 500 y páginas locales | Paginación servidor; detalle separado; directorio de responsables mínimo. |
| Oportunidades | Bloques de 500, selección explícita y páginas locales | Paginación servidor con filtros de etapa, responsable, fechas y orden estable. |
| Ventas | Bloques de 500; detalle separado con lectura consistente por reintento | Paginación servidor; conservar RPC atómicos y detalle separado. |
| Tareas | Bloques de 500 más cuatro directorios comerciales y responsables | Consultar solo ventana/estado visible; búsqueda remota para relaciones; evitar cargar cuatro dominios completos. |
| Calendario | Reutiliza la colección completa de Tareas | Consulta por rango visible, usando `fecha_vencimiento` y estados necesarios. |
| Reportes | Cinco dominios completos, agregación en navegador | RPC de solo lectura por período que devuelva métricas y distribuciones agregadas. |
| Usuarios | Bloques de 500 en servidor, luego filtros locales | Paginación servidor administrativa con selección mínima. |

F-04 fue parcialmente corregido en 7B.2: cinco módulos reutilizan la primera carga de Clientes. Eso elimina una petición duplicada, pero el `ClientsProvider` global continúa cargando Clientes incluso en rutas que no deberían necesitar toda la cartera.

### 7.2 Índices

Los SQL ya incluyen índices para estados, responsables, relaciones, fechas relevantes y orden de creación. No se recomienda agregar índices por intuición. Primero deben capturarse `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` en un clon sin datos sensibles o con datos representativos anonimizados.

Candidatos que solo deben evaluarse con planes reales:

- Búsqueda normalizada por nombre, empresa, correo o teléfono, probablemente mediante `pg_trgm` o una columna de búsqueda, si el contrato requiere texto parcial.
- Índices compuestos que coincidan exactamente con filtros y orden, por ejemplo estado/responsable más fecha e `id`.
- Ventana de Calendario por `fecha_vencimiento` con predicado de estado.
- Reportes por fechas de negocio, sin mezclar `date` con `timestamptz` ni romper la zona horaria de Lima.

### 7.3 Compatibilidad con RLS

Los conteos y agregados deben ejecutarse bajo el JWT del usuario, no con `service_role`. Una RPC agregada `SECURITY INVOKER` es preferible cuando las políticas pueden filtrar correctamente. Si se requiere `SECURITY DEFINER`, la función debe reproducir explícitamente el alcance por rol, fijar `search_path`, exponer solo columnas agregadas y recibir períodos validados.

## 8. Problemas de integridad

- Clientes es el único dominio principal cuyo responsable no referencia `profiles`.
- Clientes no tiene `request_id`; un reintento de alta tras una respuesta perdida puede duplicar intentos, aunque el correo único reduce algunos duplicados.
- Clientes no aplica normalización equivalente a Leads para correo y nombres antes de persistir; el índice único usa `lower(correo)`, pero no `trim`.
- Leads, Oportunidades, Ventas y Tareas conservan responsables inactivos históricos y solo exigen actividad al asignar o reasignar. Este patrón es correcto y debe reutilizarse.
- Las FK `RESTRICT` evitan borrar entidades con historial. La UI comunica estos conflictos.
- Ventas y Tareas concentran mutaciones en RPC atómicos. Clientes, Leads y Oportunidades todavía dependen de varias operaciones REST directas; Leads/Oportunidades compensan con triggers y control de versión.
- El detalle de Venta realiza lectura antes/items/después hasta tres veces para evitar combinar versiones distintas. Es correcto como defensa, aunque una RPC de detalle podría ofrecer una fotografía transaccional con menos viajes.

## 9. Responsables ficticios de Clientes

### 9.1 Diagnóstico

`OWNERS` contiene tres personas ficticias. El formulario guarda su nombre en `clientes.responsable`; el filtro de URL y la vista comparan texto. No hay UUID, FK, estado activo, rol ni forma segura de distinguir dos usuarios con el mismo nombre.

### 9.2 Diseño propuesto

1. Añadir de forma aditiva `responsable_id uuid null references public.profiles(id) on delete restrict`, sin retirar aún el texto histórico.
2. Crear un directorio mínimo de responsables de Clientes que devuelva usuarios activos para nuevas asignaciones y usuarios inactivos solo cuando ya estén referenciados.
3. Aplicar el mismo control de asignación de Leads/Oportunidades: los tres roles válidos pueden ser responsables; Vendedor solo puede asignarse a sí mismo si esa es la regla aprobada; Administrador/Gerente pueden asignar a activos.
4. Mostrar en edición al responsable histórico inactivo como no seleccionable para registros nuevos, pero conservarlo mientras el usuario no cambie la asignación.
5. Preparar una tabla de correspondencia revisable entre textos existentes y UUID. No inferir por similitud de nombres ni crear usuarios automáticamente.
6. Clasificar filas sin correspondencia como `Sin resolver`, conservar el texto original y bloquear únicamente el cambio de responsable hasta que un operador autorizado resuelva la identidad.
7. Hacer backfill en una migración separada, transaccional, con conteos antes/después y rollback probado en una copia.
8. Cambiar lecturas y formularios a UUID; mantener temporalmente una proyección del texto histórico.
9. Después de verificar que no quedan nulos no justificados, decidir si `responsable_id` será obligatorio. Retirar `responsable` textual solo en una fase posterior.

Riesgos: asignar un homónimo incorrecto, perder historial, impedir editar clientes antiguos, exponer el directorio completo de perfiles o cambiar sin querer las facultades del Vendedor.

## 10. Concurrencia de Clientes

### 10.1 Estado actual

El trigger `set_clientes_updated_at` cambia la marca temporal en cada actualización. Sin embargo, el servicio envía `UPDATE ... WHERE id = ?` y `DELETE ... WHERE id = ?`. El formulario conserva una copia antigua, pero no transmite su `updatedAt`. Dos usuarios pueden abrir la misma fila; el segundo guardado reemplaza campos del primero sin aviso.

### 10.2 Estrategia propuesta

- Incluir la versión original `updated_at` en edición y eliminación.
- Ejecutar `UPDATE` o `DELETE` con `eq('id', id).eq('updated_at', originalUpdatedAt)` y exigir exactamente una fila devuelta.
- Si no hay fila, distinguir conflicto de inexistencia mediante una lectura autorizada por `id`, sin reintentar automáticamente la escritura.
- Mantener el formulario abierto y ofrecer: recargar versión actual, revisar diferencias o cancelar. No mezclar automáticamente notas o campos sensibles.
- Para alta, añadir un `request_id` único si se necesita idempotencia comparable a Ventas/Tareas.
- Preferir posteriormente un RPC si la migración de responsable necesita validar versión, usuario activo y asignación en una sola transacción.

Riesgo de implementación: usar igualdad de timestamps con un valor reformateado puede producir falsos conflictos. Debe reutilizarse exactamente la cadena devuelta por Supabase y probar precisión, zona horaria y múltiples actualizaciones rápidas.

## 11. SQL de solo lectura para verificar la base real

Ejecutar cada bloque manualmente en Supabase SQL Editor con un rol administrativo. Todos son `SELECT`; no cambian datos ni catálogo.

### 11.1 RLS, propietario y tamaño estimado

```sql
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced,
       pg_get_userbyid(c.relowner) as owner,
       c.reltuples::bigint as estimated_rows
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and c.relname in ('clientes','profiles','leads','oportunidades','ventas','venta_items','tareas')
order by c.relname;
```

### 11.2 Políticas efectivas

```sql
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('clientes','profiles','leads','oportunidades','ventas','venta_items','tareas')
order by tablename, cmd, policyname;
```

### 11.3 Privilegios de tablas y columnas

```sql
select grantee, table_schema, table_name, privilege_type, is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('clientes','profiles','leads','oportunidades','ventas','venta_items','tareas')
  and grantee in ('anon','authenticated','public')
order by table_name, grantee, privilege_type;

select grantee, table_schema, table_name, column_name, privilege_type
from information_schema.column_privileges
where table_schema = 'public'
  and table_name in ('clientes','profiles','leads','oportunidades','ventas','venta_items','tareas')
  and grantee in ('anon','authenticated','public')
order by table_name, grantee, column_name, privilege_type;
```

### 11.4 Funciones, seguridad y `search_path`

```sql
select n.nspname as schema_name, p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       p.provolatile as volatility,
       coalesce(array_to_string(p.proconfig, ', '), '') as function_settings,
       pg_get_userbyid(p.proowner) as owner
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public','nexo_private')
order by n.nspname, p.proname, arguments;
```

### 11.5 Privilegios de ejecución

```sql
select routine_schema, routine_name, specific_name, grantee, privilege_type, is_grantable
from information_schema.role_routine_grants
where routine_schema in ('public','nexo_private')
  and grantee in ('anon','authenticated','public')
order by routine_schema, routine_name, grantee;
```

### 11.6 FK, reglas de borrado y constraints

```sql
select conrelid::regclass as table_name, conname,
       case contype when 'f' then 'FOREIGN KEY' when 'p' then 'PRIMARY KEY'
                    when 'u' then 'UNIQUE' when 'c' then 'CHECK' else contype::text end as type,
       pg_get_constraintdef(oid, true) as definition
from pg_constraint
where connamespace = 'public'::regnamespace
  and conrelid in (
    'public.clientes'::regclass, 'public.profiles'::regclass, 'public.leads'::regclass,
    'public.oportunidades'::regclass, 'public.ventas'::regclass,
    'public.venta_items'::regclass, 'public.tareas'::regclass
  )
order by table_name::text, type, conname;
```

### 11.7 Índices y triggers

```sql
select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('clientes','profiles','leads','oportunidades','ventas','venta_items','tareas')
order by tablename, indexname;

select event_object_schema, event_object_table, trigger_name,
       action_timing, event_manipulation, action_statement
from information_schema.triggers
where event_object_schema in ('public','auth')
  and event_object_table in ('clientes','profiles','leads','oportunidades','ventas','venta_items','tareas','users')
order by event_object_schema, event_object_table, trigger_name, event_manipulation;
```

### 11.8 Integridad de responsables de Clientes

```sql
select responsable, count(*) as clientes
from public.clientes
group by responsable
order by clientes desc, responsable;

select lower(trim(responsable)) as responsable_normalizado,
       count(*) as clientes,
       array_agg(distinct responsable order by responsable) as variantes
from public.clientes
group by lower(trim(responsable))
order by clientes desc, responsable_normalizado;
```

Estas dos últimas consultas leen datos comerciales agregados. Revisar su resultado solo con personal autorizado y no copiar nombres a tickets públicos.

## 12. Riesgos de las posibles correcciones

| Corrección | Riesgo principal | Mitigación previa |
| --- | --- | --- |
| Retirar o archivar `schema.sql` | Romper bootstrap documentado | Crear primero una migración base reproducible y probarla en base vacía |
| Cambiar visibilidad de Vendedor | Ocultar datos que hoy necesita el negocio | Aprobar matriz de acceso y probar cada rol con datos propios/ajenos |
| Migrar responsables de Clientes | Asociación incorrecta o pérdida histórica | Mapeo explícito, columna aditiva, backfill revisado y período de compatibilidad |
| Añadir concurrencia | Falsos conflictos o UX bloqueada | Conservar timestamp exacto, pruebas multisesión y flujo de recuperación |
| Paginación servidor | Cambiar conteos, filtros, URL u orden | Contrato estable, orden total con `id`, tests de paridad y rollout por módulo |
| RPC de Reportes | Métricas o zona horaria divergentes | Fixtures límite de Lima, dinero exacto y comparación contra implementación actual |
| Índices nuevos | Escrituras más lentas y almacenamiento extra | `EXPLAIN ANALYZE`, volumen representativo y medición antes/después |
| Revocación de sesiones al inactivar | Cerrar sesiones durante operaciones legítimas | Definir requisito, auditoría de eventos y manejo visible de sesión terminada |

## 13. Pruebas recomendadas

1. Matriz SQL por rol y estado para SELECT, INSERT, UPDATE y DELETE en cada tabla.
2. Pruebas de `anon` que demuestren cero acceso a tablas, secuencias y RPC.
3. Pruebas de usuario inactivo sobre tablas y todas las RPC públicas.
4. Pruebas de UUID manipulado para cada decisión de alcance: propio, ajeno, inexistente.
5. Dos sesiones editando el mismo Cliente; la segunda debe recibir conflicto sin sobrescritura.
6. Responsable activo, inactivo histórico, inexistente, homónimo y reasignación por cada rol.
7. Alta idempotente de Cliente si se adopta `request_id`.
8. Paridad exacta entre paginación local actual y servidor para búsqueda, filtros, conteo y orden.
9. Paridad de Reportes en inicio/fin de mes, cambio de año, medianoche Lima, `date`, `timestamptz`, ventas canceladas y cero monetario.
10. Inventario automático que falle si aparece una política permisiva a `anon`, un `SECURITY DEFINER` sin `search_path` o una RPC pública inesperada.
11. Ejecución en Chromium, Firefox y WebKit para los flujos de sesión y conflicto; los tests actuales dirigidos corrieron solo en Chromium.

## 14. Plan de implementación propuesto para 7C.2

Cada bloque requiere aprobación y debe cerrarse con evidencia antes de iniciar el siguiente.

1. **Fotografía remota de solo lectura.** Ejecutar las consultas de la sección 11, guardar resultados sin datos personales y comparar catálogo con SQL versionado.
2. **Gobierno de migraciones.** Convertir el orden manual actual en migraciones inmutables; marcar el esquema temporal como no ejecutable en producción y añadir un control CI contra grants `anon`.
3. **Matriz de acceso.** Aprobar si Vendedor ve toda la organización o solo cartera propia. No modificar RLS antes de esta decisión.
4. **Contrato de responsables de Clientes.** Definir UUID, directorio mínimo, comportamiento de inactivos, permisos de asignación y compatibilidad histórica.
5. **Migración aditiva de responsables.** Añadir FK nullable, preparar mapeo revisable y realizar backfill únicamente en entorno de prueba.
6. **Concurrencia de Clientes.** Añadir precondición `updated_at`, respuesta de conflicto y tests con dos contextos.
7. **Paginación piloto.** Migrar primero el directorio de mayor cardinalidad medido. Conservar filtros de URL, orden estable y conteo bajo RLS.
8. **Agregados de Reportes.** Implementar una única RPC de solo lectura o consultas agregadas equivalentes, con paridad de fechas y dinero.
9. **Tareas y Calendario.** Consultar rangos y estados; reemplazar selectores masivos por búsqueda remota acotada.
10. **Rollout y observación.** Medir payload, latencia, filas, errores 401/403/409 y planes antes de retirar contratos anteriores.

## 15. Resultados de validaciones

| Validación | Resultado | Observación |
| --- | --- | --- |
| `git status --short` inicial | Revisado | Había tres capturas modificadas, `anti-slop/settings-evidence/` y dos archivos no rastreados. Se conservaron. |
| `npm run lint` | PASS | Sin errores ni advertencias impresas. |
| `npm run typecheck` | PASS | `next typegen` y `tsc --noEmit` completaron correctamente. |
| `npm run build` | PASS | Build Next.js 16.3.6 completado. Persiste advertencia sobre un `package-lock.json` externo al repositorio y raíz de Turbopack. |
| Build dentro del sandbox | No concluyente | Compiló y falló en TypeScript con `spawn EPERM`; al repetir fuera del sandbox terminó correctamente. |
| Auth + Usuarios Playwright | PASS, 18/18 | Chromium, un worker, 1.7 minutos. Backend local simulado; no prueba RLS remoto. |
| Tests SQL de RLS/RPC | No ejecutados | Requieren una base efímera autorizada; no se usó una base real. |
| Catálogo Supabase remoto | No verificado | Se proporcionan consultas de solo lectura en la sección 11. |

## 16. Correcciones propuestas para aprobación

1. **P0, alta:** verificar el catálogo remoto y confirmar que no existe ningún acceso `anon` ni política temporal.
2. **P0, alta:** impedir que `supabase/schema.sql` pueda reaplicarse como migración de producción; adoptar migraciones inmutables y control de deriva.
3. **P1, alta:** sustituir responsables ficticios de Clientes por FK a perfiles mediante una migración aditiva, revisada y compatible con historial.
4. **P1, alta:** implementar concurrencia optimista e idempotencia donde corresponda en Clientes.
5. **P1, decisión de seguridad:** aprobar formalmente la visibilidad global o por responsable para Vendedor antes de tocar RLS.
6. **P2, media-alta:** diseñar paginación servidor para F-03, empezando por el módulo de mayor volumen real.
7. **P2, media-alta:** sustituir F-02 por agregados de Reportes bajo el JWT del usuario y con pruebas de paridad.
8. **P2, media:** reducir el fan-out de Tareas/Calendario y los directorios completos de relaciones.
9. **P3, media:** medir planes reales y añadir únicamente los índices demostrados por consultas y volumen.
10. **P3, cobertura:** automatizar las pruebas SQL y el inventario de políticas/funciones en CI contra una base efímera.

No se inició la Fase 7C.2.
