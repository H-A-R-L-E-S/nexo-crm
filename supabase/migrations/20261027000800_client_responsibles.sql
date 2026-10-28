-- Nexo CRM, fase 7C.2.3A. Preparado localmente; NO EJECUTADO.
-- No es una migración automática. Requiere preflight de catálogo y aprobación
-- expresa para un ensayo aislado antes de considerar producción.
-- Sustituye la propuesta estructural 7C.2.3: NO ejecutar ambos archivos.
-- No hace backfill, no interpreta nombres y no modifica políticas existentes ni Auth.
-- nexo_private debe permanecer fuera de los esquemas expuestos por PostgREST.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Fallar ante una instalación incompleta. Comparar también RLS, ACL, owners,
-- triggers y pg_get_functiondef de convert_lead con el baseline aprobado.
-- La conversión privada conserva el alcance global por rol de las políticas
-- comerciales actuales; una política distinta bloquea instalación/conversión.
do $$
begin
  if current_user in ('anon', 'authenticated', 'authenticator', 'service_role') then
    raise exception 'Instalar solo como propietario de confianza.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_roles r where r.rolname = current_user
      and (r.rolsuper or r.rolbypassrls or not exists (
        select 1 from pg_catalog.pg_class c
        where c.oid in ('public.clientes'::regclass, 'public.profiles'::regclass, 'public.leads'::regclass)
          and (c.relowner <> r.oid or c.relforcerowsecurity)
      ))
  ) then
    raise exception 'El propietario de las funciones privadas no puede validar las tablas base.' using errcode = '42501';
  end if;
  if to_regprocedure('nexo_private.active_role()') is null
    or to_regprocedure('public.convert_lead(uuid,text,text,uuid)') is null
    or to_regprocedure('public.set_clientes_updated_at()') is null then
    raise exception 'Faltan las funciones base; revisar el catálogo antes de instalar.';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_trigger t
    where t.tgrelid = 'public.clientes'::regclass
      and t.tgname = 'clientes_updated_at' and not t.tgisinternal
      and t.tgenabled = 'O'
      and t.tgfoid = 'public.set_clientes_updated_at()'::regprocedure
  ) then
    raise exception 'El trigger de versión de Clientes no coincide con el baseline.';
  end if;
  if exists (
    select 1 from pg_catalog.pg_class c
    where c.oid in ('public.clientes'::regclass, 'public.profiles'::regclass, 'public.leads'::regclass)
      and not c.relrowsecurity
  ) then
    raise exception 'Las tablas base deben conservar RLS habilitado.';
  end if;
  if has_table_privilege('anon', 'public.clientes', 'SELECT,INSERT,UPDATE,DELETE')
    or has_any_column_privilege('anon', 'public.clientes', 'SELECT,INSERT,UPDATE') then
    raise exception 'Los permisos anon de Clientes no coinciden con el baseline seguro.';
  end if;
end;
$$;

-- Contrato de whitespace de String.prototype.trim. No depende de la locale ni
-- interpreta el texto como identidad. Los NULL se conservan por STRICT.
create function nexo_private.client_profile_name(p_value text)
returns text language sql immutable strict security invoker set search_path = '' as $$
  select pg_catalog.btrim(
    p_value,
    U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'
  )
$$;
revoke all on function nexo_private.client_profile_name(text) from public, anon, authenticated;
grant execute on function nexo_private.client_profile_name(text) to authenticated;

-- Referencia de catálogo sin filas ni datos personales. CHECK false impide
-- almacenar datos; no recibe grants. Sus políticas no afectan tablas existentes.
-- Permite comparar árboles de expresión deparseados por esta versión de PG,
-- sin depender de espacios, nombres de policies ni texto hardcoded de pg_get_expr.
create table nexo_private.client_conversion_policy_baseline (
  marker boolean not null check (false)
);
alter table nexo_private.client_conversion_policy_baseline enable row level security;
revoke all on nexo_private.client_conversion_policy_baseline from public, anon, authenticated;
create policy client_conversion_baseline_read
  on nexo_private.client_conversion_policy_baseline for select to authenticated
  using ((select nexo_private.active_role()) in ('Administrador', 'Gerente', 'Vendedor'));
