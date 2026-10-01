-- Ejecutar manualmente DESPUÉS de schema, auth_roles, user_management, leads,
-- opportunities y sales. No modifica las políticas de los módulos existentes.
begin;
create table if not exists public.tareas (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  titulo text not null check (char_length(trim(titulo)) between 2 and 160),
  descripcion text not null default '' check (char_length(descripcion) <= 3000),
  tipo text not null check (tipo in ('Llamada','Reunión','Correo','Seguimiento','Demostración','Propuesta','Cobro','Otro')),
  estado text not null default 'Pendiente' check (estado in ('Pendiente','En progreso','Completada','Cancelada')),
  prioridad text not null default 'Media' check (prioridad in ('Alta','Media','Baja')),
  responsable_id uuid not null references public.profiles(id) on delete restrict,
  cliente_id uuid references public.clientes(id) on delete restrict,
  lead_id uuid references public.leads(id) on delete restrict,
  oportunidad_id uuid references public.oportunidades(id) on delete restrict,
  venta_id uuid references public.ventas(id) on delete restrict,
  fecha_inicio timestamptz,
  fecha_vencimiento timestamptz not null,
  completada_at timestamptz,
  actividad_at timestamptz,
  recordatorio_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint tareas_relacion_unica check (num_nonnulls(cliente_id,lead_id,oportunidad_id,venta_id) <= 1),
  constraint tareas_completada_consistente check ((estado = 'Completada') = (completada_at is not null)),
  constraint tareas_inicio_consistente check (fecha_inicio is null or fecha_inicio <= fecha_vencimiento),
  constraint tareas_recordatorio_consistente check (recordatorio_at is null or recordatorio_at <= fecha_vencimiento)
);
create index if not exists tareas_estado_vencimiento_idx on public.tareas(estado,fecha_vencimiento,id);
create index if not exists tareas_responsable_idx on public.tareas(responsable_id);
create index if not exists tareas_created_by_idx on public.tareas(created_by);
create index if not exists tareas_cliente_idx on public.tareas(cliente_id) where cliente_id is not null;
create index if not exists tareas_lead_idx on public.tareas(lead_id) where lead_id is not null;
create index if not exists tareas_oportunidad_idx on public.tareas(oportunidad_id) where oportunidad_id is not null;
create index if not exists tareas_venta_idx on public.tareas(venta_id) where venta_id is not null;
alter table public.tareas enable row level security;
revoke all on public.tareas from public, anon, authenticated;
grant select on public.tareas to authenticated;
drop policy if exists tareas_read on public.tareas;
create policy tareas_read on public.tareas for select to authenticated
  using ((select nexo_private.active_role()) in ('Administrador','Gerente','Vendedor'));
-- Escritura solo por RPC: no hay INSERT/UPDATE/DELETE directo desde el navegador.
create or replace function public.task_responsibles()
returns table(id uuid,nombres text,apellidos text,activo boolean,rol text)
language sql stable security definer set search_path = '' as $$
  select p.id,p.nombres,p.apellidos,p.activo,p.rol from public.profiles p
  where nexo_private.active_role() in ('Administrador','Gerente','Vendedor')
    and (p.activo or exists(select 1 from public.tareas t where p.id in (t.responsable_id,t.created_by)))
  order by p.nombres,p.apellidos,p.id
$$;
create or replace function nexo_private.task_actor()
returns text language plpgsql security definer set search_path = '' as $$
declare actor text;
begin
  actor := nexo_private.active_role();
  if actor is null or actor not in ('Administrador','Gerente','Vendedor') then
    raise exception 'Necesitas un perfil activo para operar con tareas.' using errcode = '42501';
  end if;
  return actor;
