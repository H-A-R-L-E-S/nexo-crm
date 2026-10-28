-- Nexo CRM - Fase 7C.2.3D
-- Paquete de precheck de produccion estrictamente de solo lectura.
-- PREPARADO, NO EJECUTADO. Ejecutar cada bloque solo tras aprobacion humana.
-- Interpretacion: GO = coincide; REVIEW = requiere contraste humano;
-- NO-GO = detenerse y no aplicar ningun cambio.

-- [01] Version e identidad tecnica.
-- Esperado: PostgreSQL 15+, primario y destino confirmado fuera de este SQL.
show server_version;

select
  '01_version' as check_id,
  current_database() as database_name,
  current_user as inspected_as,
  current_setting('server_version') as server_version,
  current_setting('server_version_num')::integer as server_version_num,
  inet_server_addr() as server_address,
  inet_server_port() as server_port,
  pg_is_in_recovery() as is_replica,
  case
    when current_setting('server_version_num')::integer < 150000 then 'NO-GO'
    when pg_is_in_recovery() then 'NO-GO'
    else 'REVIEW'
  end as assessment,
  'REVIEW exige confirmar proyecto/ref y operador por un canal independiente.' as expected;

-- [02] Extension requerida.
-- Esperado: una fila pgcrypto y assessment GO.
select
  '02_pgcrypto' as check_id,
  e.extname,
  e.extversion,
  pg_get_userbyid(e.extowner) as owner
from pg_catalog.pg_extension e
where e.extname = 'pgcrypto';

select
  '02_pgcrypto_assessment' as check_id,
  case
    when exists (select 1 from pg_catalog.pg_extension where extname = 'pgcrypto')
      then 'GO'
    else 'NO-GO'
  end as assessment,
  'pgcrypto debe existir.' as expected;

-- [03] Relaciones base.
-- Esperado: profiles, clientes y leads como tablas permanentes.
select
  '03_relations' as check_id,
  x.expected_relation,
  c.oid::regclass as actual_relation,
  c.relkind,
  c.relpersistence,
  pg_get_userbyid(c.relowner) as owner
from (values
  ('public.profiles'),
  ('public.clientes'),
  ('public.leads')
) as x(expected_relation)
left join pg_catalog.pg_class c
  on c.oid = to_regclass(x.expected_relation)
order by x.expected_relation;

select
  '03_relations_assessment' as check_id,
  case
    when (select count(*) from pg_catalog.pg_class
          where oid in (
            to_regclass('public.profiles'),
            to_regclass('public.clientes'),
            to_regclass('public.leads')
          ) and relkind = 'r' and relpersistence = 'p') = 3
      then 'GO'
    else 'NO-GO'
  end as assessment,
  'Las tres relaciones deben ser tablas permanentes.' as expected;

-- [04] Definicion completa de columnas.
-- Esperado: revisar la salida completa y obtener GO en el bloque siguiente.
select
  '04_columns' as check_id,
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

select
  '04_required_columns_assessment' as check_id,
  case when count(*) filter (
    where c.column_name is null
       or c.udt_name <> x.expected_udt
       or c.is_nullable <> x.expected_nullable
  ) = 0 then 'GO' else 'NO-GO' end as assessment,
  count(*) filter (
    where c.column_name is null
       or c.udt_name <> x.expected_udt
       or c.is_nullable <> x.expected_nullable
  ) as differences,
  'Cero diferencias en columnas requeridas.' as expected
from (values
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
) as x(table_name, column_name, expected_udt, expected_nullable)
left join information_schema.columns c
  on c.table_schema = 'public'
 and c.table_name = x.table_name
 and c.column_name = x.column_name;

-- [05] Ausencia obligatoria de la columna nueva.
-- Esperado: column_exists false y assessment GO.
select
  '05_responsable_id_absent' as check_id,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clientes'
      and column_name = 'responsable_id'
  ) as column_exists,
  case when exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clientes'
      and column_name = 'responsable_id'
  ) then 'NO-GO' else 'GO' end as assessment,
  'clientes.responsable_id debe estar ausente antes de la expansion.' as expected;