create policy client_conversion_baseline_create
  on nexo_private.client_conversion_policy_baseline for insert to authenticated
  with check ((select nexo_private.active_role()) in ('Administrador', 'Gerente', 'Vendedor'));
create policy client_conversion_baseline_edit
  on nexo_private.client_conversion_policy_baseline for update to authenticated
  using ((select nexo_private.active_role()) in ('Administrador', 'Gerente', 'Vendedor'))
  with check ((select nexo_private.active_role()) in ('Administrador', 'Gerente', 'Vendedor'));
create policy client_conversion_baseline_delete
  on nexo_private.client_conversion_policy_baseline for delete to authenticated
  using ((select nexo_private.active_role()) in ('Administrador', 'Gerente'));

create function nexo_private.assert_client_conversion_policy_baseline()
returns void language plpgsql stable security invoker set search_path = '' as $$
declare
  relation_id oid;
  policies_differ boolean;
begin
  -- La referencia debe existir con sus cuatro políticas. Su propietario sólo
  -- puede ser modificado por el operador; no es un switch controlado por la app.
  if (select count(*) from pg_catalog.pg_policy p
      where p.polrelid = 'nexo_private.client_conversion_policy_baseline'::regclass) <> 4
    or not exists (
      select 1 from pg_catalog.pg_class c
      where c.oid = 'nexo_private.client_conversion_policy_baseline'::regclass
        and c.relrowsecurity and not c.relforcerowsecurity
    ) then
    raise exception 'La referencia de políticas de conversión requiere revisión.' using errcode = '42501';
  end if;

  foreach relation_id in array array['public.clientes'::regclass::oid, 'public.leads'::regclass::oid] loop
    if not exists (
      select 1 from pg_catalog.pg_class c where c.oid = relation_id
        and c.relrowsecurity and not c.relforcerowsecurity
    ) then
      raise exception 'El alcance RLS de conversión cambió; revisar antes de convertir.' using errcode = '42501';
    end if;
    with expected as (
      select p.polcmd, p.polpermissive, p.polroles,
        pg_catalog.pg_get_expr(p.polqual, p.polrelid) as policy_using,
        pg_catalog.pg_get_expr(p.polwithcheck, p.polrelid) as policy_check
      from pg_catalog.pg_policy p
      where p.polrelid = 'nexo_private.client_conversion_policy_baseline'::regclass
    ), actual as (
      select p.polcmd, p.polpermissive, p.polroles,
        pg_catalog.pg_get_expr(p.polqual, p.polrelid) as policy_using,
        pg_catalog.pg_get_expr(p.polwithcheck, p.polrelid) as policy_check
      from pg_catalog.pg_policy p where p.polrelid = relation_id
    )
    select exists (
      (select * from actual except all select * from expected)
      union all
      (select * from expected except all select * from actual)
    ) into policies_differ;
    if policies_differ then
      raise exception 'Las políticas de conversión difieren del contrato global aprobado.' using errcode = '42501';
    end if;
  end loop;
end;
$$;
revoke all on function nexo_private.assert_client_conversion_policy_baseline() from public, anon, authenticated;

-- Guardia previa al DDL operativo, repetida por el núcleo en CADA conversión.
select nexo_private.assert_client_conversion_policy_baseline();

-- Sin IF NOT EXISTS: una segunda ejecución o expansión parcial exige revisión.
alter table public.clientes add column responsable_id uuid;
alter table public.clientes add constraint clientes_responsable_id_fkey
  foreign key (responsable_id) references public.profiles(id)
  on update restrict on delete restrict;
create index clientes_responsable_id_idx on public.clientes(responsable_id)
  where responsable_id is not null;

-- No se amplían grants de Clientes: el grant de tabla existente ya cubre la
-- columna. La autorización de cada fila sigue en las políticas existentes.
create function nexo_private.prepare_client_responsible()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  actor public.profiles;
  target public.profiles;
  assignment_changed boolean;