end $$;
revoke all on function nexo_private.task_actor() from public,anon,authenticated;
create or replace function public.save_task(p_id uuid,p_updated_at timestamptz,p_request_id uuid,p_data jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor text; previous public.tareas; task_id uuid; owner_id uuid;
  customer uuid; prospect uuid; opportunity uuid; sale uuid;
  title text; description text; kind text; status text; priority text;
  starts timestamptz; due timestamptz; reminder timestamptz;
begin
  actor := nexo_private.task_actor();
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'Completa los datos de la tarea.' using errcode = '22023';
  end if;
  if p_id is null then
    if p_request_id is null then raise exception 'Falta la referencia de creación.' using errcode = '22023'; end if;
    perform pg_advisory_xact_lock(719027,hashtext(p_request_id::text));
    select * into previous from public.tareas where request_id = p_request_id;
    if found then
      if previous.created_by <> auth.uid() then raise exception 'Referencia de creación no disponible.' using errcode = '42501'; end if;
      return previous.id;
    end if;
  else
    select * into previous from public.tareas where id = p_id for update;
    if not found then raise exception 'No se encontró la tarea.' using errcode = 'P0002'; end if;
    if actor = 'Vendedor' and previous.responsable_id <> auth.uid() then
      raise exception 'Solo puedes modificar tus propias tareas.' using errcode = '42501';
    end if;
    if p_updated_at is null or p_updated_at <> previous.updated_at then
      raise exception 'La tarea cambió. Actualiza antes de continuar.' using errcode = '40001';
    end if;
  end if;
  title := trim(coalesce(p_data->>'titulo',''));
  description := trim(coalesce(p_data->>'descripcion',''));
  kind := p_data->>'tipo'; status := p_data->>'estado'; priority := p_data->>'prioridad';
  owner_id := nullif(p_data->>'responsable_id','')::uuid;
  customer := nullif(p_data->>'cliente_id','')::uuid;
  prospect := nullif(p_data->>'lead_id','')::uuid;
  opportunity := nullif(p_data->>'oportunidad_id','')::uuid;
  sale := nullif(p_data->>'venta_id','')::uuid;
  starts := nullif(p_data->>'fecha_inicio','')::timestamptz;
  due := nullif(p_data->>'fecha_vencimiento','')::timestamptz;
  reminder := nullif(p_data->>'recordatorio_at','')::timestamptz;
  if char_length(title) not between 2 and 160 or char_length(description) > 3000
    or kind is null or kind not in ('Llamada','Reunión','Correo','Seguimiento','Demostración','Propuesta','Cobro','Otro')
    or status is null or status not in ('Pendiente','En progreso','Completada','Cancelada')
    or priority is null or priority not in ('Alta','Media','Baja') then
    raise exception 'Revisa título, descripción, tipo, estado y prioridad.' using errcode = '22023';
  end if;
  if due is null or not isfinite(due) or (starts is not null and (not isfinite(starts) or starts > due))
    or (reminder is not null and (not isfinite(reminder) or reminder > due)) then
    raise exception 'El inicio y el recordatorio deben ser anteriores o iguales al vencimiento.' using errcode = '22023';
  end if;
  if owner_id is null then raise exception 'Selecciona un responsable activo.' using errcode = '22023'; end if;
  if actor = 'Vendedor' and owner_id <> auth.uid() then
    raise exception 'No puedes reasignar tareas a otro usuario.' using errcode = '42501';
  end if;
  if p_id is null or owner_id is distinct from previous.responsable_id then
    perform 1 from public.profiles where id = owner_id and activo and rol in ('Administrador','Gerente','Vendedor') for share;
    if not found then raise exception 'El responsable debe estar activo.' using errcode = '22023'; end if;
  end if;
  if p_id is not null and previous.estado = 'Cancelada' and status <> 'Cancelada' then
    raise exception 'Una tarea cancelada conserva su historial. Crea una nueva para retomarla.' using errcode = '22023';
  end if;
  if num_nonnulls(customer,prospect,opportunity,sale) > 1 then
    raise exception 'Selecciona una sola relación comercial o Ninguno.' using errcode = '22023';
  end if;
  -- Bloqueos compartidos evitan que el registro se elimine durante el guardado.
  if customer is not null then
    perform 1 from public.clientes where id = customer for share;
    if not found then raise exception 'El cliente ya no está disponible.' using errcode = '22023'; end if;
  end if;
  if prospect is not null then
    perform 1 from public.leads where id = prospect for share;
    if not found then raise exception 'El lead ya no está disponible.' using errcode = '22023'; end if;
  end if;
  if opportunity is not null then
    perform 1 from public.oportunidades where id = opportunity for share;
    if not found then raise exception 'La oportunidad ya no está disponible.' using errcode = '22023'; end if;
  end if;
  if sale is not null then
    perform 1 from public.ventas where id = sale for share;
    if not found then raise exception 'La venta ya no está disponible.' using errcode = '22023'; end if;
  end if;
  if p_id is null then
    insert into public.tareas(request_id,titulo,descripcion,tipo,estado,prioridad,responsable_id,cliente_id,lead_id,oportunidad_id,venta_id,fecha_inicio,fecha_vencimiento,recordatorio_at,completada_at,actividad_at,created_by)
    values(p_request_id,title,description,kind,status,priority,owner_id,customer,prospect,opportunity,sale,starts,due,reminder,case when status = 'Completada' then clock_timestamp() end,case when status <> 'Pendiente' then clock_timestamp() end,auth.uid())
    returning id into task_id;
  else
    task_id := p_id;
    update public.tareas set titulo=title,descripcion=description,tipo=kind,estado=status,prioridad=priority,
      responsable_id=owner_id,cliente_id=customer,lead_id=prospect,oportunidad_id=opportunity,venta_id=sale,
      fecha_inicio=starts,fecha_vencimiento=due,recordatorio_at=reminder,
      completada_at=case when status='Completada' then coalesce(previous.completada_at,clock_timestamp()) else null end,
      actividad_at=coalesce(previous.actividad_at,case when status <> 'Pendiente' then clock_timestamp() end),
      updated_at=clock_timestamp() where id=p_id;
  end if;
  return task_id;
end $$;
create or replace function public.set_task_status(p_id uuid,p_updated_at timestamptz,p_estado text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor text; previous public.tareas;
begin
  actor := nexo_private.task_actor();
  select * into previous from public.tareas where id=p_id for update;
  if not found then raise exception 'No se encontró la tarea.' using errcode='P0002'; end if;
  if actor='Vendedor' and previous.responsable_id<>auth.uid() then raise exception 'Solo puedes modificar tus propias tareas.' using errcode='42501'; end if;
  if p_estado is null or p_estado not in ('Pendiente','En progreso','Completada','Cancelada') then raise exception 'Estado no válido.' using errcode='22023'; end if;
  if p_updated_at is null or p_updated_at<>previous.updated_at then raise exception 'La tarea cambió. Actualiza antes de continuar.' using errcode='40001'; end if;
  if previous.estado='Cancelada' and p_estado<>'Cancelada' then raise exception 'Una tarea cancelada conserva su historial.' using errcode='22023'; end if;
  if previous.estado=p_estado then return p_id; end if;
  update public.tareas set estado=p_estado,
    completada_at=case when p_estado='Completada' then clock_timestamp() else null end,
    actividad_at=coalesce(previous.actividad_at,case when p_estado <> 'Pendiente' then clock_timestamp() end),
    updated_at=clock_timestamp() where id=p_id;
  return p_id;
end $$;
create or replace function public.delete_task(p_id uuid,p_updated_at timestamptz)
returns boolean language plpgsql security definer set search_path = '' as $$
declare actor text; previous public.tareas;
begin
  actor:=nexo_private.task_actor();
  if actor not in ('Administrador','Gerente') then raise exception 'Solo Administrador o Gerente pueden eliminar tareas.' using errcode='42501'; end if;
  select * into previous from public.tareas where id=p_id for update;
  if not found then raise exception 'No se encontró la tarea.' using errcode='P0002'; end if;
  if p_updated_at is null or p_updated_at<>previous.updated_at then raise exception 'La tarea cambió. Actualiza antes de eliminar.' using errcode='40001'; end if;
  if previous.estado<>'Pendiente' or previous.actividad_at is not null or num_nonnulls(previous.cliente_id,previous.lead_id,previous.oportunidad_id,previous.venta_id)>0 then
    raise exception 'Solo se eliminan tareas generales pendientes. Usa Cancelar tarea para conservar el historial.' using errcode='42501';
  end if;
  delete from public.tareas where id=p_id;
  return true;
end $$;
revoke all on function public.task_responsibles(),public.save_task(uuid,timestamptz,uuid,jsonb),public.set_task_status(uuid,timestamptz,text),public.delete_task(uuid,timestamptz) from public,anon;
grant execute on function public.task_responsibles(),public.save_task(uuid,timestamptz,uuid,jsonb),public.set_task_status(uuid,timestamptz,text),public.delete_task(uuid,timestamptz) to authenticated;
commit;