-- [06] PK, FK y demas constraints existentes.
-- Esperado: constraints validados; ninguna FK nueva de Clientes.
select
  '06_constraints' as check_id,
  con.conrelid::regclass as relation,
  con.conname,
  con.contype,
  con.convalidated,
  con.confrelid::regclass as referenced_relation,
  pg_get_constraintdef(con.oid, true) as definition
from pg_catalog.pg_constraint con
where con.conrelid in (
  to_regclass('public.profiles'),
  to_regclass('public.clientes'),
  to_regclass('public.leads')
)
order by con.conrelid::regclass::text, con.contype, con.conname;

select
  '06_constraints_assessment' as check_id,
  case
    when (select count(*) from pg_catalog.pg_constraint
          where conrelid in (
            to_regclass('public.profiles'),
            to_regclass('public.clientes'),
            to_regclass('public.leads')
          ) and contype = 'p' and convalidated) <> 3 then 'NO-GO'
    when exists (
      select 1 from pg_catalog.pg_constraint
      where conrelid in (
        to_regclass('public.profiles'),
        to_regclass('public.clientes'),
        to_regclass('public.leads')
      ) and not convalidated
    ) then 'NO-GO'
    when exists (
      select 1 from pg_catalog.pg_constraint
      where conrelid = to_regclass('public.clientes')
        and conname = 'clientes_responsable_id_fkey'
    ) then 'NO-GO'
    else 'REVIEW'
  end as assessment,
  'Tres PK validadas, ninguna constraint sin validar y FK nueva ausente; REVIEW compara el resto con baseline.' as expected;

-- [07] RLS, FORCE RLS y owners de tablas.
-- Esperado: tres filas con RLS true, FORCE RLS false y assessment GO.
select
  '07_rls_owners' as check_id,
  n.nspname as schema_name,
  c.relname,
  c.relrowsecurity,
  c.relforcerowsecurity,
  c.relpersistence,
  pg_get_userbyid(c.relowner) as owner
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles', 'clientes', 'leads')
order by c.relname;

select
  '07_rls_assessment' as check_id,
  case
    when (select count(*) from pg_catalog.pg_class c
          join pg_catalog.pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public'
            and c.relname in ('profiles', 'clientes', 'leads')
            and c.relrowsecurity
            and not c.relforcerowsecurity) = 3
      then 'GO'
    else 'NO-GO'
  end as assessment,
  'RLS habilitado y FORCE RLS deshabilitado en las tres tablas.' as expected;

-- [08] Policies completas.
-- Esperado: revisar cada expresion; los alcances de Clientes y Leads deben ser equivalentes.
select
  '08_policies' as check_id,
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

select
  '08_commercial_policy_assessment' as check_id,
  case
    when (select count(*) from pg_catalog.pg_policies
          where schemaname = 'public' and tablename = 'clientes') <> 4 then 'NO-GO'
    when (select count(*) from pg_catalog.pg_policies
          where schemaname = 'public' and tablename = 'leads') <> 4 then 'NO-GO'
    when exists (
      (select permissive, roles, cmd, qual, with_check
       from pg_catalog.pg_policies
       where schemaname = 'public' and tablename = 'clientes'
       except
       select permissive, roles, cmd, qual, with_check
       from pg_catalog.pg_policies
       where schemaname = 'public' and tablename = 'leads')
      union all
      (select permissive, roles, cmd, qual, with_check
       from pg_catalog.pg_policies
       where schemaname = 'public' and tablename = 'leads'
       except
       select permissive, roles, cmd, qual, with_check
       from pg_catalog.pg_policies
       where schemaname = 'public' and tablename = 'clientes')
    ) then 'NO-GO'
    else 'GO'
  end as assessment,
  'Clientes y Leads deben tener cuatro policies comerciales equivalentes.' as expected;

