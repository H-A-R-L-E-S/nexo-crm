# Fase 7C.2.3D — preparación y preflight de producción

Fecha de preparación: 27 de octubre de 2026. Revisión final: 28 de octubre de 2026 (America/Lima).

Estado: **preparación documental solamente**. Ninguna consulta o migración de este documento se ejecutó contra producción. No se usaron `.env.local`, `service_role`, `supabase link`, `db push`, `db pull --linked` ni conexiones remotas.

Commit revisado: `9301b83 Completa fase 7C.2.3 responsables UUID y validacion Supabase local`.

## Resumen ejecutivo

La entrega productiva debe ser una expansión backend en dos pasos y con el frontend todavía cerrado:

1. `supabase/client_responsibles.sql` — columna UUID nullable, FK, índice, integridad, versión monotónica y adaptación segura de `convert_lead`.
2. `supabase/client_responsibles_directory.sql` — directorio mínimo privado y RPC pública invocadora.

No se deben aplicar las migraciones baseline `001` a `007`, `schema.sql`, `auth_roles.sql`, `seed.sql` ni la propuesta estructural antigua. Producción ya debe contener ese baseline. Las migraciones `008` y `009` son copias byte a byte de los dos SQL funcionales:

```text
20261027000800_client_responsibles.sql
SHA-256 F10C8821C67E744C253081BD4BE5C90DAF31F56898BDB169B904BFC38E89B747

20261027000900_client_responsibles_directory.sql
SHA-256 F99DB55D7145F290252E19C2CA8E3E41E88CBC512C4A05071142F499F09D4ED0
```

La activación productiva de UI no forma parte de este despliegue backend. `CLIENT_RESPONSIBLES_UUID_ENABLED` debe permanecer `false` hasta una aprobación posterior.

## Estado que debe existir antes del despliegue

Producción debe cumplir simultáneamente:

- PostgreSQL 15 o posterior; objetivo validado localmente: PostgreSQL 17. Cualquier major distinto del validado requiere revisión explícita antes de continuar.
- Extensión `pgcrypto` instalada.
- Tablas `public.profiles`, `public.clientes` y `public.leads` existentes, con RLS habilitado y sin `FORCE ROW LEVEL SECURITY`.
- `profiles.id UUID` como PK y columnas `nombres`, `apellidos`, `rol`, `activo`, `updated_at` con los tipos esperados.
- `clientes.id UUID`, `responsable TEXT NOT NULL` y `updated_at TIMESTAMPTZ NOT NULL`; `responsable_id` todavía ausente.
- `leads.responsable_id UUID`, `convertido_cliente_id UUID` y `updated_at TIMESTAMPTZ` según el baseline aprobado.
- Políticas comerciales de Clientes y Leads equivalentes: lectura/alta/edición para los tres roles comerciales activos y borrado para Administrador/Gerente.
- `anon` sin privilegios de tabla o columna en Clientes.
- `authenticated` con los grants baseline, sin ampliaciones accidentales sobre Profiles.
- Funciones base `nexo_private.active_role()`, `public.convert_lead(uuid,text,text,uuid)` y `public.set_clientes_updated_at()` existentes.
- Trigger `clientes_updated_at` habilitado y ligado exactamente a `public.set_clientes_updated_at()`.
- Propietarios de confianza y operador de despliegue capaz de validar las tablas sin desactivar RLS.
- Esquema `nexo_private` fuera de los esquemas expuestos por PostgREST.
- Ningún objeto de la nueva expansión creado parcialmente.
- Frontend productivo todavía en flujo legado y sin consultas/escrituras de `responsable_id`.

Una diferencia no explicada en cualquiera de estos puntos es **NO-GO**. No se debe “arreglar” producción reaplicando migraciones baseline.

# A. Consultas de solo lectura seguras para preflight

## A.1 Reglas de ejecución

Estas consultas requieren aprobación humana para ejecutarse en producción, aunque sean de solo lectura. Deben ejecutarse en una única sesión de operador autorizado, guardando el resultado completo como evidencia. La envoltura `READ ONLY` impide escrituras accidentales:

```sql
begin transaction read only;
set local statement_timeout = '30s';
set local lock_timeout = '3s';

-- Ejecutar aquí A.2 hasta A.12.

rollback;
```

No pegar junto a este bloque ninguna migración, `NOTIFY`, DDL, RPC de escritura ni seed.

