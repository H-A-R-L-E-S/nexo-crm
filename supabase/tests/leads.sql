-- Verificación MANUAL después de leads.sql. Ejecutar completa en SQL Editor.
-- No ejecutada por Playwright. Datos de prueba aislados en una transacción.
-- Si aparece una excepción, ejecutar ROLLBACK antes de continuar.
begin;
select set_config('nexo.lead_admin', gen_random_uuid()::text, true);
select set_config('nexo.lead_manager', gen_random_uuid()::text, true);
select set_config('nexo.lead_seller', gen_random_uuid()::text, true);
select set_config('nexo.lead_inactive', gen_random_uuid()::text, true);
insert into auth.users(id, email, raw_user_meta_data)
select current_setting(setting)::uuid, current_setting(setting) || '@example.invalid',
  '{"nombres":"Prueba","apellidos":"Leads"}'::jsonb
from unnest(array['nexo.lead_admin', 'nexo.lead_manager', 'nexo.lead_seller', 'nexo.lead_inactive']) as settings(setting);
update public.profiles set rol = 'Administrador' where id = current_setting('nexo.lead_admin')::uuid;
update public.profiles set rol = 'Gerente' where id = current_setting('nexo.lead_manager')::uuid;
insert into public.leads(nombres, telefono, responsable_id)
values ('Historial', '999123456', current_setting('nexo.lead_inactive')::uuid);
update public.profiles set activo = false where id = current_setting('nexo.lead_inactive')::uuid;

set local role authenticated;
do $$
declare actor text; lead_id uuid; duplicate_id uuid; customer_id uuid; response record; affected integer;
begin
  foreach actor in array array['nexo.lead_admin', 'nexo.lead_manager', 'nexo.lead_seller'] loop
    perform set_config('request.jwt.claims', json_build_object('sub', current_setting(actor), 'role', 'authenticated')::text, true);
    insert into public.leads(nombres, apellidos, telefono, correo, notas)
      values ('Prueba', 'Conversión', '999123456', current_setting(actor) || '@example.invalid', 'Historial conservado') returning id into lead_id;
    update public.leads set empresa = 'Empresa de prueba', estado = 'Calificado' where id = lead_id;
    if not exists (select 1 from public.leads where id = lead_id and estado = 'Calificado') then raise exception 'No puede editar %', actor; end if;
    if actor = 'nexo.lead_seller' then
      if not exists (select 1 from public.leads where id = lead_id and responsable_id = auth.uid()) then raise exception 'Falta asignación automática'; end if;
      begin
        update public.leads set responsable_id = current_setting('nexo.lead_admin')::uuid where id = lead_id;
        raise exception 'Vendedor pudo reasignar';
      exception when insufficient_privilege then null; end;
    else
      update public.leads set responsable_id = current_setting('nexo.lead_seller')::uuid where id = lead_id;
      begin
        update public.leads set responsable_id = current_setting('nexo.lead_inactive')::uuid where id = lead_id;
        raise exception 'Se asignó un responsable inactivo';
      exception when invalid_parameter_value then null; end;
    end if;
    begin
      update public.leads set convertido_cliente_id = gen_random_uuid() where id = lead_id;
      raise exception 'Se permitió escribir la relación sin RPC';
    exception when insufficient_privilege then null; end;
    begin
      update public.leads set estado = 'Convertido' where id = lead_id;
      raise exception 'Se permitió convertir sin cliente';
    exception when check_violation then null; end;
    begin
      perform public.convert_lead(lead_id, '', 'invalido', null);
      raise exception 'Se permitió una conversión inválida';
    exception when invalid_parameter_value then null; end;
    if not exists (select 1 from public.leads where id = lead_id and estado = 'Calificado' and convertido_cliente_id is null) then raise exception 'La conversión fallida cambió el lead'; end if;
    select * into response from public.convert_lead(lead_id);
    customer_id := response.cliente_id;
    if response.resultado <> 'creado' then raise exception 'No se creó el cliente'; end if;
    if not exists (select 1 from public.clientes where id = customer_id and notas = 'Historial conservado' and estado = 'Prospecto') then raise exception 'No se copiaron los datos'; end if;
    select * into response from public.convert_lead(lead_id);
    if response.resultado <> 'ya_convertido' or response.cliente_id <> customer_id then raise exception 'Conversión no idempotente'; end if;
    if (select count(*) from public.clientes where lower(correo) = current_setting(actor) || '@example.invalid') <> 1 then raise exception 'Cliente duplicado'; end if;
    insert into public.leads(nombres, apellidos, telefono, correo)
      values ('Otro contacto', 'Prueba', '999123456', upper(current_setting(actor) || '@example.invalid')) returning id into duplicate_id;
    select * into response from public.convert_lead(duplicate_id);
    if response.resultado <> 'requiere_vinculo' or response.cliente_id <> customer_id then raise exception 'No detectó correo duplicado'; end if;
    if not exists (select 1 from public.leads where id = duplicate_id and estado = 'Nuevo') then raise exception 'Vinculó sin confirmación'; end if;
    select * into response from public.convert_lead(duplicate_id, null, null, customer_id);
    if response.resultado <> 'vinculado' then raise exception 'No vinculó el cliente existente'; end if;
    delete from public.leads where id in (lead_id, duplicate_id);
    get diagnostics affected = row_count;
    if actor = 'nexo.lead_seller' then
      if affected <> 0 then raise exception 'Vendedor pudo eliminar directamente'; end if;
    elsif affected <> 2 then raise exception 'Administrador/Gerente no pudo eliminar';
    end if;
  end loop;
  -- El vendedor puede ver el historial inactivo sin ampliar SELECT de profiles.
  if not exists (select 1 from public.lead_responsibles() where id = current_setting('nexo.lead_inactive')::uuid and not activo) then raise exception 'Se perdió el responsable histórico'; end if;
  if exists (select 1 from public.profiles where id = current_setting('nexo.lead_admin')::uuid) then raise exception 'El directorio amplió profiles'; end if;
  update public.leads set notas = 'Historial editable' where responsable_id = current_setting('nexo.lead_inactive')::uuid;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'No se pudo editar conservando responsable inactivo'; end if;
end $$;
reset role;

-- Inactivo: ninguna fila visible, sin alta ni conversión.
select set_config('request.jwt.claims', json_build_object('sub', current_setting('nexo.lead_inactive'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  if exists (select 1 from public.leads) then raise exception 'Inactivo lee leads'; end if;
  if exists (select 1 from public.lead_responsibles()) then raise exception 'Inactivo lee directorio'; end if;
  begin insert into public.leads(nombres, telefono) values ('No permitido', '999123456');
    raise exception 'Inactivo crea leads'; exception when insufficient_privilege then null; end;
  begin perform public.convert_lead(gen_random_uuid());
    raise exception 'Inactivo invoca conversión'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  begin perform 1 from public.leads; raise exception 'Anon lee leads'; exception when insufficient_privilege then null; end;
  begin perform public.convert_lead(gen_random_uuid()); raise exception 'Anon convierte leads'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'Pruebas de Leads completadas; datos revertidos.' as resultado;