select
  '08_profiles_policy_assessment' as check_id,
  case
    when (select count(*) from pg_catalog.pg_policies
          where schemaname = 'public' and tablename = 'profiles') <> 3 then 'NO-GO'
    when not exists (select 1 from pg_catalog.pg_policies
          where schemaname = 'public' and tablename = 'profiles'
            and policyname = 'profiles_read_self') then 'NO-GO'
    when not exists (select 1 from pg_catalog.pg_policies
          where schemaname = 'public' and tablename = 'profiles'
            and policyname = 'profiles_update_self') then 'NO-GO'
    when not exists (select 1 from pg_catalog.pg_policies
          where schemaname = 'public' and tablename = 'profiles'
            and policyname = 'profiles_admin_read_team') then 'NO-GO'
    else 'GO'
  end as assessment,
  'Profiles debe conservar exactamente las tres policies baseline.' as expected;

-- [09] Grants de anon y authenticated.
-- Esperado: anon sin acceso comercial; grants authenticated iguales al baseline.
select
  '09_table_grants' as check_id,
  grantee,
  table_schema,
  table_name,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema in ('public', 'nexo_private')
  and table_name in ('profiles', 'clientes', 'leads')
  and grantee in ('anon', 'authenticated')
order by table_schema, table_name, grantee, privilege_type;

select
  '09_column_grants' as check_id,
  grantee,
  table_schema,
  table_name,
  column_name,
  privilege_type
from information_schema.column_privileges
where table_schema = 'public'
  and table_name in ('profiles', 'clientes', 'leads')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type, column_name;

select
  '09_grants_assessment' as check_id,
  case
    when has_table_privilege('anon', 'public.clientes', 'SELECT')
      or has_table_privilege('anon', 'public.clientes', 'INSERT')
      or has_table_privilege('anon', 'public.clientes', 'UPDATE')
      or has_table_privilege('anon', 'public.clientes', 'DELETE')
      or has_any_column_privilege('anon', 'public.clientes', 'SELECT,INSERT,UPDATE')
      then 'NO-GO'
    when (select coalesce(array_agg(privilege_type::text order by privilege_type::text), array[]::text[])
          from information_schema.role_table_grants
          where table_schema = 'public' and table_name = 'clientes'
            and grantee = 'authenticated')
         <> array['DELETE', 'INSERT', 'SELECT', 'UPDATE']::text[] then 'NO-GO'
    when (select coalesce(array_agg(column_name::text order by column_name::text), array[]::text[])
          from information_schema.column_privileges
          where table_schema = 'public' and table_name = 'profiles'
            and grantee = 'authenticated' and privilege_type = 'UPDATE')
         <> array['apellidos', 'nombres']::text[] then 'NO-GO'
    else 'REVIEW'
  end as assessment,
  'Anon sin grants; Clientes CRUD authenticated; Profiles solo nombres/apellidos editables. REVIEW contrasta Leads.' as expected;

-- [10] Capacidad del operador y owners.
-- Esperado: operador no es rol API y puede validar las tres tablas sin eludir una deriva.
select
  '10_operator_owner_assessment' as check_id,
  current_user as inspected_as,
  r.rolsuper,
  r.rolbypassrls,
  case
    when current_user in ('anon', 'authenticated', 'authenticator', 'service_role') then 'NO-GO'
    when r.rolsuper or r.rolbypassrls then 'REVIEW'
    when not exists (
      select 1
      from pg_catalog.pg_class c
      where c.oid in (
        to_regclass('public.profiles'),
        to_regclass('public.clientes'),
        to_regclass('public.leads')
      )
        and (c.relowner <> r.oid or c.relforcerowsecurity)
    ) then 'REVIEW'
    else 'NO-GO'
  end as assessment,
  'REVIEW exige aprobar al operador de confianza y owners observados.' as expected
from pg_catalog.pg_roles r
where r.rolname = current_user;

-- [11] Triggers y funciones enlazadas.
-- Esperado: trigger de version activo; trigger UUID aun ausente; trigger de Leads presente.
select
  '11_triggers' as check_id,
  t.tgrelid::regclass as relation,
  t.tgname,
  t.tgenabled,
  t.tgisinternal,
  t.tgfoid::regprocedure as function_signature,
  pg_get_triggerdef(t.oid, true) as definition
