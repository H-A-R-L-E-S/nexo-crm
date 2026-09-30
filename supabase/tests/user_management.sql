-- Ejecutar manualmente tras auth_roles.sql y user_management.sql.
-- Todos los datos de prueba se revierten. Si falla, ejecutar ROLLBACK.
begin;
select set_config('nexo.test_admin', gen_random_uuid()::text, true);
select set_config('nexo.test_manager', gen_random_uuid()::text, true);
select set_config('nexo.test_seller', gen_random_uuid()::text, true);
select set_config('nexo.test_new', gen_random_uuid()::text, true);
insert into auth.users(id, email, raw_user_meta_data)
select current_setting(setting)::uuid, current_setting(setting) || '@example.invalid',
  '{"nombres":"Prueba","apellidos":"Equipo","rol":"Administrador"}'::jsonb
from unnest(array['nexo.test_admin', 'nexo.test_manager', 'nexo.test_seller']) as settings(setting);
update public.profiles set rol = 'Administrador' where id = current_setting('nexo.test_admin')::uuid;
update public.profiles set rol = 'Gerente' where id = current_setting('nexo.test_manager')::uuid;

-- Provisión: incluso si se envía metadata de administrador, empieza Vendedor/inactivo.
insert into auth.users(id, email, raw_user_meta_data, raw_app_meta_data)
values (current_setting('nexo.test_new')::uuid, current_setting('nexo.test_new') || '@example.invalid',
  '{"nombres":"Nuevo","apellidos":"Equipo","rol":"Administrador"}', '{"nexo_provisioning":true}');
do $$ begin
  if not exists (select 1 from public.profiles where id = current_setting('nexo.test_new')::uuid and not activo and rol = 'Vendedor') then
    raise exception 'Alta incompleta no protegida';
  end if;
end $$;

-- Gerente y Vendedor: no ven al equipo, no cambian roles por RPC ni por UPDATE directo.
select set_config('request.jwt.claims', json_build_object('sub', current_setting('nexo.test_manager'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'Gerente ve perfiles de otros'; end if;
  begin perform public.admin_update_profile(current_setting('nexo.test_manager')::uuid, 'Prueba', 'Equipo', 'Administrador', true);
    raise exception 'Gerente logró elevar su rol'; exception when insufficient_privilege then null; end;
  begin update public.profiles set rol = 'Administrador' where id = (select auth.uid());
    raise exception 'Gerente tiene UPDATE directo del rol'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('nexo.test_seller'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'Vendedor ve perfiles de otros'; end if;
  begin perform public.admin_update_profile(current_setting('nexo.test_seller')::uuid, 'Prueba', 'Equipo', 'Administrador', true);
    raise exception 'Vendedor logró elevar su rol'; exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Administrador: ve equipo; debe usar la RPC; no se degrada ni se inactiva a sí mismo.
select set_config('request.jwt.claims', json_build_object('sub', current_setting('nexo.test_admin'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  if not exists (select 1 from public.profiles where id = current_setting('nexo.test_seller')::uuid) then raise exception 'Administrador no ve el equipo'; end if;
  begin update public.profiles set rol = 'Gerente' where id = current_setting('nexo.test_seller')::uuid;
    raise exception 'Cambios críticos eluden la RPC'; exception when insufficient_privilege then null; end;
  begin perform public.admin_update_profile((select auth.uid()), 'Prueba', 'Equipo', 'Vendedor', true);
    raise exception 'Administrador perdió su propio rol'; exception when insufficient_privilege then null; end;
  begin perform public.admin_update_profile((select auth.uid()), 'Prueba', 'Equipo', 'Administrador', false);
    raise exception 'Administrador se desactivó'; exception when insufficient_privilege then null; end;
  perform public.admin_update_profile(current_setting('nexo.test_new')::uuid, 'Nuevo', 'Equipo', 'Gerente', true);
  if not exists (select 1 from public.profiles where id = current_setting('nexo.test_new')::uuid and activo and rol = 'Gerente') then raise exception 'No se completó la provisión'; end if;
  perform public.admin_update_profile(current_setting('nexo.test_new')::uuid, 'Nuevo', 'Equipo', 'Administrador', true);
  perform public.admin_update_profile(current_setting('nexo.test_new')::uuid, 'Nuevo', 'Equipo', 'Vendedor', false);
  if not exists (select 1 from public.profiles where id = current_setting('nexo.test_new')::uuid and not activo and rol = 'Vendedor') then raise exception 'No se aplicaron rol y estado'; end if;
  begin perform public.admin_update_profile(current_setting('nexo.test_new')::uuid, 'Viejo', 'Equipo', 'Administrador', true, '2000-01-01'::timestamptz);
    raise exception 'No se detectó la edición obsoleta'; exception when serialization_failure then null; end;
end $$;
reset role;

-- Un administrador que fue degradado ya no puede ejecutar la siguiente mutación.
update public.profiles set rol = 'Vendedor' where id = current_setting('nexo.test_admin')::uuid;
set local role authenticated;
do $$ begin
  begin perform public.admin_update_profile(current_setting('nexo.test_new')::uuid, 'Nuevo', 'Equipo', 'Administrador', true);
    raise exception 'Administrador degradado conserva acceso'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'Pruebas de administración completadas; datos revertidos.' as resultado;