## A.2 Identidad técnica y versión

```sql
select
  current_database() as database_name,
  current_user as operator,
  current_setting('server_version') as server_version,
  current_setting('server_version_num')::integer as server_version_num,
  inet_server_addr() as server_address,
  inet_server_port() as server_port,
  pg_is_in_recovery() as is_replica;

select extname, extversion
from pg_catalog.pg_extension
where extname in ('pgcrypto', 'plpgsql')
order by extname;
```

GO esperado: conexión al proyecto productivo aprobado, primario (`is_replica = false`), `server_version_num >= 150000` y `pgcrypto` presente. La identidad del proyecto debe validarse fuera de SQL contra el inventario humano; el nombre de base por sí solo no prueba el destino.

## A.3 Existencia y forma de tablas/columnas

```sql
select
  c.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name in ('profiles', 'clientes', 'leads')
order by c.table_name, c.ordinal_position;

with required(table_name, column_name, udt_name, is_nullable) as (
  values
    ('profiles', 'id', 'uuid', 'NO'),
    ('profiles', 'nombres', 'text', 'NO'),
    ('profiles', 'apellidos', 'text', 'NO'),
    ('profiles', 'rol', 'text', 'NO'),
    ('profiles', 'activo', 'bool', 'NO'),
    ('profiles', 'updated_at', 'timestamptz', 'NO'),
    ('clientes', 'id', 'uuid', 'NO'),
    ('clientes', 'responsable', 'text', 'NO'),
    ('clientes', 'updated_at', 'timestamptz', 'NO'),
    ('leads', 'id', 'uuid', 'NO'),
    ('leads', 'responsable_id', 'uuid', 'YES'),
    ('leads', 'convertido_cliente_id', 'uuid', 'YES'),
    ('leads', 'updated_at', 'timestamptz', 'NO')
)
select r.*, c.udt_name as actual_udt, c.is_nullable as actual_nullable
from required r
left join information_schema.columns c
  on c.table_schema = 'public'
 and c.table_name = r.table_name
 and c.column_name = r.column_name
where c.column_name is null
   or c.udt_name <> r.udt_name
   or c.is_nullable <> r.is_nullable;

select exists (
  select 1 from information_schema.columns
  where table_schema = 'public'
    and table_name = 'clientes'
    and column_name = 'responsable_id'
) as responsable_id_already_exists;
```

GO esperado: la consulta de diferencias devuelve cero filas y `responsable_id_already_exists = false`.

## A.4 Salud de datos sin interpretar nombres como identidades

```sql
select
  (select count(*) from public.profiles) as profiles_total,
  (select count(*) from public.profiles where activo) as profiles_active,
  (select count(*) from public.profiles
    where rol not in ('Administrador', 'Gerente', 'Vendedor')) as profiles_invalid_role,
  (select count(*) from public.profiles
    where updated_at is null) as profiles_null_updated_at,
  (select count(*) from public.clientes) as clientes_total,
  (select count(*) from public.clientes where responsable is null) as clientes_null_responsable,
  (select count(*) from public.clientes where updated_at is null) as clientes_null_updated_at,
  (select count(*) from public.leads) as leads_total,
  (select count(*) from public.leads where updated_at is null) as leads_null_updated_at;

select rol, activo, count(*) as profiles
from public.profiles
group by rol, activo
order by rol, activo;

select
  count(*) as historical_ana_rows,
  min(created_at) as first_created_at,
  max(updated_at) as last_updated_at
from public.clientes
where responsable = 'Ana García';

select
  count(*) filter (where responsable = '') as empty_responsable,
  count(*) filter (where char_length(responsable) > 500) as unusually_long_responsable
from public.clientes;
```

GO esperado: cero roles inválidos y cero NULL en campos NOT NULL/versiones. El conteo de Ana García es informativo: **no** se usará para backfill ni asociación automática.

## A.5 Huella histórica para comparación posterior

Esta huella detecta cualquier cambio en `id`, texto histórico o `updated_at` causado por la ventana. Guardar los dos valores antes y después en la misma zona horaria/sesión:

```sql
select
  count(*) as clientes_total,
  md5(coalesce(string_agg(
    md5(
      id::text || ':' ||
      encode(convert_to(responsable, 'UTF8'), 'hex') || ':' ||
      extract(epoch from updated_at)::text
    ),
    '' order by id
  ), '')) as clientes_history_fingerprint
from public.clientes;
```