from pg_catalog.pg_trigger t
where t.tgrelid in (
  to_regclass('public.profiles'),
  to_regclass('public.clientes'),
  to_regclass('public.leads')
)
order by t.tgrelid::regclass::text, t.tgname;

select
  '11_triggers_assessment' as check_id,
  case
    when not exists (
      select 1 from pg_catalog.pg_trigger
      where tgrelid = to_regclass('public.clientes')
        and tgname = 'clientes_updated_at'
        and not tgisinternal
        and tgenabled = 'O'
        and tgfoid = to_regprocedure('public.set_clientes_updated_at()')
    ) then 'NO-GO'
    when exists (
      select 1 from pg_catalog.pg_trigger
      where tgrelid = to_regclass('public.clientes')
        and tgname = 'clientes_prepare_responsible'
        and not tgisinternal
    ) then 'NO-GO'
    when not exists (
      select 1 from pg_catalog.pg_trigger
      where tgrelid = to_regclass('public.leads')
        and tgname = 'leads_prepare'
        and not tgisinternal
        and tgenabled = 'O'
    ) then 'NO-GO'
    else 'GO'
  end as assessment,
  'clientes_updated_at y leads_prepare activos; clientes_prepare_responsible ausente.' as expected;

-- [12] Funciones requeridas, modo de seguridad, search_path, ACL y definicion.
-- Esperado: firmas exactas; revisar el texto completo y conservar convert_lead para rollback.
select
  '12_functions' as check_id,
  n.nspname,
  p.proname,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_get_function_result(p.oid) as result_type,
  case when p.prosecdef then 'DEFINER' else 'INVOKER' end as security_mode,
  p.provolatile,
  p.proparallel,
  p.proconfig,
  pg_get_userbyid(p.proowner) as owner,
  p.proacl,
  md5(pg_get_functiondef(p.oid)) as definition_md5
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where p.oid in (
  to_regprocedure('nexo_private.active_role()'),
  to_regprocedure('public.convert_lead(uuid,text,text,uuid)'),
  to_regprocedure('public.set_clientes_updated_at()'),
  to_regprocedure('public.lead_responsibles()')
)
order by n.nspname, p.proname, identity_arguments;

select
  '12_functions_assessment' as check_id,
  case
    when to_regprocedure('nexo_private.active_role()') is null then 'NO-GO'
    when to_regprocedure('public.convert_lead(uuid,text,text,uuid)') is null then 'NO-GO'
    when to_regprocedure('public.set_clientes_updated_at()') is null then 'NO-GO'
    when not (select prosecdef from pg_catalog.pg_proc
              where oid = to_regprocedure('nexo_private.active_role()')) then 'NO-GO'
    when not (select prosecdef from pg_catalog.pg_proc
              where oid = to_regprocedure('public.convert_lead(uuid,text,text,uuid)')) then 'NO-GO'
    when (select prosecdef from pg_catalog.pg_proc
          where oid = to_regprocedure('public.set_clientes_updated_at()')) then 'NO-GO'
    when not (select coalesce(proconfig, array[]::text[]) @> array['search_path=""']::text[]
              from pg_catalog.pg_proc
              where oid = to_regprocedure('nexo_private.active_role()')) then 'NO-GO'
    when not (select coalesce(proconfig, array[]::text[]) @> array['search_path=""']::text[]
              from pg_catalog.pg_proc
              where oid = to_regprocedure('public.convert_lead(uuid,text,text,uuid)')) then 'NO-GO'
    else 'REVIEW'
  end as assessment,
  'Firmas y modos base deben coincidir; REVIEW compara owners, ACL y definiciones completas.' as expected;

select
  '12_function_definitions' as check_id,
  p.oid::regprocedure as signature,
  pg_get_functiondef(p.oid) as definition
from pg_catalog.pg_proc p
where p.oid in (
  to_regprocedure('nexo_private.active_role()'),
  to_regprocedure('public.convert_lead(uuid,text,text,uuid)'),
  to_regprocedure('public.set_clientes_updated_at()')
)
order by p.oid::regprocedure::text;