begin
  if actor_id is null or auth.role() is distinct from 'authenticated'
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Necesitas una sesión autenticada y un perfil activo.' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    assignment_changed := new.responsable_id is not null;
  else
    if (new.responsable collate pg_catalog."C") is distinct from
      (old.responsable collate pg_catalog."C") then
      raise exception 'El texto histórico del responsable no se puede modificar.' using errcode = '42501';
    end if;
    assignment_changed := new.responsable_id is distinct from old.responsable_id;
  end if;

  -- Bloquear ambas identidades en orden estable evita la carrera con cambios
  -- de activo, rol o nombres. La relectura ocurre después de adquirir locks.
  perform p.id from public.profiles p
    where p.id = actor_id
      or (assignment_changed and p.id = new.responsable_id)
    order by p.id for share;
  select p.* into actor from public.profiles p where p.id = actor_id;
  if not found or actor.activo is not true
    or coalesce(actor.rol, '') not in ('Administrador', 'Gerente', 'Vendedor') then
    raise exception 'Necesitas un perfil comercial activo.' using errcode = '42501';
  end if;

  if assignment_changed then
    if actor.rol = 'Vendedor' and
      (tg_op = 'UPDATE' or new.responsable_id is distinct from actor_id) then
      raise exception 'Solo Administrador o Gerente pueden reasignar responsables.' using errcode = '42501';
    end if;
    if new.responsable_id is null then
      raise exception 'Una referencia existente no se puede vaciar.' using errcode = '22023';
    end if;
    select p.* into target from public.profiles p where p.id = new.responsable_id;
    if not found or target.activo is not true
      or coalesce(target.rol, '') not in ('Administrador', 'Gerente', 'Vendedor')
      or nullif(nexo_private.client_profile_name(target.nombres), '') is null
      or nullif(nexo_private.client_profile_name(target.apellidos), '') is null then
      raise exception 'El responsable debe ser un perfil activo con nombres y apellidos completos.' using errcode = '22023';
    end if;
    if tg_op = 'INSERT' then
      -- El llamador no controla el snapshot inicial de una identidad UUID.
      new.responsable := nexo_private.client_profile_name(target.nombres) || ' '
        || nexo_private.client_profile_name(target.apellidos);
    end if;
  end if;

  -- INSERT NULL conserva el texto recibido como dato histórico de transición.
  -- UPDATE UUID sin cambios conserva también referencias inactivas/incompletas.
  return new;
end;
$$;
revoke all on function nexo_private.prepare_client_responsible() from public, anon, authenticated;
create trigger clientes_prepare_responsible before insert or update on public.clientes
  for each row execute function nexo_private.prepare_client_responsible();

-- Mantiene el trigger existente. Un UPDATE siempre produce un token distinto,
-- incluso dentro de la misma transacción o si el reloj tiene poca resolución.
-- Los servicios comparan el timestamp original, sin convertirlo a Date JS.
create or replace function public.set_clientes_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  return new;
end;
$$;
revoke all on function public.set_clientes_updated_at() from public, anon, authenticated;

-- Solo este núcleo privado puede escribir convertido_cliente_id. No añade
-- acceso a Auth ni utiliza service_role. No confía en el wrapper como permiso:
-- valida sesión/actor y exige el alcance global exacto del contrato de policies.
create function nexo_private.convert_lead_to_client(
  p_lead_id uuid,
  p_apellidos text default null,
  p_correo text default null,
  p_existing_client_id uuid default null
)
returns table (resultado text, cliente_id uuid, cliente_nombre text, cliente_correo text)
language plpgsql security definer set search_path = '' as $$
declare
  source public.leads;
  customer public.clientes;
  actor public.profiles;
  target public.profiles;
  actor_id uuid := auth.uid();
  email_value text;
  surname text;
  owner_name text;
  owner_id uuid;
  outcome text;
