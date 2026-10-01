-- Ejecutar MANUALMENTE después de sales.sql. No es una migración.
-- Datos aislados; termina en ROLLBACK. Ante un error, ejecutar ROLLBACK.
begin;
select set_config('nexo.sale_admin', gen_random_uuid()::text, true);
select set_config('nexo.sale_manager', gen_random_uuid()::text, true);
select set_config('nexo.sale_seller', gen_random_uuid()::text, true);
select set_config('nexo.sale_inactive', gen_random_uuid()::text, true);
select set_config('nexo.sale_customer', gen_random_uuid()::text, true);
select set_config('nexo.sale_opportunity', gen_random_uuid()::text, true);
insert into auth.users(id, email, raw_user_meta_data)
select current_setting(setting)::uuid, current_setting(setting) || '@example.invalid', '{"nombres":"Prueba","apellidos":"Ventas"}'::jsonb
from unnest(array['nexo.sale_admin', 'nexo.sale_manager', 'nexo.sale_seller', 'nexo.sale_inactive']) as settings(setting);
update public.profiles set rol = 'Administrador' where id = current_setting('nexo.sale_admin')::uuid;
update public.profiles set rol = 'Gerente' where id = current_setting('nexo.sale_manager')::uuid;
insert into public.clientes(id, nombres, apellidos, correo, telefono)
values (current_setting('nexo.sale_customer')::uuid, 'Cliente', 'Ventas', current_setting('nexo.sale_customer') || '@example.invalid', '999123456');
insert into public.oportunidades(id, titulo, cliente_id, etapa, valor)
values (current_setting('nexo.sale_opportunity')::uuid, 'Contrato ganado', current_setting('nexo.sale_customer')::uuid, 'Ganada', 1000);

-- Asignación histórica que posteriormente queda inactiva.
select set_config('request.jwt.claims', json_build_object('sub', current_setting('nexo.sale_admin'), 'role', 'authenticated')::text, true);
select set_config('nexo.sale_historical', public.save_sale(null, null, gen_random_uuid(),
  jsonb_build_object('cliente_id', current_setting('nexo.sale_customer'), 'responsable_id', current_setting('nexo.sale_inactive'), 'estado', 'Borrador', 'fecha_venta', '2026-10-01', 'aplica_igv', false),
  '[{"descripcion":"Historial","cantidad":"1","precio_unitario":"1.00","descuento":"0.00"}]')::text, true);
update public.profiles set activo = false where id = current_setting('nexo.sale_inactive')::uuid;

set local role authenticated;
do $$
declare actor text; sale_id uuid; request_id uuid; second_id uuid; paid_id uuid;
  header jsonb; lines jsonb; row_value public.ventas; old_version timestamptz; first_number text; last_number text;
