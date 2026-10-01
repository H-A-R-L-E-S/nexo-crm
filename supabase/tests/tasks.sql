-- Prueba manual opcional después de tasks.sql. Datos aislados; termina en ROLLBACK.
-- Ejecutar como propietario de la base. Si falla, ejecutar ROLLBACK.
begin;
select set_config('nexo.task_admin',gen_random_uuid()::text,true);
select set_config('nexo.task_manager',gen_random_uuid()::text,true);
select set_config('nexo.task_seller',gen_random_uuid()::text,true);
select set_config('nexo.task_inactive',gen_random_uuid()::text,true);
select set_config('nexo.task_customer',gen_random_uuid()::text,true);
select set_config('nexo.task_lead',gen_random_uuid()::text,true);
select set_config('nexo.task_opportunity',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data)
select current_setting(setting)::uuid,current_setting(setting)||'@example.invalid','{"nombres":"Prueba","apellidos":"Tareas"}'::jsonb
from unnest(array['nexo.task_admin','nexo.task_manager','nexo.task_seller','nexo.task_inactive']) as settings(setting);
update public.profiles set rol='Administrador' where id=current_setting('nexo.task_admin')::uuid;
update public.profiles set rol='Gerente' where id=current_setting('nexo.task_manager')::uuid;
insert into public.clientes(id,nombres,apellidos,correo,telefono) values(current_setting('nexo.task_customer')::uuid,'Cliente','Tareas',current_setting('nexo.task_customer')||'@example.invalid','999123456');
insert into public.leads(id,nombres,telefono) values(current_setting('nexo.task_lead')::uuid,'Lead tareas','999123456');
insert into public.oportunidades(id,titulo,cliente_id,etapa,valor) values(current_setting('nexo.task_opportunity')::uuid,'Contrato tareas',current_setting('nexo.task_customer')::uuid,'Ganada',100);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('nexo.task_admin'),'role','authenticated')::text,true);
select set_config('nexo.task_sale',public.save_sale(null,null,gen_random_uuid(),jsonb_build_object('cliente_id',current_setting('nexo.task_customer'),'responsable_id',current_setting('nexo.task_admin'),'estado','Borrador','fecha_venta','2026-10-01'), '[{"descripcion":"Servicio","cantidad":"1","precio_unitario":"100","descuento":"0"}]')::text,true);
select set_config('nexo.task_historical',public.save_task(null,null,gen_random_uuid(),jsonb_build_object('titulo','Historial inactivo','descripcion','','tipo','Seguimiento','estado','Pendiente','prioridad','Media','responsable_id',current_setting('nexo.task_inactive'),'fecha_vencimiento','2026-10-02T10:00:00-05:00'))::text,true);
update public.profiles set activo=false where id=current_setting('nexo.task_inactive')::uuid;
set local role authenticated;
do $$
declare actor text; payload jsonb; task_id uuid; token uuid; version timestamptz; row_value public.tareas; relation text; record_id text; done timestamptz;
begin
  foreach actor in array array['nexo.task_admin','nexo.task_manager','nexo.task_seller'] loop
    perform set_config('request.jwt.claims',json_build_object('sub',current_setting(actor),'role','authenticated')::text,true);
    payload:=jsonb_build_object('titulo','Llamar al cliente','descripcion','Seguimiento comercial','tipo','Llamada','estado','Pendiente','prioridad','Alta','responsable_id',current_setting(actor),'fecha_inicio','2026-10-01T09:00:00-05:00','fecha_vencimiento','2026-10-01T10:00:00-05:00','recordatorio_at','2026-10-01T09:50:00-05:00','created_by',current_setting('nexo.task_inactive'),'completada_at','2000-01-01');
    token:=gen_random_uuid(); task_id:=public.save_task(null,null,token,payload);
    select * into row_value from public.tareas where id=task_id;
    if row_value.created_by<>current_setting(actor)::uuid or row_value.completada_at is not null or row_value.fecha_vencimiento<>'2026-10-01T15:00:00Z' then raise exception 'Auditoría o fecha manipulable'; end if;
    if public.save_task(null,null,token,payload)<>task_id then raise exception 'Creación duplicada'; end if;
    begin update public.tareas set created_by=current_setting('nexo.task_inactive')::uuid where id=task_id; raise exception 'Escritura directa permitida'; exception when insufficient_privilege then null; end;
    begin insert into public.tareas(request_id,titulo,tipo,estado,prioridad,responsable_id,created_by,fecha_vencimiento) values(gen_random_uuid(),'No permitido','Otro','Pendiente','Media',current_setting(actor)::uuid,current_setting(actor)::uuid,now()); raise exception 'Insert directo permitido'; exception when insufficient_privilege then null; end;
    begin delete from public.tareas where id=task_id; raise exception 'Delete directo permitido'; exception when insufficient_privilege then null; end;
    begin perform public.save_task(task_id,'2000-01-01',token,payload); raise exception 'Versión obsoleta aceptada'; exception when serialization_failure then null; end;
    begin perform public.save_task(null,null,gen_random_uuid(),payload||'{"tipo":"Inválido"}'); raise exception 'Tipo inválido'; exception when invalid_parameter_value then null; end;
    begin perform public.save_task(null,null,gen_random_uuid(),payload||'{"fecha_vencimiento":"infinity"}'); raise exception 'Fecha infinita'; exception when invalid_parameter_value then null; end;
    begin perform public.save_task(null,null,gen_random_uuid(),payload||'{"fecha_inicio":"2026-10-02T00:00:00Z"}'); raise exception 'Inicio posterior al vencimiento'; exception when invalid_parameter_value then null; end;
    begin perform public.save_task(null,null,gen_random_uuid(),payload||'{"recordatorio_at":"2026-10-02T00:00:00Z"}'); raise exception 'Recordatorio posterior al vencimiento'; exception when invalid_parameter_value then null; end;
    if actor='nexo.task_seller' then
      begin perform public.save_task(null,null,gen_random_uuid(),payload||jsonb_build_object('responsable_id',current_setting('nexo.task_admin'))); raise exception 'Vendedor asignó a otro'; exception when insufficient_privilege then null; end;
      begin perform public.save_task(task_id,row_value.updated_at,token,payload||jsonb_build_object('responsable_id',current_setting('nexo.task_admin'))); raise exception 'Vendedor reasignó'; exception when insufficient_privilege then null; end;
      begin perform public.save_task(current_setting('nexo.task_historical')::uuid,(select updated_at from public.tareas where id=current_setting('nexo.task_historical')::uuid),token,payload); raise exception 'Vendedor editó tarea ajena'; exception when insufficient_privilege then null; end;
      begin perform public.set_task_status(current_setting('nexo.task_historical')::uuid,(select updated_at from public.tareas where id=current_setting('nexo.task_historical')::uuid),'Completada'); raise exception 'Vendedor completó tarea ajena'; exception when insufficient_privilege then null; end;
      begin perform public.delete_task(task_id,row_value.updated_at); raise exception 'Vendedor eliminó'; exception when insufficient_privilege then null; end;
      begin perform public.delete_task(current_setting('nexo.task_historical')::uuid,(select updated_at from public.tareas where id=current_setting('nexo.task_historical')::uuid)); raise exception 'Vendedor eliminó tarea ajena'; exception when insufficient_privilege then null; end;
    else
      begin perform public.save_task(null,null,gen_random_uuid(),payload||jsonb_build_object('responsable_id',current_setting('nexo.task_inactive'))); raise exception 'Asignó inactivo'; exception when invalid_parameter_value then null; end;
      perform public.save_task(task_id,row_value.updated_at,token,payload||jsonb_build_object('responsable_id',current_setting('nexo.task_seller')));
      select * into row_value from public.tareas where id=task_id;
      if row_value.responsable_id<>current_setting('nexo.task_seller')::uuid then raise exception 'Reasignación no guardada'; end if;
    end if;
    version:=row_value.updated_at;
    perform public.save_task(task_id,version,token,payload||'{"titulo":"Título editado"}');
    select * into row_value from public.tareas where id=task_id;
    if row_value.titulo<>'Título editado' or row_value.created_by<>current_setting(actor)::uuid then raise exception 'Edición alteró auditoría'; end if;
    perform public.set_task_status(task_id,row_value.updated_at,'En progreso');
    select * into row_value from public.tareas where id=task_id;
    perform public.set_task_status(task_id,row_value.updated_at,'Completada');
    select * into row_value from public.tareas where id=task_id;
    if row_value.completada_at is null or row_value.actividad_at is null then raise exception 'Completar no registró fechas'; end if;
    done:=row_value.completada_at;
    perform public.save_task(task_id,row_value.updated_at,token,payload||'{"estado":"Completada"}');
    select * into row_value from public.tareas where id=task_id;
    if row_value.completada_at<>done then raise exception 'Edición cambió fecha de finalización'; end if;
    perform public.set_task_status(task_id,row_value.updated_at,'Pendiente');
    select * into row_value from public.tareas where id=task_id;
    if row_value.completada_at is not null or row_value.actividad_at is null then raise exception 'Reabrir perdió actividad o conservó completada_at'; end if;
    begin perform public.delete_task(task_id,row_value.updated_at); raise exception 'Eliminó tarea con actividad'; exception when insufficient_privilege then null; end;
    perform public.set_task_status(task_id,row_value.updated_at,'Cancelada');
    select * into row_value from public.tareas where id=task_id;
    if row_value.estado<>'Cancelada' then raise exception 'Cancelación no persistió'; end if;
    begin perform public.set_task_status(task_id,row_value.updated_at,'Pendiente'); raise exception 'Reabrió cancelada'; exception when invalid_parameter_value then null; end;
    begin perform public.delete_task(task_id,row_value.updated_at); raise exception 'Eliminó cancelada'; exception when insufficient_privilege then null; end;
    foreach relation in array array['cliente_id','lead_id','oportunidad_id','venta_id'] loop
      record_id:=case relation when 'cliente_id' then current_setting('nexo.task_customer') when 'lead_id' then current_setting('nexo.task_lead') when 'oportunidad_id' then current_setting('nexo.task_opportunity') else current_setting('nexo.task_sale') end;
      task_id:=public.save_task(null,null,gen_random_uuid(),payload||jsonb_build_object(relation,record_id));
      select * into row_value from public.tareas where id=task_id;
      if to_jsonb(row_value)->>relation<>record_id then raise exception 'Relación no persistió'; end if;
      begin perform public.delete_task(task_id,row_value.updated_at); raise exception 'Eliminó tarea comercial'; exception when insufficient_privilege then null; end;
    end loop;
    begin perform public.save_task(null,null,gen_random_uuid(),payload||jsonb_build_object('cliente_id',current_setting('nexo.task_customer'),'lead_id',current_setting('nexo.task_lead'))); raise exception 'Aceptó múltiples relaciones'; exception when invalid_parameter_value then null; end;
    begin perform public.save_task(null,null,gen_random_uuid(),payload||jsonb_build_object('cliente_id',gen_random_uuid())); raise exception 'Aceptó registro inexistente'; exception when invalid_parameter_value then null; end;
    if actor<>'nexo.task_seller' then
      task_id:=public.save_task(null,null,gen_random_uuid(),payload);
      perform public.delete_task(task_id,(select updated_at from public.tareas where id=task_id));
      if exists(select 1 from public.tareas where id=task_id) then raise exception 'General pendiente no eliminada'; end if;
      payload:=payload||jsonb_build_object('responsable_id',current_setting('nexo.task_inactive'));
      task_id:=current_setting('nexo.task_historical')::uuid;
      perform public.save_task(task_id,(select updated_at from public.tareas where id=task_id),token,payload);
    end if;
    if not exists(select 1 from public.task_responsibles() where id=current_setting('nexo.task_inactive')::uuid and not activo) then raise exception 'No preservó responsable histórico'; end if;
  end loop;