-- [13] Indices actuales.
-- Esperado: revisar baseline; indice UUID nuevo ausente.
select
  '13_indexes' as check_id,
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_catalog.pg_indexes
where schemaname = 'public'
  and tablename in ('profiles', 'clientes', 'leads')
order by tablename, indexname;

select
  '13_index_assessment' as check_id,
  case when exists (
    select 1 from pg_catalog.pg_indexes
    where schemaname = 'public'
      and tablename = 'clientes'
      and indexname = 'clientes_responsable_id_idx'
  ) then 'NO-GO' else 'GO' end as assessment,
  'clientes_responsable_id_idx debe estar ausente.' as expected;

-- [14] Esquemas, ACL y configuracion PostgREST visible desde PostgreSQL.
-- Esperado: nexo_private nunca aparece entre esquemas expuestos.
select
  '14_schema_acl' as check_id,
  n.nspname,
  pg_get_userbyid(n.nspowner) as owner,
  n.nspacl
from pg_catalog.pg_namespace n
where n.nspname in ('public', 'nexo_private', 'graphql_public')
order by n.nspname;

select
  '14_postgrest_settings' as check_id,
  current_setting('pgrst.db_schemas', true) as exposed_schemas_setting,
  current_setting('pgrst.db_extra_search_path', true) as extra_search_path_setting,
  case
    when coalesce(current_setting('pgrst.db_schemas', true), '') ~ '(^|,)\s*nexo_private\s*(,|$)'
      then 'NO-GO'
    when current_setting('pgrst.db_schemas', true) is null
      or current_setting('pgrst.db_schemas', true) = '' then 'REVIEW'
    else 'GO'
  end as assessment,
  'REVIEW obliga a comprobar Dashboard API settings; nexo_private expuesto es NO-GO.' as expected;

-- [15] Objetos 7C.2.3 preexistentes por accidente.
-- Esperado: todos NULL/false, conteo cero y assessment GO.
select
  '15_accidental_objects' as check_id,
  to_regprocedure('nexo_private.client_profile_name(text)') as client_profile_name,
  to_regprocedure('nexo_private.assert_client_conversion_policy_baseline()') as policy_guard,
  to_regprocedure('nexo_private.prepare_client_responsible()') as client_trigger_function,
  to_regprocedure('nexo_private.convert_lead_to_client(uuid,text,text,uuid)') as private_conversion,
  to_regprocedure('public.client_responsibles(uuid)') as public_directory_rpc,
  to_regprocedure('nexo_private.client_responsible_has_visible_client(uuid)') as directory_helper,
  to_regclass('nexo_private.client_conversion_policy_baseline') as policy_baseline_relation,
  to_regclass('nexo_private.client_responsible_directory') as private_directory_relation;

select
  '15_accidental_objects_assessment' as check_id,
  case
    when exists (select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'clientes'
        and column_name = 'responsable_id') then 'NO-GO'
    when to_regprocedure('nexo_private.client_profile_name(text)') is not null then 'NO-GO'
    when to_regprocedure('nexo_private.assert_client_conversion_policy_baseline()') is not null then 'NO-GO'
    when to_regprocedure('nexo_private.prepare_client_responsible()') is not null then 'NO-GO'
    when to_regprocedure('nexo_private.convert_lead_to_client(uuid,text,text,uuid)') is not null then 'NO-GO'
    when to_regprocedure('public.client_responsibles(uuid)') is not null then 'NO-GO'
    when to_regprocedure('nexo_private.client_responsible_has_visible_client(uuid)') is not null then 'NO-GO'
    when to_regclass('nexo_private.client_conversion_policy_baseline') is not null then 'NO-GO'
    when to_regclass('nexo_private.client_responsible_directory') is not null then 'NO-GO'
    when exists (select 1 from pg_catalog.pg_constraint
      where conrelid = to_regclass('public.clientes')
        and conname = 'clientes_responsable_id_fkey') then 'NO-GO'
    when exists (select 1 from pg_catalog.pg_indexes
      where schemaname = 'public' and tablename = 'clientes'
        and indexname = 'clientes_responsable_id_idx') then 'NO-GO'
    when exists (select 1 from pg_catalog.pg_trigger
      where tgrelid = to_regclass('public.clientes')
        and tgname = 'clientes_prepare_responsible' and not tgisinternal) then 'NO-GO'
    else 'GO'
  end as assessment,
  'Ningun objeto nuevo debe existir antes de la expansion.' as expected;

