-- Fase 7C.2.3A. SQL preparado localmente, NO EJECUTADO.
-- Aplicar solamente después de client_responsibles.sql, con autorización aparte.
-- nexo_private debe permanecer fuera de los esquemas expuestos por PostgREST.
-- No modifica políticas/grants de Profiles o Clientes ni consulta auth.users.
-- PostgreSQL 15+: la vista privada es una capacidad de lectura mínima deliberada.
begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- El owner de la vista necesita leer Profiles sin su filtro de lectura personal.
-- No asumir que cualquier usuario con CREATE en el esquema sea un owner válido.
do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_roles r on r.rolname = current_user
    where c.oid = 'public.profiles'::regclass
      and (r.rolsuper or r.rolbypassrls
        or (c.relowner = r.oid and not c.relforcerowsecurity))
  ) then
    raise exception 'Revisar owner autorizado del directorio antes de instalarlo.'
      using errcode = '42501';
  end if;
end;
$$;

-- PL/pgSQL evita inline dentro de la vista: esta consulta a Clientes conserva
-- los privilegios y RLS del invocador, incluidas futuras políticas más estrictas.
-- La función sólo comprueba una referencia que el actor ya puede consultar.
create function nexo_private.client_responsible_has_visible_client(
  p_responsable_id uuid
)
returns boolean
language plpgsql stable security invoker
set search_path = ''
set row_security = on
as $$
begin
  if p_responsable_id is null
    or auth.uid() is null
    or nexo_private.active_role() is null
    or nexo_private.active_role() not in ('Administrador', 'Gerente', 'Vendedor') then
    return false;
  end if;

  return exists (
    select 1
    from public.clientes c
    where c.responsable_id = p_responsable_id
  );
end;
$$;

revoke all on function nexo_private.client_responsible_has_visible_client(uuid)
  from public, anon, authenticated;
grant execute on function nexo_private.client_responsible_has_visible_client(uuid)
  to authenticated;

-- Sólo Profiles figura como relación directa; NO agregar Clientes aquí.
-- Las vistas normales usan al owner para la relación, pero sus funciones
-- INVOKER conservan current_user del usuario de la vista. security_barrier evita
-- que predicados ajenos no leakproof observen filas rechazadas por el filtro.
-- Fuente: https://www.postgresql.org/docs/15/sql-createview.html (Notes).
create view nexo_private.client_responsible_directory
with (security_barrier = true, security_invoker = false)
as
select p.id, p.nombres, p.apellidos, p.activo, p.rol
from public.profiles p
where (select auth.uid()) is not null
  and (select nexo_private.active_role()) in ('Administrador', 'Gerente', 'Vendedor')
  and (
    (
      p.activo
      and p.rol in ('Administrador', 'Gerente', 'Vendedor')
      and (
        (select nexo_private.active_role()) in ('Administrador', 'Gerente')
        or p.id = (select auth.uid())
      )
    )
    or nexo_private.client_responsible_has_visible_client(p.id)
  );

revoke all on nexo_private.client_responsible_directory from public, anon, authenticated;
grant select on nexo_private.client_responsible_directory to authenticated;

-- authenticated tiene esta capacidad privada mínima incluso por SQL directo;
-- no se confía en que la RPC pública sea la única vía de acceso a la vista.
-- Nunca conceder INSERT/UPDATE/DELETE en esta vista ni USAGE a anon.
create function public.client_responsibles(p_client_id uuid default null)
returns table (
  id uuid,
  nombres text,
  apellidos text,
  activo boolean,
  rol text,
  can_assign boolean
)
language plpgsql stable security invoker
set search_path = ''
set row_security = on
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text := nexo_private.active_role();
  historical_responsible_id uuid;
begin
  if actor_id is null or actor_role is null
    or actor_role not in ('Administrador', 'Gerente', 'Vendedor') then
    raise exception 'Necesitas un perfil comercial activo para consultar responsables.'
      using errcode = '42501';
  end if;

  if p_client_id is not null then
    select c.responsable_id into historical_responsible_id
    from public.clientes c
    where c.id = p_client_id;

    if not found then
      raise exception 'El cliente no está disponible para esta sesión.'
        using errcode = '42501';
    end if;
  end if;

  return query
  select d.id, d.nombres, d.apellidos, d.activo, d.rol,
    (
      d.activo
      and d.rol in ('Administrador', 'Gerente', 'Vendedor')
      and nullif(nexo_private.client_profile_name(d.nombres), '') is not null
      and nullif(nexo_private.client_profile_name(d.apellidos), '') is not null
      and (actor_role in ('Administrador', 'Gerente') or d.id = actor_id)
    ) as can_assign
  from nexo_private.client_responsible_directory d
  where p_client_id is null
    or (
      d.activo
      and d.rol in ('Administrador', 'Gerente', 'Vendedor')
      and (actor_role in ('Administrador', 'Gerente') or d.id = actor_id)
    )
    or d.id = historical_responsible_id
  order by d.nombres, d.apellidos, d.id;
end;
$$;

revoke all on function public.client_responsibles(uuid) from public, anon, authenticated;
grant execute on function public.client_responsibles(uuid) to authenticated;

commit;

-- Verificación futura de solo lectura: comparar además pg_policies/ACL originales.
-- Esta inspección no sustituye pruebas ejecutadas con cada actor y Clientes RLS.
select n.nspname, p.proname, p.prosecdef, p.proconfig,
  pg_catalog.pg_get_userbyid(p.proowner) as owner, p.proacl
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where (n.nspname = 'public' and p.proname = 'client_responsibles')
   or (n.nspname = 'nexo_private'
       and p.proname = 'client_responsible_has_visible_client');

select c.relname, c.reloptions, pg_catalog.pg_get_userbyid(c.relowner) as owner, c.relacl
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'nexo_private' and c.relname = 'client_responsible_directory';

-- NULL en la RPC devuelve candidatos/diagnóstico y sólo históricos de Clientes
-- visibles. UUID de cliente devuelve candidatos/diagnóstico y su histórico.
-- can_assign sólo informa elegibilidad de destino, no concede permiso para
-- reasignar un cliente existente: Vendedor no puede cambiar responsable_id.
-- No existe resolución por nombre ni asignación automática de históricos.
