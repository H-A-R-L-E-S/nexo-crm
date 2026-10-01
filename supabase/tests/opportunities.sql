-- Ejecutar MANUALMENTE después de opportunities.sql. No es una migración.
-- Aísla datos de prueba y termina en ROLLBACK; ante un error ejecutar ROLLBACK.
begin;
select set_config('nexo.opp_admin', gen_random_uuid()::text, true);
select set_config('nexo.opp_manager', gen_random_uuid()::text, true);
select set_config('nexo.opp_seller', gen_random_uuid()::text, true);
select set_config('nexo.opp_inactive', gen_random_uuid()::text, true);
select set_config('nexo.opp_customer', gen_random_uuid()::text, true);
select set_config('nexo.opp_other_customer', gen_random_uuid()::text, true);
select set_config('nexo.opp_lead', gen_random_uuid()::text, true);
insert into auth.users(id, email, raw_user_meta_data)
select current_setting(setting)::uuid, current_setting(setting) || '@example.invalid', '{"nombres":"Prueba","apellidos":"Oportunidades"}'::jsonb
from unnest(array['nexo.opp_admin', 'nexo.opp_manager', 'nexo.opp_seller', 'nexo.opp_inactive']) as settings(setting);
update public.profiles set rol = 'Administrador' where id = current_setting('nexo.opp_admin')::uuid;
update public.profiles set rol = 'Gerente' where id = current_setting('nexo.opp_manager')::uuid;
insert into public.clientes(id, nombres, apellidos, correo, telefono)
select current_setting(setting)::uuid, 'Cliente', 'Prueba', current_setting(setting) || '@example.invalid', '999123456'
from unnest(array['nexo.opp_customer', 'nexo.opp_other_customer']) as settings(setting);
insert into public.leads(id, nombres, apellidos, correo, telefono, estado, convertido_cliente_id)
values (current_setting('nexo.opp_lead')::uuid, 'Lead', 'Convertido', current_setting('nexo.opp_customer') || '@example.invalid', '999123456', 'Convertido', current_setting('nexo.opp_customer')::uuid);
insert into public.oportunidades(titulo, cliente_id, responsable_id, valor)
values ('Historial inactivo', current_setting('nexo.opp_customer')::uuid, current_setting('nexo.opp_inactive')::uuid, 0.10);
update public.profiles set activo = false where id = current_setting('nexo.opp_inactive')::uuid;