begin
  if actor_id is null or auth.role() is distinct from 'authenticated'
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Necesitas una sesión autenticada para convertir leads.' using errcode = '42501';
  end if;
  -- Evitar que un perfil inválido obtenga información del lead o espere su lock.
  if nexo_private.active_role() not in ('Administrador', 'Gerente', 'Vendedor')
    or nexo_private.active_role() is null then
    raise exception 'Necesitas un perfil comercial activo para convertir leads.' using errcode = '42501';
  end if;
  perform nexo_private.assert_client_conversion_policy_baseline();

  select l.* into source from public.leads l where l.id = p_lead_id for update;
  if not found then
    raise exception 'No se encontró el lead.' using errcode = 'P0002';
  end if;
  perform p.id from public.profiles p
    where p.id in (actor_id, source.responsable_id) order by p.id for share;
  select p.* into actor from public.profiles p where p.id = actor_id;
  if not found or actor.activo is not true
    or coalesce(actor.rol, '') not in ('Administrador', 'Gerente', 'Vendedor') then
    raise exception 'Necesitas un perfil comercial activo para convertir leads.' using errcode = '42501';
  end if;

  -- Se conserva la idempotencia aun con parámetros diferentes en un reintento.
  if source.convertido_cliente_id is not null then
    select c.* into customer from public.clientes c where c.id = source.convertido_cliente_id;
    if not found then
      raise exception 'No se encontró el cliente de la conversión anterior.' using errcode = 'P0002';
    end if;
    return query select 'ya_convertido'::text, customer.id,
      btrim(customer.nombres || ' ' || customer.apellidos), customer.correo;
    return;
  end if;

  email_value := lower(btrim(coalesce(p_correo, source.correo)));
  surname := btrim(coalesce(p_apellidos, source.apellidos));
  if email_value = '' or char_length(email_value) > 254
    or email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Completa un correo válido para convertir el lead a cliente.' using errcode = '22023';
  end if;
  if char_length(surname) not between 1 and 100 then
    raise exception 'Completa los apellidos antes de convertir el lead.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(719025, pg_catalog.hashtext(email_value));
  if p_existing_client_id is not null then
    select c.* into customer from public.clientes c
      where c.id = p_existing_client_id and lower(btrim(c.correo)) = email_value for share;
    if not found then
      raise exception 'El cliente ya no coincide con el correo. Vuelve a comprobarlo.' using errcode = '22023';
    end if;
    -- Vincular nunca reasigna ni modifica el snapshot histórico de Clientes.
    outcome := 'vinculado';
  else
    select c.* into customer from public.clientes c
      where lower(btrim(c.correo)) = email_value order by c.created_at, c.id limit 1 for share;
    if found then
      return query select 'requiere_vinculo'::text, customer.id,
        btrim(customer.nombres || ' ' || customer.apellidos), customer.correo;
      return;
    end if;

    select p.* into target from public.profiles p where p.id = source.responsable_id;
    if found then
      owner_name := nullif(pg_catalog.concat_ws(' ',
        nullif(nexo_private.client_profile_name(target.nombres), ''),
        nullif(nexo_private.client_profile_name(target.apellidos), '')), '');
      if target.activo and target.rol in ('Administrador', 'Gerente', 'Vendedor')
        and nullif(nexo_private.client_profile_name(target.nombres), '') is not null
        and nullif(nexo_private.client_profile_name(target.apellidos), '') is not null
        and (actor.rol in ('Administrador', 'Gerente') or target.id = actor_id) then
        owner_id := target.id;
      end if;
    end if;

    -- Nunca inferir UUID por nombre. Fuente inactiva, incompleta o no asignable
    -- para el actor produce NULL explícito y conserva el texto disponible.
    begin
      insert into public.clientes(
        nombres, apellidos, empresa, correo, telefono, cargo, estado, notas,
        responsable, responsable_id, ultimo_contacto
      ) values (
        source.nombres, surname, source.empresa, email_value, source.telefono,
        source.cargo, 'Prospecto', source.notas, coalesce(owner_name, 'Sin asignar'),
        owner_id, source.ultimo_contacto
      ) returning * into customer;
    exception when unique_violation then
      -- Un alta desde Clientes puede ganar aunque no use el advisory lock.
      select c.* into customer from public.clientes c
        where lower(btrim(c.correo)) = email_value order by c.created_at, c.id limit 1 for share;
      if not found then raise; end if;
      return query select 'requiere_vinculo'::text, customer.id,
        btrim(customer.nombres || ' ' || customer.apellidos), customer.correo;
      return;
    end;
    outcome := 'creado';
  end if;

  update public.leads set estado = 'Convertido', convertido_cliente_id = customer.id,
    apellidos = surname, correo = email_value where id = source.id;
  return query select outcome, customer.id,
    btrim(customer.nombres || ' ' || customer.apellidos), customer.correo;