begin
  lines := '[{"descripcion":"Consultoría","cantidad":"2","precio_unitario":"100.00","descuento":"10.00","subtotal":"0.01"},{"descripcion":"Soporte","cantidad":"1.5","precio_unitario":"20.00","descuento":"0.00"}]';
  foreach actor in array array['nexo.sale_admin', 'nexo.sale_manager', 'nexo.sale_seller'] loop
    perform set_config('request.jwt.claims', json_build_object('sub', current_setting(actor), 'role', 'authenticated')::text, true);
    header := jsonb_build_object('cliente_id', current_setting('nexo.sale_customer'), 'oportunidad_id', current_setting('nexo.sale_opportunity'), 'responsable_id', current_setting(actor), 'estado', 'Borrador', 'fecha_venta', '2026-10-01', 'aplica_igv', true, 'total', '0.01');
    request_id := gen_random_uuid();
    sale_id := public.save_sale(null, null, request_id, header, lines);
    select * into row_value from public.ventas where id = sale_id;
    if row_value.subtotal <> 230.00 or row_value.descuento <> 10.00 or row_value.impuesto <> 39.60 or row_value.total <> 259.60 then raise exception 'Totales no recalculados por SQL'; end if;
    if (select count(*) from public.venta_items where venta_id = sale_id) <> 2 then raise exception 'Ítems incompletos'; end if;
    if row_value.numero !~ '^V-[0-9]{4}-[0-9]{6,}$' then raise exception 'Numeración incorrecta'; end if;
    first_number := row_value.numero;
    if public.save_sale(null, null, request_id, header, lines) <> sale_id then raise exception 'Reintento creó duplicado'; end if;
    if (select count(*) from public.ventas where id = sale_id) <> 1 then raise exception 'Alta duplicada'; end if;
    begin update public.ventas set total = 0.01 where id = sale_id;
      raise exception 'Se permitió manipular el total directamente'; exception when insufficient_privilege then null; end;
    begin update public.venta_items set precio_unitario = 0.01 where venta_id = sale_id;
      raise exception 'Se permitió manipular ítems directamente'; exception when insufficient_privilege then null; end;
    begin delete from public.ventas where id = sale_id;
      raise exception 'Se permitió borrar sin RPC'; exception when insufficient_privilege then null; end;
    begin perform public.save_sale(sale_id, '2000-01-01', request_id, header, lines);
      raise exception 'No detectó versión obsoleta'; exception when serialization_failure then null; end;
    begin perform public.save_sale(sale_id, row_value.updated_at, request_id, header,
      '[{"descripcion":"Descuento inválido","cantidad":"1","precio_unitario":"10","descuento":"11"}]');
      raise exception 'Se permitió descuento excesivo'; exception when invalid_parameter_value then null; end;
    if not exists (select 1 from public.ventas where id = sale_id and total = 259.60 and updated_at = row_value.updated_at) then raise exception 'Error alteró cabecera'; end if;
    if (select count(*) from public.venta_items where venta_id = sale_id) <> 2 then raise exception 'Error alteró ítems'; end if;
    if actor = 'nexo.sale_seller' then
      begin perform public.save_sale(sale_id, row_value.updated_at, request_id, header || jsonb_build_object('responsable_id', current_setting('nexo.sale_admin')), lines);
        raise exception 'Vendedor reasignó venta'; exception when insufficient_privilege then null; end;
      begin perform public.delete_sale(sale_id, row_value.updated_at);
        raise exception 'Vendedor borró borrador'; exception when insufficient_privilege then null; end;
      begin perform public.set_sale_status(sale_id, 'Cancelada', row_value.updated_at, null, '', '', 'Cancelación indebida');
        raise exception 'Vendedor canceló venta'; exception when insufficient_privilege then null; end;
    else
      begin perform public.save_sale(sale_id, row_value.updated_at, request_id, header || jsonb_build_object('responsable_id', current_setting('nexo.sale_inactive')), lines);
        raise exception 'Asignó responsable inactivo'; exception when invalid_parameter_value then null; end;
    end if;
    old_version := row_value.updated_at;
    perform public.save_sale(sale_id, old_version, request_id, header || '{"estado":"Pendiente","aplica_igv":false}', lines);
    select * into row_value from public.ventas where id = sale_id;
    if row_value.total <> 220 or row_value.emitida_at is null then raise exception 'Edición sin IGV fallida'; end if;
    begin perform public.save_sale(sale_id, row_value.updated_at, request_id, header, lines);
      raise exception 'Pendiente volvió a Borrador'; exception when invalid_parameter_value then null; end;
    begin perform public.set_sale_status(sale_id, 'Pagada', row_value.updated_at);
      raise exception 'Pagada sin fecha ni método'; exception when invalid_parameter_value then null; end;
    perform public.set_sale_status(sale_id, 'Pagada', row_value.updated_at, '2026-10-01', 'Yape', 'REF-PRUEBA');
    select * into row_value from public.ventas where id = sale_id;
    if row_value.fecha_pago is null or row_value.metodo_pago <> 'Yape' then raise exception 'No se guardó el pago'; end if;
    begin perform public.save_sale(sale_id, row_value.updated_at, request_id, header, lines);
      raise exception 'Pagada editable'; exception when insufficient_privilege then null; end;
    begin perform public.delete_sale(sale_id, row_value.updated_at);
      raise exception 'Pagada eliminable'; exception when insufficient_privilege then null; end;
    if actor <> 'nexo.sale_seller' then
      perform public.set_sale_status(sale_id, 'Cancelada', row_value.updated_at, null, '', '', 'Anulación comercial de prueba');
      if not exists (select 1 from public.ventas where id = sale_id and estado = 'Cancelada' and total = 220 and fecha_pago = '2026-10-01' and referencia_pago = 'REF-PRUEBA') then raise exception 'Cancelación perdió historial'; end if;
      select * into row_value from public.ventas where id = sale_id;
      begin perform public.set_sale_status(sale_id, 'Pagada', row_value.updated_at, '2026-10-01', 'Yape');
        raise exception 'Se reabrió venta cancelada'; exception when insufficient_privilege then null; end;
      second_id := public.save_sale(null, null, gen_random_uuid(), header, lines);
      select * into row_value from public.ventas where id = second_id;
      last_number := row_value.numero;
      if last_number = first_number then raise exception 'Números duplicados'; end if;
      perform public.delete_sale(second_id, row_value.updated_at);
      if exists (select 1 from public.venta_items where venta_id = second_id) then raise exception 'Borrado no hizo cascade'; end if;
      paid_id := public.save_sale(null, null, gen_random_uuid(), header, lines);
      if (select numero from public.ventas where id = paid_id) = last_number then raise exception 'Se reutilizó número borrado'; end if;
    end if;
  end loop;
  if not exists (select 1 from public.sale_responsibles() where id = current_setting('nexo.sale_inactive')::uuid and not activo) then raise exception 'Se perdió responsable histórico'; end if;
  select * into row_value from public.ventas where id = current_setting('nexo.sale_historical')::uuid;
  perform public.save_sale(row_value.id, row_value.updated_at, gen_random_uuid(),
    jsonb_build_object('cliente_id', current_setting('nexo.sale_customer'), 'responsable_id', current_setting('nexo.sale_inactive'), 'estado', 'Borrador', 'fecha_venta', '2026-10-01', 'aplica_igv', false, 'observaciones', 'Historial editable'),
    '[{"descripcion":"Historial","cantidad":"1","precio_unitario":"1.00","descuento":"0.00"}]');
  if not exists (select 1 from public.ventas where id = row_value.id and responsable_id = current_setting('nexo.sale_inactive')::uuid and observaciones = 'Historial editable') then raise exception 'No se pudo conservar responsable inactivo al editar'; end if;
  if exists (select 1 from public.profiles where id = current_setting('nexo.sale_admin')::uuid) then raise exception 'El directorio amplió el acceso a Profiles'; end if;