GO esperado: la consulta completa dentro del timeout. Si el volumen hace que exceda 30 segundos, cancelar y acordar una estrategia de exportación/hash por lotes; no retirar el timeout improvisadamente.

## A.6 RLS, propietarios y persistencia

```sql
select
  n.nspname as schema_name,
  c.relname,
  c.relkind,
  c.relrowsecurity,
  c.relforcerowsecurity,
  pg_catalog.pg_get_userbyid(c.relowner) as owner,
  c.relpersistence
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'nexo_private')
  and c.relname in ('profiles', 'clientes', 'leads')
order by n.nspname, c.relname;
```

GO esperado: las tres tablas `public` son permanentes, tienen RLS habilitado y `relforcerowsecurity = false`; owners conocidos y aprobados.

## A.7 Políticas RLS completas

```sql
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'clientes', 'leads')
order by tablename, cmd, policyname;

with commercial as (
  select tablename, permissive, roles, cmd, qual, with_check
  from pg_catalog.pg_policies
  where schemaname = 'public' and tablename in ('clientes', 'leads')
), differences as (
  (select 'clientes_minus_leads' as direction,
      permissive, roles, cmd, qual, with_check
   from commercial where tablename = 'clientes'
   except
   select 'clientes_minus_leads', permissive, roles, cmd, qual, with_check
   from commercial where tablename = 'leads')
  union all
  (select 'leads_minus_clientes',
      permissive, roles, cmd, qual, with_check
   from commercial where tablename = 'leads'
   except
   select 'leads_minus_clientes', permissive, roles, cmd, qual, with_check
   from commercial where tablename = 'clientes')
)
select * from differences;
```

GO esperado: revisión humana de las políticas completas y cero diferencias estructurales entre el alcance comercial de Clientes y Leads. Los nombres pueden diferir; los comandos, roles, modo permisivo y expresiones no.

## A.8 Grants de tabla, columna, esquema y funciones

```sql
select grantee, table_schema, table_name, privilege_type, is_grantable
from information_schema.role_table_grants
where table_schema in ('public', 'nexo_private')
  and table_name in ('profiles', 'clientes', 'leads')
  and grantee in ('anon', 'authenticated', 'service_role')
order by table_schema, table_name, grantee, privilege_type;

select grantee, table_schema, table_name, column_name, privilege_type
from information_schema.column_privileges
where table_schema = 'public'
  and table_name in ('profiles', 'clientes', 'leads')
  and grantee in ('anon', 'authenticated', 'service_role')
order by table_name, grantee, privilege_type, column_name;

select
  n.nspname,
  n.nspacl
from pg_catalog.pg_namespace n
where n.nspname in ('public', 'nexo_private');

select
  has_table_privilege('anon', 'public.clientes', 'SELECT') as anon_select_clientes,
  has_table_privilege('anon', 'public.clientes', 'INSERT') as anon_insert_clientes,
  has_table_privilege('anon', 'public.clientes', 'UPDATE') as anon_update_clientes,
  has_table_privilege('anon', 'public.clientes', 'DELETE') as anon_delete_clientes,
  has_any_column_privilege('anon', 'public.clientes', 'SELECT,INSERT,UPDATE')
    as anon_any_client_column;
```

GO esperado: todos los booleanos `anon` son `false`; cualquier grant no documentado debe investigarse. `authenticated` debe conservar el baseline actual, no recibir lectura global de Profiles.

## A.9 Triggers y forma de `updated_at`

```sql
select
  event_object_table,
  trigger_name,
  event_manipulation,
  action_timing,
  action_orientation,
  action_statement
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in ('profiles', 'clientes', 'leads')
order by event_object_table, trigger_name, event_manipulation;

select
  t.tgname,
  t.tgenabled,
  t.tgisinternal,
  t.tgtype,
  t.tgfoid::regprocedure as function_signature,
  pg_catalog.pg_get_triggerdef(t.oid, true) as definition
from pg_catalog.pg_trigger t
where t.tgrelid in (
  'public.profiles'::regclass,
  'public.clientes'::regclass,
  'public.leads'::regclass
)
order by t.tgrelid::regclass::text, t.tgname;

select column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'clientes'
  and column_name = 'updated_at';
```

