-- Nexo CRM · migración de autenticación y roles.
-- Ejecutar MANUALMENTE en Supabase SQL Editor, después del schema.sql existente.
-- Conserva clientes. Reemplaza TODAS sus políticas anteriores (incluidas las anon).
-- No volver a ejecutar el schema.sql temporal después de esta migración.
begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombres text not null default '' check (char_length(nombres) <= 80),
  apellidos text not null default '' check (char_length(apellidos) <= 100),
  email text not null check (char_length(email) <= 254),
  rol text not null default 'Vendedor' check (rol in ('Administrador', 'Gerente', 'Vendedor')),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 2048),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists profiles_rol_activo_idx on public.profiles (rol) where activo;

create or replace function public.set_profiles_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_profiles_updated_at() from public, anon, authenticated;
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_profiles_updated_at();

-- Ignora cualquier rol/activo/email enviado en user_metadata.
-- El rol inicial siempre es Vendedor; solo el operador SQL lo eleva.
create or replace function public.nexo_create_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nombres, apellidos, email, rol)
  values (
    new.id,
    left(trim(coalesce(new.raw_user_meta_data ->> 'nombres', '')), 80),
    left(trim(coalesce(new.raw_user_meta_data ->> 'apellidos', '')), 100),
    coalesce(new.email, ''),
    'Vendedor'
  ) on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.nexo_create_profile() from public, anon, authenticated;
drop trigger if exists nexo_auth_user_created on auth.users;
create trigger nexo_auth_user_created after insert on auth.users
  for each row execute function public.nexo_create_profile();

-- Usuarios existentes: crea solo los perfiles faltantes, sin cambiar roles actuales.
insert into public.profiles (id, nombres, apellidos, email)
select id, left(trim(coalesce(raw_user_meta_data ->> 'nombres', '')), 80),
  left(trim(coalesce(raw_user_meta_data ->> 'apellidos', '')), 100), coalesce(email, '')
from auth.users on conflict (id) do nothing;

create or replace function public.nexo_sync_profile_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;
revoke all on function public.nexo_sync_profile_email() from public, anon, authenticated;
drop trigger if exists nexo_auth_email_updated on auth.users;
create trigger nexo_auth_email_updated after update of email on auth.users
  for each row execute function public.nexo_sync_profile_email();

alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
-- GRANT por columna: RLS por sí sola no impide cambiar el rol de tu propia fila.
grant update (nombres, apellidos) on public.profiles to authenticated;

drop policy if exists profiles_read_self on public.profiles;
create policy profiles_read_self on public.profiles for select to authenticated
  using (id = (select auth.uid()));
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid()) and activo)
  with check (id = (select auth.uid()) and activo);

-- Función privada sin recursión RLS. No agregar nexo_private a los esquemas expuestos.
create schema if not exists nexo_private;
revoke all on schema nexo_private from public, anon, authenticated;
grant usage on schema nexo_private to authenticated;
create or replace function nexo_private.active_role()
returns text language sql stable security definer set search_path = '' as $$
  select rol from public.profiles
  where id = (select auth.uid()) and activo
    and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
$$;
revoke all on function nexo_private.active_role() from public, anon, authenticated;
grant execute on function nexo_private.active_role() to authenticated;

alter table public.clientes enable row level security;
-- Eliminar políticas permisivas anteriores: PostgreSQL combina políticas con OR.
do $$
declare existing_policy record;
begin
  for existing_policy in select policyname from pg_policies
    where schemaname = 'public' and tablename = 'clientes'
  loop
    execute format('drop policy %I on public.clientes', existing_policy.policyname);
  end loop;
end;
$$;
revoke all on public.clientes from public, anon, authenticated;
grant select, insert, update, delete on public.clientes to authenticated;

create policy clientes_select_authenticated on public.clientes for select to authenticated
  using ((select nexo_private.active_role()) in ('Administrador', 'Gerente', 'Vendedor'));
create policy clientes_insert_authenticated on public.clientes for insert to authenticated
  with check ((select nexo_private.active_role()) in ('Administrador', 'Gerente', 'Vendedor'));
create policy clientes_update_authenticated on public.clientes for update to authenticated
  using ((select nexo_private.active_role()) in ('Administrador', 'Gerente', 'Vendedor'))
  with check ((select nexo_private.active_role()) in ('Administrador', 'Gerente', 'Vendedor'));
create policy clientes_delete_managers on public.clientes for delete to authenticated
  using ((select nexo_private.active_role()) in ('Administrador', 'Gerente'));

commit;

-- IMPORTANTE, en Authentication → Sign In / Providers (configuración de Auth):
-- desactivar "Allow new users to sign up" y los inicios de sesión anónimos.
-- Crear usuarios solo desde Authentication → Users → Add user → Create new user.
-- Para promover el primer administrador, reemplazar el UUID por el mostrado en Users:
-- update public.profiles set rol = 'Administrador', nombres = 'Tu nombre',
--   apellidos = 'Tu apellido' where id = 'UUID_DEL_USUARIO';