set local role authenticated;
do $$
declare actor text; opportunity_id uuid; affected integer; closing timestamptz;
begin
  foreach actor in array array['nexo.opp_admin', 'nexo.opp_manager', 'nexo.opp_seller'] loop
    perform set_config('request.jwt.claims', json_build_object('sub', current_setting(actor), 'role', 'authenticated')::text, true);
    insert into public.oportunidades(titulo, cliente_id, lead_id, responsable_id, valor, probabilidad)
    values ('Contrato de prueba', current_setting('nexo.opp_customer')::uuid, current_setting('nexo.opp_lead')::uuid, auth.uid(), 1234.56, 10) returning id into opportunity_id;
    if not exists (select 1 from public.oportunidades where id = opportunity_id and valor_decimal = '1234.56') then raise exception 'El decimal no se preserva'; end if;
    update public.oportunidades set titulo = 'Contrato editado', etapa = 'Propuesta', probabilidad = 60 where id = opportunity_id;
    if not exists (select 1 from public.oportunidades where id = opportunity_id and probabilidad = 60 and titulo = 'Contrato editado') then raise exception 'Edición fallida para %', actor; end if;
    begin update public.oportunidades set valor = -1 where id = opportunity_id;
      raise exception 'Se permitió dinero negativo'; exception when check_violation then null; end;
    begin update public.oportunidades set probabilidad = 101 where id = opportunity_id;
      raise exception 'Se permitió probabilidad inválida'; exception when check_violation then null; end;
    begin update public.oportunidades set cliente_id = current_setting('nexo.opp_other_customer')::uuid where id = opportunity_id;
      raise exception 'El lead quedó asociado a otro cliente'; exception when invalid_parameter_value then null; end;
    begin update public.oportunidades set cerrada_at = now() where id = opportunity_id;
      raise exception 'Se permitió escribir el cierre real'; exception when insufficient_privilege then null; end;
    if actor = 'nexo.opp_seller' then
      begin update public.oportunidades set responsable_id = current_setting('nexo.opp_admin')::uuid where id = opportunity_id;
        raise exception 'Vendedor pudo reasignar'; exception when insufficient_privilege then null; end;
      begin insert into public.oportunidades(titulo, cliente_id, responsable_id) values ('Asignación indebida', current_setting('nexo.opp_customer')::uuid, current_setting('nexo.opp_admin')::uuid);
        raise exception 'Vendedor pudo asignar a otro'; exception when insufficient_privilege then null; end;
    else
      update public.oportunidades set responsable_id = current_setting('nexo.opp_seller')::uuid where id = opportunity_id;
      begin update public.oportunidades set responsable_id = current_setting('nexo.opp_inactive')::uuid where id = opportunity_id;
        raise exception 'Se asignó un perfil inactivo'; exception when invalid_parameter_value then null; end;
    end if;
    update public.oportunidades set etapa = 'Ganada' where id = opportunity_id returning cerrada_at into closing;
    if closing is null or not exists (select 1 from public.oportunidades where id = opportunity_id and probabilidad = 100) then raise exception 'Ganada sin cierre o probabilidad'; end if;
    update public.oportunidades set descripcion = 'Descripción posterior al cierre' where id = opportunity_id;
    if not exists (select 1 from public.oportunidades where id = opportunity_id and cerrada_at = closing) then raise exception 'Editar alteró el mes de cierre'; end if;
    update public.oportunidades set etapa = 'Contacto', probabilidad = 25 where id = opportunity_id;
    if not exists (select 1 from public.oportunidades where id = opportunity_id and cerrada_at is null) then raise exception 'Reapertura conserva cierre'; end if;
    update public.oportunidades set etapa = 'Perdida' where id = opportunity_id;
    if not exists (select 1 from public.oportunidades where id = opportunity_id and probabilidad = 0 and cerrada_at is not null) then raise exception 'Perdida inconsistente'; end if;
    delete from public.oportunidades where id = opportunity_id;
    get diagnostics affected = row_count;
    if actor = 'nexo.opp_seller' then
      if affected <> 0 then raise exception 'Vendedor pudo eliminar directamente'; end if;
    elsif affected <> 1 then raise exception 'Administrador/Gerente no pudo eliminar';
    end if;
  end loop;
  if not exists (select 1 from public.opportunity_responsibles() where id = current_setting('nexo.opp_inactive')::uuid and not activo) then raise exception 'Se perdió responsable histórico'; end if;
  if exists (select 1 from public.profiles where id = current_setting('nexo.opp_admin')::uuid) then raise exception 'El directorio amplió RLS de Profiles'; end if;
  update public.oportunidades set descripcion = 'Historial conservado' where responsable_id = current_setting('nexo.opp_inactive')::uuid;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'No se conservó relación inactiva al editar'; end if;
end $$;
reset role;

select set_config('request.jwt.claims', json_build_object('sub', current_setting('nexo.opp_inactive'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  if exists (select 1 from public.oportunidades) then raise exception 'Inactivo lee oportunidades'; end if;
  if exists (select 1 from public.opportunity_responsibles()) then raise exception 'Inactivo lee responsables'; end if;
  begin insert into public.oportunidades(titulo, cliente_id) values ('No permitido', current_setting('nexo.opp_customer')::uuid);
    raise exception 'Inactivo crea oportunidades'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  begin perform 1 from public.oportunidades; raise exception 'Anon lee oportunidades'; exception when insufficient_privilege then null; end;
  begin perform public.opportunity_responsibles(); raise exception 'Anon lee responsables'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'Pruebas de oportunidades completadas; datos revertidos.' as resultado;