GO esperado: `clientes_updated_at` habilitado (`tgenabled = 'O'`), no interno y ligado a `public.set_clientes_updated_at()`; `updated_at` es `timestamptz NOT NULL` con el default baseline. No debe existir todavía `clientes_prepare_responsible`.

## A.10 Funciones, seguridad, ACL y definiciones

```sql
select
  n.nspname,
  p.proname,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_catalog.pg_get_function_result(p.oid) as result_type,
  p.prosecdef as security_definer,
  p.provolatile,
  p.proparallel,
  p.proconfig,
  pg_catalog.pg_get_userbyid(p.proowner) as owner,
  p.proacl,
  md5(pg_catalog.pg_get_functiondef(p.oid)) as definition_md5
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where (n.nspname, p.proname) in (
  ('nexo_private', 'active_role'),
  ('public', 'convert_lead'),
  ('public', 'set_clientes_updated_at'),
  ('public', 'lead_responsibles')
)
order by n.nspname, p.proname, identity_arguments;

select
  p.oid::regprocedure as signature,
  pg_catalog.pg_get_functiondef(p.oid) as definition
from pg_catalog.pg_proc p
where p.oid in (
  'nexo_private.active_role()'::regprocedure,
  'public.convert_lead(uuid,text,text,uuid)'::regprocedure,
  'public.set_clientes_updated_at()'::regprocedure
)
order by p.oid::regprocedure::text;
```

GO esperado: las tres funciones requeridas existen con las firmas exactas; definitions, owners, `SECURITY DEFINER/INVOKER`, `search_path` y ACL coinciden con el baseline revisado. Guardar la definición completa de `convert_lead` como artefacto de rollback.

## A.11 Constraints e índices actuales

```sql
select
  conrelid::regclass as relation,
  conname,
  contype,
  convalidated,
  pg_catalog.pg_get_constraintdef(oid, true) as definition
from pg_catalog.pg_constraint
where conrelid in (
  'public.profiles'::regclass,
  'public.clientes'::regclass,
  'public.leads'::regclass
)
order by relation::text, contype, conname;

select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_catalog.pg_indexes
where schemaname = 'public'
  and tablename in ('profiles', 'clientes', 'leads')
order by tablename, indexname;
```

GO esperado: PK/FK/unique baseline validados; no existen `clientes_responsable_id_fkey` ni `clientes_responsable_id_idx`.

## A.12 Ausencia de expansión parcial y exposición privada

```sql
with expected_absent(object_name, object_value) as (
  values
    ('nexo_private.client_profile_name(text)',
      to_regprocedure('nexo_private.client_profile_name(text)')::text),
    ('nexo_private.assert_client_conversion_policy_baseline()',
      to_regprocedure('nexo_private.assert_client_conversion_policy_baseline()')::text),
    ('nexo_private.prepare_client_responsible()',
      to_regprocedure('nexo_private.prepare_client_responsible()')::text),
    ('nexo_private.convert_lead_to_client(uuid,text,text,uuid)',
      to_regprocedure('nexo_private.convert_lead_to_client(uuid,text,text,uuid)')::text),
    ('public.client_responsibles(uuid)',
      to_regprocedure('public.client_responsibles(uuid)')::text),
    ('nexo_private.client_responsible_has_visible_client(uuid)',
      to_regprocedure('nexo_private.client_responsible_has_visible_client(uuid)')::text)
)
select * from expected_absent where object_value is not null;

select to_regclass('nexo_private.client_conversion_policy_baseline')
  as conversion_policy_baseline,
  to_regclass('nexo_private.client_responsible_directory')
  as responsible_directory;

select count(*) as preexisting_responsible_objects
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where (n.nspname = 'public' and c.relname in (
    'clientes_responsable_id_idx'
  ))
   or (n.nspname = 'nexo_private' and c.relname in (
    'client_conversion_policy_baseline',
    'client_responsible_directory'
  ));
```

Además, comprobar en Dashboard → API settings que los esquemas expuestos no incluyen `nexo_private`. Esta revisión de configuración es humana; no se infiere solo del catálogo.

GO esperado: ningún procedimiento/relación nuevo existe, ambos `to_regclass` son NULL y el conteo es cero. La prueba autoritativa de ausencia de la columna está en A.3.

# B. Cambios propuestos que requieren aprobación

## B.1 Preparación de ventana

Requiere aprobación explícita:

1. Identidad exacta del proyecto/ref productivo y operador responsable.
2. Backup/PITR verificado y punto de recuperación anotado.
3. Ventana de mantenimiento y suspensión temporal de escrituras comerciales de Clientes/Leads.
4. Evidencia de preflight A completa y decisión GO firmada.
5. Hashes de los dos SQL confirmados contra este documento.

No enlazar el repositorio con producción. No usar `db push`: el directorio contiene migraciones baseline que no deben reaplicarse y el estado remoto de migraciones no está acreditado.

## B.2 Orden exacto del backend

Con una aprobación futura independiente, el operador de confianza ejecutaría:

1. Confirmar mantenimiento activo y cero despliegues concurrentes.
2. Ejecutar **solamente** `supabase/client_responsibles.sql` completo. El archivo usa una transacción y debe abortar ante deriva.
3. No continuar si hay cualquier error, warning inesperado o resultado de catálogo distinto. Conservar el error completo.
4. Ejecutar las verificaciones C.1 de expansión estructural y huella histórica.
5. Ejecutar **solamente** `supabase/client_responsibles_directory.sql` completo.
6. Ejecutar C.2 para RPC, vista privada, ACL y exposición PostgREST.
7. Refrescar la caché de esquema de PostgREST mediante el procedimiento operativo aprobado. Si se propone `NOTIFY pgrst, 'reload schema'`, esa sentencia es un cambio y requiere aprobación; no forma parte del preflight read-only.
8. Ejecutar smokes read-only C.3 con sesiones existentes y autorizadas de Administrador, Gerente, Vendedor, inactivo y anon.
9. Reabrir escrituras comerciales solo después de GO post-despliegue.
10. Mantener el frontend UUID deshabilitado.

No ejecutar:

- `20261027000100` a `20261027000700`;
- `schema.sql`, `auth_roles.sql`, `user_management.sql` ni módulos comerciales completos;
- `seed.sql`;
- `anti-slop/sql/phase-7c23-client-responsibles.proposed.sql`;
- pruebas SQL que creen fixtures en producción;
- backfill por nombre o asignación de Ana García.

# C. Verificaciones posteriores

## C.1 Inmediatamente después del primer SQL

Ejecutar en una nueva transacción read-only:

```sql
begin transaction read only;
set local statement_timeout = '30s';

select column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'clientes'
  and column_name in ('responsable', 'responsable_id', 'updated_at')
order by ordinal_position;

select conname, convalidated, pg_catalog.pg_get_constraintdef(oid, true) as definition
from pg_catalog.pg_constraint
where conrelid = 'public.clientes'::regclass
  and conname = 'clientes_responsable_id_fkey';

select indexname, indexdef
from pg_catalog.pg_indexes
where schemaname = 'public' and tablename = 'clientes'
  and indexname = 'clientes_responsable_id_idx';

select count(*) as clientes_con_uuid
from public.clientes
where responsable_id is not null;

select
  count(*) as clientes_total,
  md5(coalesce(string_agg(
    md5(
      id::text || ':' ||
      encode(convert_to(responsable, 'UTF8'), 'hex') || ':' ||
      extract(epoch from updated_at)::text
    ),
    '' order by id
  ), '')) as clientes_history_fingerprint
from public.clientes;

select tgname, tgenabled, tgfoid::regprocedure as function_signature,
  pg_catalog.pg_get_triggerdef(oid, true) as definition
from pg_catalog.pg_trigger
where tgrelid = 'public.clientes'::regclass
  and not tgisinternal
order by tgname;

select nexo_private.assert_client_conversion_policy_baseline();

rollback;
```

GO esperado:

- columna UUID nullable, sin default;
- FK validada RESTRICT/RESTRICT;
- índice parcial correcto;
- `clientes_con_uuid = 0` mientras ningún productor UUID esté activo;
- conteo y huella históricos idénticos al preflight;
- triggers `clientes_updated_at` y `clientes_prepare_responsible` habilitados;
- guard de políticas sin error.

## C.2 Después del directorio

```sql
begin transaction read only;

select n.nspname, p.proname,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef, p.proconfig,
  pg_catalog.pg_get_userbyid(p.proowner) as owner,
  p.proacl
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where (n.nspname = 'public' and p.proname = 'client_responsibles')
   or (n.nspname = 'nexo_private'
       and p.proname = 'client_responsible_has_visible_client')
order by n.nspname, p.proname;

select c.relname, c.reloptions,
  pg_catalog.pg_get_userbyid(c.relowner) as owner,
  c.relacl
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'nexo_private'
  and c.relname = 'client_responsible_directory';

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'clientes', 'leads')
order by tablename, cmd, policyname;

select grantee, table_schema, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('profiles', 'clientes', 'leads')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

rollback;
```