end;
$$;
revoke all on function nexo_private.convert_lead_to_client(uuid, text, text, uuid)
  from public, anon, authenticated;
grant execute on function nexo_private.convert_lead_to_client(uuid, text, text, uuid) to authenticated;

-- La RPC expuesta es INVOKER. Comprueba visibilidad real con la RLS del actor
-- antes y después del núcleo privado. Si el resultado no es visible, aborta
-- toda la llamada y sus escrituras. No recibe UUID de actor ni un rol del UI.
create or replace function public.convert_lead(
  p_lead_id uuid,
  p_apellidos text default null,
  p_correo text default null,
  p_existing_client_id uuid default null
)
returns table (resultado text, cliente_id uuid, cliente_nombre text, cliente_correo text)
language plpgsql security invoker set search_path = '' as $$
declare
  previous_client_id uuid;
  response record;
begin
  select l.convertido_cliente_id into previous_client_id
    from public.leads l where l.id = p_lead_id;
  if not found then
    raise exception 'No se encontró un lead accesible.' using errcode = 'P0002';
  end if;
  if previous_client_id is not null then
    if not exists (select 1 from public.clientes c where c.id = previous_client_id) then
      raise exception 'No tienes acceso al cliente convertido.' using errcode = '42501';
    end if;
  elsif p_existing_client_id is not null then
    if not exists (select 1 from public.clientes c where c.id = p_existing_client_id) then
      raise exception 'No tienes acceso al cliente seleccionado.' using errcode = '42501';
    end if;
  end if;

  select * into response from nexo_private.convert_lead_to_client(
    p_lead_id, p_apellidos, p_correo, p_existing_client_id
  );
  if not exists (select 1 from public.leads l where l.id = p_lead_id)
    or not exists (select 1 from public.clientes c where c.id = response.cliente_id) then
    raise exception 'La conversión no cumple la visibilidad actual de RLS.' using errcode = '42501';
  end if;
  return query select response.resultado::text, response.cliente_id::uuid,
    response.cliente_nombre::text, response.cliente_correo::text;
end;
$$;
revoke all on function public.convert_lead(uuid, text, text, uuid) from public, anon;
grant execute on function public.convert_lead(uuid, text, text, uuid) to authenticated;

commit;

-- Verificaciones futuras de solo lectura (no acreditan pruebas de permisos).
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'clientes'
  and column_name in ('responsable', 'responsable_id', 'updated_at');
select conname, pg_catalog.pg_get_constraintdef(oid) as definition
from pg_catalog.pg_constraint
where conrelid = 'public.clientes'::regclass and conname = 'clientes_responsable_id_fkey';
select n.nspname, p.proname, p.prosecdef, p.proconfig, p.proacl,
  pg_catalog.pg_get_userbyid(p.proowner) as owner
from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where (n.nspname, p.proname) in (
  ('public', 'convert_lead'), ('nexo_private', 'convert_lead_to_client'),
  ('nexo_private', 'prepare_client_responsible'), ('public', 'set_clientes_updated_at'),
  ('nexo_private', 'client_profile_name'), ('nexo_private', 'assert_client_conversion_policy_baseline')
);
-- Comparar baseline de id/responsable/updated_at, relaciones, RLS y ACL.
-- Sin productores activos en la expansión, responsable_id debe seguir NULL
-- para TODAS las filas preexistentes, incluido el caso histórico Ana García.
-- No se incluye rollback destructivo: preservar columna, UUID, FK y snapshots.