end $$;
reset role;

-- La oportunidad y el cliente referenciados se conservan.
do $$ begin
  begin delete from public.oportunidades where id = current_setting('nexo.sale_opportunity')::uuid;
    raise exception 'Se eliminó oportunidad con ventas'; exception when foreign_key_violation then null; end;
end $$;
-- Una nueva asociación exige etapa Ganada; no altera automáticamente la oportunidad.
update public.oportunidades set etapa = 'Contacto', probabilidad = 25 where id = current_setting('nexo.sale_opportunity')::uuid;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('nexo.sale_admin'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  begin perform public.save_sale(null, null, gen_random_uuid(), jsonb_build_object('cliente_id', current_setting('nexo.sale_customer'), 'oportunidad_id', current_setting('nexo.sale_opportunity'), 'responsable_id', current_setting('nexo.sale_admin'), 'estado', 'Borrador', 'fecha_venta', '2026-10-01'), '[{"descripcion":"Inválida","cantidad":"1","precio_unitario":"10","descuento":"0"}]');
    raise exception 'Creó venta de oportunidad no ganada'; exception when invalid_parameter_value then null; end;
end $$;
reset role;

select set_config('request.jwt.claims', json_build_object('sub', current_setting('nexo.sale_inactive'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  if exists (select 1 from public.ventas) or exists (select 1 from public.venta_items) then raise exception 'Inactivo lee ventas'; end if;
  if exists (select 1 from public.sale_responsibles()) then raise exception 'Inactivo lee responsables'; end if;
  begin perform public.delete_sale(current_setting('nexo.sale_historical')::uuid, now());
    raise exception 'Inactivo opera ventas'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  begin perform 1 from public.ventas; raise exception 'Anon lee ventas'; exception when insufficient_privilege then null; end;
  begin perform public.delete_sale(gen_random_uuid(), now()); raise exception 'Anon opera ventas'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'Pruebas de Ventas completadas; datos revertidos.' as resultado;