end $$;
reset role;
do $$ begin
  begin delete from public.clientes where id=current_setting('nexo.task_customer')::uuid; raise exception 'Eliminó cliente histórico'; exception when foreign_key_violation then null; end;
  begin delete from public.leads where id=current_setting('nexo.task_lead')::uuid; raise exception 'Eliminó lead histórico'; exception when foreign_key_violation then null; end;
  begin delete from public.oportunidades where id=current_setting('nexo.task_opportunity')::uuid; raise exception 'Eliminó oportunidad histórica'; exception when foreign_key_violation then null; end;
  begin delete from public.ventas where id=current_setting('nexo.task_sale')::uuid; raise exception 'Eliminó venta histórica'; exception when foreign_key_violation then null; end;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('nexo.task_inactive'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.tareas) then raise exception 'Inactivo puede leer'; end if;
  if exists(select 1 from public.task_responsibles()) then raise exception 'Inactivo puede leer directorio'; end if;
  begin perform public.save_task(null,null,gen_random_uuid(),'{}'); raise exception 'Inactivo puede escribir'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  begin perform 1 from public.tareas; raise exception 'Anónimo puede leer'; exception when insufficient_privilege then null; end;
  begin perform public.task_responsibles(); raise exception 'Anónimo puede leer directorio'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
