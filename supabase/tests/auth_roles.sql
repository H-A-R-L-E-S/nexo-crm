-- Pruebas reales de privilegios y RLS: ejecutar manualmente en SQL Editor
-- DESPUÉS de auth_roles.sql. Todo se revierte con ROLLBACK (también los usuarios).
-- Si hay un error, ejecutar ROLLBACK; corregir antes de habilitar el acceso.
begin;
select set_config('nexo.test_seller', gen_random_uuid()::text, true);
select set_config('nexo.test_manager', gen_random_uuid()::text, true);
select set_config('nexo.test_admin', gen_random_uuid()::text, true);
select set_config('nexo.test_inactive', gen_random_uuid()::text, true);
select set_config('nexo.test_client', gen_random_uuid()::text, true);

insert into auth.users (id, email, raw_user_meta_data)
select current_setting(setting)::uuid, current_setting(setting) || '@example.invalid',
  '{"nombres":"Prueba","apellidos":"RLS","rol":"Administrador"}'::jsonb
from unnest(array['nexo.test_seller', 'nexo.test_manager', 'nexo.test_admin', 'nexo.test_inactive']) as settings(setting);

do $$ begin
  if (select rol from public.profiles where id = current_setting('nexo.test_seller')::uuid) <> 'Vendedor' then
    raise exception 'El trigger confió en el rol enviado por el usuario';
  end if;
end $$;
update public.profiles set rol = 'Gerente' where id = current_setting('nexo.test_manager')::uuid;
update public.profiles set rol = 'Administrador' where id = current_setting('nexo.test_admin')::uuid;
update public.profiles set activo = false where id = current_setting('nexo.test_inactive')::uuid;

-- anon: ni lectura ni escritura, aunque se llame directamente a la API.
set local role anon;
do $$ begin
  begin perform id from public.clientes limit 1; raise exception 'anon puede leer clientes';
    exception when insufficient_privilege then null; end;
  begin insert into public.clientes(nombres, apellidos, correo, telefono) values ('Prueba', 'RLS', 'anon@example.invalid', '999999999');
    raise exception 'anon puede crear clientes'; exception when insufficient_privilege then null; end;
  begin update public.clientes set empresa = 'No permitido' where false;
    raise exception 'anon tiene UPDATE'; exception when insufficient_privilege then null; end;
  begin delete from public.clientes where false;
    raise exception 'anon tiene DELETE'; exception when insufficient_privilege then null; end;
  begin perform id from public.profiles limit 1; raise exception 'anon puede leer perfiles';
    exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Vendedor activo: CRUD salvo DELETE; perfil propio, sin elevar privilegios.
select set_config('request.jwt.claims', json_build_object('sub', current_setting('nexo.test_seller'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ declare affected integer; begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'Debe verse solo el perfil propio'; end if;
  update public.profiles set nombres = 'Nombre seguro' where id = (select auth.uid());
  begin update public.profiles set rol = 'Administrador' where id = (select auth.uid());
    raise exception 'Autoasignación de rol permitida'; exception when insufficient_privilege then null; end;
  begin update public.profiles set activo = false where id = (select auth.uid());
    raise exception 'Cambio de activo permitido'; exception when insufficient_privilege then null; end;
  begin update public.profiles set email = 'otro@example.invalid' where id = (select auth.uid());
    raise exception 'Cambio de email permitido'; exception when insufficient_privilege then null; end;
  insert into public.clientes(id, nombres, apellidos, correo, telefono)
    values (current_setting('nexo.test_client')::uuid, 'Prueba', 'RLS', current_setting('nexo.test_client') || '@example.invalid', '999999999');
  update public.clientes set empresa = 'Actualizado' where id = current_setting('nexo.test_client')::uuid;
  if not exists (select 1 from public.clientes where id = current_setting('nexo.test_client')::uuid and empresa = 'Actualizado') then raise exception 'Vendedor no puede leer/editar'; end if;
  delete from public.clientes where id = current_setting('nexo.test_client')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Vendedor logró eliminar'; end if;
end $$;
reset role;

-- Inactivo: ninguna fila visible ni permisos efectivos de escritura.
select set_config('request.jwt.claims', json_build_object('sub', current_setting('nexo.test_inactive'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ declare affected integer; begin
  if exists (select 1 from public.clientes) then raise exception 'Inactivo puede leer clientes'; end if;
  begin insert into public.clientes(nombres, apellidos, correo, telefono) values ('Prueba', 'RLS', 'inactivo@example.invalid', '999999999');
    raise exception 'Inactivo puede crear clientes'; exception when insufficient_privilege then null; end;
  update public.clientes set empresa = 'No permitido' where id = current_setting('nexo.test_client')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Inactivo puede editar clientes'; end if;
  delete from public.clientes where id = current_setting('nexo.test_client')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Inactivo puede eliminar clientes'; end if;
end $$;
reset role;

-- Gerente: puede eliminar el cliente que el Vendedor no pudo eliminar.
select set_config('request.jwt.claims', json_build_object('sub', current_setting('nexo.test_manager'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ declare affected integer; begin
  delete from public.clientes where id = current_setting('nexo.test_client')::uuid;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Gerente no puede eliminar'; end if;
end $$;
reset role;

-- Administrador: crear, leer, editar, eliminar.
select set_config('request.jwt.claims', json_build_object('sub', current_setting('nexo.test_admin'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ declare affected integer; begin
  insert into public.clientes(id, nombres, apellidos, correo, telefono)
    values (current_setting('nexo.test_client')::uuid, 'Prueba', 'RLS', current_setting('nexo.test_client') || '@example.invalid', '999999999');
  update public.clientes set empresa = 'Administrador' where id = current_setting('nexo.test_client')::uuid;
  if not exists (select 1 from public.clientes where id = current_setting('nexo.test_client')::uuid and empresa = 'Administrador') then raise exception 'Administrador no puede leer/editar'; end if;
  delete from public.clientes where id = current_setting('nexo.test_client')::uuid;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Administrador no puede eliminar'; end if;
end $$;
reset role;
rollback;
select 'Pruebas RLS completadas; datos de prueba revertidos.' as resultado;
