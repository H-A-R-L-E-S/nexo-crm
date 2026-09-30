-- Nexo CRM · Administración de usuarios.
-- Ejecutar manualmente DESPUÉS de auth_roles.sql. No cambia políticas de clientes.
begin;

-- Administradores activos ven al equipo; los demás conservan profiles_read_self.
-- active_role es SECURITY DEFINER y no consulta profiles a través de su RLS.
drop policy if exists profiles_admin_read_team on public.profiles;
create policy profiles_admin_read_team on public.profiles for select to authenticated
  using ((select nexo_private.active_role()) = 'Administrador');

-- Reutiliza el trigger existente. Las altas hechas por el servidor empiezan
-- inactivas, hasta que la operación administrativa termina correctamente.
-- app_metadata solo puede establecerse con la API administrativa, no por signup.
create or replace function public.nexo_create_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nombres, apellidos, email, rol, activo)
  values (
    new.id,
    left(trim(coalesce(new.raw_user_meta_data ->> 'nombres', '')), 80),
    left(trim(coalesce(new.raw_user_meta_data ->> 'apellidos', '')), 100),
    coalesce(new.email, ''),
    'Vendedor',
    coalesce(new.raw_app_meta_data ->> 'nexo_provisioning', 'false') <> 'true'
  ) on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.nexo_create_profile() from public, anon, authenticated;

-- Una sola transacción para validar y cambiar rol/estado.
-- Las altas, activaciones y cambios de rol se serializan con el mismo bloqueo.
-- No ampliar GRANT UPDATE en profiles: los usuarios mantienen solo nombres/apellidos.
create or replace function public.admin_update_profile(
  p_id uuid,
  p_nombres text,
  p_apellidos text,
  p_rol text,
  p_activo boolean,
  p_updated_at timestamptz default null
)
returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid;
  target public.profiles;
  result public.profiles;
begin
  perform pg_advisory_xact_lock(719024, 1);
  actor_id := auth.uid();
  if actor_id is null or nexo_private.active_role() is distinct from 'Administrador' then
    raise exception 'Solo un Administrador activo puede administrar usuarios.' using errcode = '42501';
  end if;
  -- Perfiles antiguos creados desde Dashboard pueden tener nombres vacíos.
  -- Cambiar su estado no debe impedirse por eso; los formularios exigen nombres.
  if p_nombres is null or char_length(trim(p_nombres)) > 80
    or p_apellidos is null or char_length(trim(p_apellidos)) > 100
    or p_rol is null or p_rol not in ('Administrador', 'Gerente', 'Vendedor')
    or p_activo is null then
    raise exception 'Los datos del usuario no son válidos.' using errcode = '22023';
  end if;
  select * into target from public.profiles where id = p_id for update;
  if not found then
    raise exception 'No se encontró el perfil del usuario.' using errcode = 'P0002';
  end if;
  if p_id = actor_id and (not p_activo or p_rol <> 'Administrador') then
    raise exception 'No puedes desactivarte ni quitarte tu rol de Administrador.' using errcode = '42501';
  end if;
  if p_updated_at is not null and target.updated_at <> p_updated_at then
    raise exception 'El usuario cambió mientras lo editabas. Actualiza la lista.' using errcode = '40001';
  end if;
  if target.rol = 'Administrador' and target.activo and (not p_activo or p_rol <> 'Administrador')
    and (select count(*) from public.profiles where rol = 'Administrador' and activo) <= 1 then
    raise exception 'Debe quedar al menos un Administrador activo.' using errcode = '42501';
  end if;
  update public.profiles
    set nombres = trim(p_nombres), apellidos = trim(p_apellidos), rol = p_rol, activo = p_activo
    where id = p_id returning * into result;
  return result;
end;
$$;
revoke all on function public.admin_update_profile(uuid, text, text, text, boolean, timestamptz) from public, anon;
grant execute on function public.admin_update_profile(uuid, text, text, text, boolean, timestamptz) to authenticated;

-- Preflight antes de crear en Auth: sin esta migración no se inicia un alta.
create or replace function public.admin_user_management_ready()
returns boolean language sql stable set search_path = '' as $$
  select nexo_private.active_role() = 'Administrador'
$$;
revoke all on function public.admin_user_management_ready() from public, anon;
grant execute on function public.admin_user_management_ready() to authenticated;

commit;

-- Conservar deshabilitado el registro público. No se otorga DELETE en profiles
-- ni se agrega ninguna operación para eliminar usuarios de Auth.
-- No volver a ejecutar auth_roles.sql después sin reaplicar esta migración:
-- ese archivo contiene la versión anterior del trigger de creación.