-- [16] Forma y datos de updated_at.
-- Esperado: timestamptz NOT NULL, default baseline, cero NULL y trigger activo.
select
  '16_updated_at_shape' as check_id,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'clientes'
  and column_name = 'updated_at';

select
  '16_updated_at_assessment' as check_id,
  case
    when not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'clientes'
        and column_name = 'updated_at'
        and udt_name = 'timestamptz'
        and is_nullable = 'NO'
        and column_default is not null
    ) then 'NO-GO'
    when exists (select 1 from public.clientes where updated_at is null) then 'NO-GO'
    when not exists (
      select 1 from pg_catalog.pg_trigger
      where tgrelid = to_regclass('public.clientes')
        and tgname = 'clientes_updated_at'
        and tgenabled = 'O'
        and not tgisinternal
    ) then 'NO-GO'
    else 'REVIEW'
  end as assessment,
  (select column_default from information_schema.columns
   where table_schema = 'public' and table_name = 'clientes'
     and column_name = 'updated_at') as observed_default,
  'REVIEW compara el default observado con now() del baseline.' as expected;

-- [17] Salud minima de datos e historico Ana Garcia.
-- Esperado: cero roles invalidos y cero NULL de version/texto; Ana es informativo.
select
  '17_data_health' as check_id,
  (select count(*) from public.profiles) as profiles_total,
  (select count(*) from public.profiles where activo) as profiles_active,
  (select count(*) from public.profiles
    where rol not in ('Administrador', 'Gerente', 'Vendedor')) as profiles_invalid_role,
  (select count(*) from public.profiles where updated_at is null) as profiles_null_updated_at,
  (select count(*) from public.clientes) as clientes_total,
  (select count(*) from public.clientes where responsable is null) as clientes_null_responsable,
  (select count(*) from public.clientes where updated_at is null) as clientes_null_updated_at,
  (select count(*) from public.leads) as leads_total,
  (select count(*) from public.leads where updated_at is null) as leads_null_updated_at,
  (select count(*) from public.clientes where responsable = 'Ana García') as historical_ana_rows;

select
  '17_data_health_assessment' as check_id,
  case
    when exists (select 1 from public.profiles
      where rol not in ('Administrador', 'Gerente', 'Vendedor')) then 'NO-GO'
    when exists (select 1 from public.profiles where updated_at is null) then 'NO-GO'
    when exists (select 1 from public.clientes
      where responsable is null or updated_at is null) then 'NO-GO'
    when exists (select 1 from public.leads where updated_at is null) then 'NO-GO'
    else 'GO'
  end as assessment,
  'Ana Garcia no se usa para resolver identidad ni backfill.' as expected;

-- [18] Huella exacta de historia de Clientes para comparar despues.
-- Esperado: guardar ambos valores; cualquier diferencia posterior es NO-GO.
select
  '18_history_fingerprint' as check_id,
  count(*) as clientes_total,
  md5(coalesce(string_agg(
    md5(
      id::text || ':' ||
      encode(convert_to(responsable, 'UTF8'), 'hex') || ':' ||
      extract(epoch from updated_at)::text
    ),
    '' order by id
  ), '')) as clientes_history_fingerprint,
  'REVIEW' as assessment,
  'Archivar y comparar byte a byte despues del despliegue.' as expected
from public.clientes;

-- [19] Cierre.
-- Esperado: no continuar si cualquier bloque devuelve NO-GO;
-- todo REVIEW necesita aprobacion humana documentada.
select
  '19_manual_gate' as check_id,
  'REVIEW' as assessment,
  'Este archivo no decide el destino ni autoriza el despliegue.' as expected;