GO esperado: RPC pública `SECURITY INVOKER`, helper privado invocador, vista con `security_barrier=true`, sin cambios en policies/grants base y `nexo_private` todavía fuera de esquemas API expuestos.

## C.3 Smokes PostgREST read-only

Con cuentas productivas existentes y autorización expresa, sin crear usuarios ni modificar perfiles:

- Administrador activo: `client_responsibles(NULL)` devuelve campos mínimos y candidatos coherentes.
- Gerente activo: obtiene el directorio autorizado sin acceso directo ampliado a Profiles.
- Vendedor activo: solo su UUID es `can_assign=true`; históricos contextuales no se vuelven asignables.
- Usuario inactivo: Clientes vacío/denegado y RPC denegada.
- Anon: Clientes y RPC denegados.
- Petición a objetos de `nexo_private`: `404` por no exposición.

No realizar todavía INSERT, PATCH, conversión ni reasignación productiva. Las pruebas de escritura ya fueron aprobadas en Supabase local; producción permanece sin escrituras UUID hasta la activación posterior.

## C.4 Observación inmediata

Durante la ventana y al menos el período acordado por operaciones:

- errores PostgREST por SQLSTATE `42501`, `22023`, `22P02`, `23503`, `40001`;
- latencia/bloqueos en Clientes y Leads;
- errores de `convert_lead`;
- cambios inesperados en conteos o huella histórica;
- intentos de acceso a `nexo_private`;
- estado de caché de esquema PostgREST.

Cualquier anomalía sin explicación es NO-GO para activar el frontend.

# D. Rollback compatible y no destructivo

## D.1 Principio

El rollback es de capacidad y aplicación, no de datos. Una vez que exista cualquier UUID, **nunca**:

- eliminar `clientes.responsable_id`;
- eliminar su FK o índice para “volver atrás”;
- sobrescribir o borrar `responsable`;
- convertir UUID a nombres;
- asignar históricos por coincidencia textual;
- reaplicar `schema.sql`, `auth_roles.sql`, `leads.sql` o el seed.

## D.2 Escenarios

### Fallo dentro de cualquiera de los SQL

Ambos archivos son transaccionales. Ante error, confirmar rollback de esa transacción, conservar logs y detenerse. No continuar con el segundo archivo.

### Primer SQL correcto, directorio fallido

Mantener expansión, FK, índice y controles instalados; el frontend sigue apagado. Corregir/revisar el directorio y reintentar solo con una nueva aprobación. No deshacer la columna.

### Problema posterior sin escrituras UUID activas

1. Mantener `CLIENT_RESPONSIBLES_UUID_ENABLED = false`.
2. Suspender temporalmente conversiones/ediciones afectadas desde la aplicación si es necesario.
3. Mantener el trigger de integridad; eliminarlo abriría escrituras directas no autorizadas sobre la nueva columna.
4. Revocar, con aprobación específica, `EXECUTE` de `public.client_responsibles(uuid)` y del núcleo privado si se necesita cerrar capacidades mientras se investiga.
5. Restaurar únicamente la definición y ACL preflight de `public.convert_lead(uuid,text,text,uuid)` si el incidente está en conversión. La definición exacta debe provenir de A.10 y ensayarse antes; no ejecutar `leads.sql` completo.

### Problema después de activar el frontend

1. Revertir el cambio de aplicación para volver a `CLIENT_RESPONSIBLES_UUID_ENABLED = false` y al flujo dual compatible.
2. Conservar backend, columna, FK, índice, texto y UUID existentes.
3. No permitir que una versión antigua interprete el texto como identidad actual.
4. Investigar y corregir hacia adelante. Cualquier revocación de grants/execute necesita un plan revisado para no romper Leads.

No se proporciona un `DROP COLUMN` de rollback porque sería destructivo y violaría la conservación histórica.

# E. Criterios GO / NO-GO

## GO para aplicar el primer SQL

Todos deben ser verdaderos:

- destino productivo y operador verificados por dos personas;
- backup/PITR y ventana aprobados;
- preflight A ejecutado en read-only y archivado;
- cero diferencias sin explicar en esquema, policies, grants, owners, triggers y funciones;
- `responsable_id` y todos los objetos nuevos ausentes;
- huella histórica calculada;
- `nexo_private` no expuesto;
- hashes de SQL confirmados;
- frontend UUID apagado;
- rollback y responsables operativos disponibles.

## GO para aplicar el directorio

- primer SQL confirmado por C.1;
- cero UUID nuevos inesperados;
- huella histórica intacta;
- guard de policies aprobado;
- ninguna anomalía de bloqueo o conversión.

## GO para cerrar el despliegue backend

- C.2 y smokes read-only C.3 aprobados;
- anon/inactivo denegados;
- `nexo_private` responde 404 por API;
- policies/grants base sin deriva;
- observabilidad estable;
- frontend todavía apagado.

## NO-GO inmediato

Cualquiera de estos puntos detiene la operación:

- proyecto/credenciales/destino ambiguos;
- falta de backup o de aprobación humana;
- versión PostgreSQL no revisada;
- RLS deshabilitado o forzado inesperadamente;
- policy, grant, owner, trigger o función distintos del baseline;
- expansión parcial previa;
- `responsable_id` ya existente;
- `anon` con privilegios;
- `nexo_private` expuesto;
- huella histórica cambia;
- necesidad de backfill o interpretación por nombre;
- propuesta de ejecutar baseline, seed, `db push` o ambos SQL estructural/funcional;
- error, timeout o warning no explicado.

## Activación posterior del frontend

La activación requiere otra aprobación y otro despliegue:

1. Mantener inicialmente `src/features/clients/responsibles-activation.ts` con `CLIENT_RESPONSIBLES_UUID_ENABLED = false`.
2. Integrar de forma revisada `ClientUuidFormDialog` y el adaptador real en la pantalla/Provider productivos; hoy la pantalla operativa continúa usando `ClientFormDialog` legado.
3. Conectar `getClientResponsibles`, `createAssignedCliente` y `updateClienteWithVersion`, conservando el `updated_at` original del formulario.
4. Ejecutar lint, typecheck, build, unitarias, Playwright y smoke contra backend desplegado.
5. Confirmar que las rutas de prueba no sean accesibles en producción.
6. Solo entonces cambiar la constante a `true` en un commit/deploy separado y monitoreado.
7. Para rollback de UI, volver a `false` y redesplegar; el backend y datos duales permanecen.

`NEXO_E2E_CLIENT_RESPONSIBLES` es exclusivamente un flag de ensayo loopback y **no** debe usarse para activar producción.

## Aprobaciones humanas obligatorias

Antes de cualquier operación sobre producción se necesitan, por separado:

1. **Acceso read-only de preflight:** destino, operador, fecha y custodia de resultados.
2. **Aceptación del catálogo:** revisión humana de A.2–A.12 y decisión GO/NO-GO firmada.
3. **Respaldo y ventana:** PITR/backup confirmado, mantenimiento y plan de comunicación.
4. **Artefactos backend:** aprobación de hashes y autorización explícita para ejecutar el primer SQL.
5. **Continuación:** aprobación posterior a C.1 para ejecutar el directorio.
6. **Caché PostgREST:** autorización del mecanismo de reload si requiere `NOTIFY` o reinicio.
7. **Smokes productivos:** cuentas existentes permitidas, alcance read-only y responsable de observación.
8. **Rollback operativo:** quién puede revocar EXECUTE/restaurar `convert_lead` y bajo qué evidencia.
9. **Cierre backend:** aceptación de C.2/C.3 y reapertura de escrituras comerciales.
10. **Frontend:** aprobación separada de integración, cambio de constante y despliegue; nunca implícita en el despliegue SQL.

## Estado de esta fase

Se revisaron informes A/B/C, ambos SQL funcionales, las nueve migraciones y el mecanismo de activación. Las migraciones siguen coincidiendo byte a byte con sus fuentes. Los bloques de este informe fueron revisados estáticamente; no se ejecutó ninguna consulta de preflight ni se atribuye un PASS de producción. No se realizó ninguna operación remota ni se modificaron Auth, RLS, `.env.local`, datos históricos o configuración productiva. No hubo commit ni push.

**7C.2.3D PREFLIGHT PREPARADO — NO EJECUTADO.**
