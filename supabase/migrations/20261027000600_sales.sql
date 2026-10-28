-- Nexo CRM · Ejecutar manualmente DESPUÉS de opportunities.sql.
-- Las mutaciones pasan exclusivamente por RPC; no modifica políticas anteriores.
begin;
create table if not exists nexo_private.sales_counters (
  year integer primary key, last_value bigint not null check (last_value > 0)
);
revoke all on nexo_private.sales_counters from public, anon, authenticated;

create table if not exists public.ventas (
  id uuid primary key default gen_random_uuid(),
  numero text unique not null,
  request_id uuid unique not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  oportunidad_id uuid references public.oportunidades(id) on delete restrict,
  responsable_id uuid references public.profiles(id) on delete restrict,
  estado text not null default 'Borrador' check (estado in ('Borrador', 'Pendiente', 'Pagada', 'Cancelada')),
  subtotal numeric(14,2) not null check (subtotal >= 0 and subtotal <= 999999999999.99),
  descuento numeric(14,2) not null check (descuento >= 0 and descuento <= subtotal),
  impuesto numeric(14,2) not null check (impuesto >= 0 and impuesto <= 999999999999.99),
  total numeric(14,2) not null check (total >= 0 and total <= 999999999999.99),
  subtotal_decimal text generated always as (subtotal::text) stored,
  descuento_decimal text generated always as (descuento::text) stored,
  impuesto_decimal text generated always as (impuesto::text) stored,
  total_decimal text generated always as (total::text) stored,
  aplica_igv boolean not null default true,
  moneda text not null default 'PEN' check (moneda = 'PEN'),
  fecha_venta date not null,
  fecha_pago date,
  metodo_pago text not null default '' check (metodo_pago in ('', 'Efectivo', 'Transferencia', 'Tarjeta', 'Yape', 'Plin', 'Otro')),
  referencia_pago text not null default '' check (char_length(referencia_pago) <= 160),
  observaciones text not null default '' check (char_length(observaciones) <= 3000),
  emitida_at timestamptz,
  motivo_cancelacion text not null default '' check (char_length(motivo_cancelacion) <= 500),
  cancelada_at timestamptz,
  cancelada_por uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ventas_total_consistente check (total = subtotal - descuento + impuesto),
  constraint ventas_igv_consistente check (impuesto = case when aplica_igv then round((subtotal - descuento) * 0.18, 2) else 0 end),
  constraint ventas_pago_consistente check (estado <> 'Pagada' or (fecha_pago is not null and metodo_pago <> '')),
  constraint ventas_emision_consistente check (estado = 'Borrador' or emitida_at is not null),
  constraint ventas_cancelacion_consistente check (
    (estado = 'Cancelada' and cancelada_at is not null and cancelada_por is not null and char_length(trim(motivo_cancelacion)) >= 2)
    or (estado <> 'Cancelada' and cancelada_at is null and cancelada_por is null and motivo_cancelacion = '')
  )
);
create table if not exists public.venta_items (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas(id) on delete cascade,
  orden integer not null check (orden between 1 and 100),
  descripcion text not null check (char_length(trim(descripcion)) between 1 and 200),
  cantidad numeric(12,3) not null check (cantidad > 0 and cantidad <= 999999999.999),
  precio_unitario numeric(14,2) not null check (precio_unitario >= 0 and precio_unitario <= 999999999999.99),
  descuento numeric(14,2) not null check (descuento >= 0 and descuento <= subtotal),
  subtotal numeric(14,2) not null check (subtotal >= 0 and subtotal <= 999999999999.99),
  cantidad_decimal text generated always as (cantidad::text) stored,
  precio_decimal text generated always as (precio_unitario::text) stored,
  descuento_decimal text generated always as (descuento::text) stored,
  subtotal_decimal text generated always as (subtotal::text) stored,
  created_at timestamptz not null default now(),
  constraint venta_items_calculo check (subtotal = round(cantidad * precio_unitario, 2)),
  unique (venta_id, orden)
);
create index if not exists ventas_cliente_idx on public.ventas(cliente_id);
create index if not exists ventas_oportunidad_idx on public.ventas(oportunidad_id) where oportunidad_id is not null;
create index if not exists ventas_responsable_idx on public.ventas(responsable_id);
create index if not exists ventas_estado_fecha_idx on public.ventas(estado, fecha_venta);
create index if not exists ventas_metodo_idx on public.ventas(metodo_pago);
create index if not exists ventas_created_idx on public.ventas(created_at desc, id);

create or replace function nexo_private.sale_actor()
returns text language plpgsql security definer set search_path = '' as $$
declare actor text;
begin
  actor := nexo_private.active_role();
  if actor is null or actor not in ('Administrador', 'Gerente', 'Vendedor') then
    raise exception 'Necesitas un perfil activo para operar con ventas.' using errcode = '42501';
  end if;
  return actor;
end $$;
create or replace function nexo_private.sale_decimal(value text, digits integer, scale integer)
returns numeric language plpgsql immutable set search_path = '' as $$
begin
  if value is null or value !~ format('^[0-9]{1,%s}([.][0-9]{1,%s})?$', digits, scale) then
    raise exception 'Importe o cantidad inválidos. Usa decimales sin separadores de miles.' using errcode = '22023';
  end if;
  return value::numeric;
end $$;
create or replace function nexo_private.next_sale_number()
returns text language plpgsql security definer set search_path = '' as $$
declare current_year integer; sequence_value bigint;
begin
  current_year := extract(year from clock_timestamp() at time zone 'America/Lima')::integer;
  insert into nexo_private.sales_counters(year, last_value) values (current_year, 1)
    on conflict (year) do update set last_value = nexo_private.sales_counters.last_value + 1
    returning last_value into sequence_value;
  return 'V-' || current_year::text || '-' || lpad(sequence_value::text, greatest(6, char_length(sequence_value::text)), '0');
end $$;
revoke all on function nexo_private.sale_actor(), nexo_private.sale_decimal(text, integer, integer), nexo_private.next_sale_number() from public, anon, authenticated;

alter table public.ventas enable row level security;
alter table public.venta_items enable row level security;
revoke all on public.ventas, public.venta_items from public, anon, authenticated;
grant select on public.ventas, public.venta_items to authenticated;
drop policy if exists ventas_read on public.ventas;
create policy ventas_read on public.ventas for select to authenticated
  using ((select nexo_private.active_role()) in ('Administrador', 'Gerente', 'Vendedor'));
drop policy if exists ventas_delete_draft on public.ventas;
create policy ventas_delete_draft on public.ventas for delete to authenticated
  using ((select nexo_private.active_role()) in ('Administrador', 'Gerente') and estado = 'Borrador' and emitida_at is null);
drop policy if exists venta_items_read on public.venta_items;
create policy venta_items_read on public.venta_items for select to authenticated
  using (exists (select 1 from public.ventas v where v.id = venta_id));
-- Sin INSERT/UPDATE/DELETE directo ni permisos sobre contador. RPC verifica rol y estado.

create or replace function public.sale_responsibles()
returns table (id uuid, nombres text, apellidos text, activo boolean, rol text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.nombres, p.apellidos, p.activo, p.rol from public.profiles p
  where nexo_private.active_role() in ('Administrador', 'Gerente', 'Vendedor')
    and (p.activo or exists (select 1 from public.ventas v where v.responsable_id = p.id))
  order by p.nombres, p.apellidos, p.id
$$;

create or replace function public.save_sale(
  p_id uuid, p_updated_at timestamptz, p_request_id uuid, p_data jsonb, p_items jsonb
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor text; previous public.ventas; sale_id uuid; customer uuid; opportunity uuid; owner_id uuid;
  sale_state text; sale_date date; pay_date date; method text; reference text; notes text; igv boolean;
  row_data jsonb; quantity numeric; price numeric; discount numeric; gross numeric;
  gross_total numeric := 0; discount_total numeric := 0; tax numeric; final_total numeric;
  item_index integer := 0; description text;
begin
  actor := nexo_private.sale_actor();
  if p_data is null or jsonb_typeof(p_data) <> 'object' or p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Completa los datos y los ítems de la venta.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'Agrega entre 1 y 100 productos o servicios.' using errcode = '22023';
  end if;
  if p_id is null then
    if p_request_id is null then raise exception 'Falta la referencia de creación.' using errcode = '22023'; end if;
    -- Reintentar la misma alta después de perder la respuesta no crea otra venta.
    perform pg_advisory_xact_lock(719026, hashtext(p_request_id::text));
    select * into previous from public.ventas where request_id = p_request_id;
    if found then
      if previous.created_by <> auth.uid() then raise exception 'Referencia de creación no disponible.' using errcode = '42501'; end if;
      return previous.id;
    end if;
  else
    select * into previous from public.ventas where id = p_id for update;
    if not found then raise exception 'No se encontró la venta.' using errcode = 'P0002'; end if;
    if previous.estado not in ('Borrador', 'Pendiente') then
      raise exception 'Una venta pagada o cancelada no puede editarse.' using errcode = '42501';
    end if;
    if p_updated_at is null or previous.updated_at <> p_updated_at then
      raise exception 'La venta cambió. Actualiza antes de editarla.' using errcode = '40001';
    end if;
  end if;
  customer := nullif(p_data ->> 'cliente_id', '')::uuid;
  opportunity := nullif(p_data ->> 'oportunidad_id', '')::uuid;
  owner_id := nullif(p_data ->> 'responsable_id', '')::uuid;
  sale_state := p_data ->> 'estado';
  sale_date := (p_data ->> 'fecha_venta')::date;
  pay_date := nullif(p_data ->> 'fecha_pago', '')::date;
  method := coalesce(p_data ->> 'metodo_pago', '');
  reference := coalesce(p_data ->> 'referencia_pago', '');
  notes := coalesce(p_data ->> 'observaciones', '');
  igv := coalesce((p_data ->> 'aplica_igv')::boolean, true);
  if customer is null or sale_date is null or sale_state is null or sale_state not in ('Borrador', 'Pendiente', 'Pagada') then
    raise exception 'Completa cliente, fecha y estado válidos.' using errcode = '22023';
  end if;
  if p_id is not null and previous.estado = 'Pendiente' and sale_state = 'Borrador' then
    raise exception 'Una venta emitida no puede volver a Borrador.' using errcode = '22023';
  end if;
  if method not in ('', 'Efectivo', 'Transferencia', 'Tarjeta', 'Yape', 'Plin', 'Otro') or char_length(reference) > 160 or char_length(notes) > 3000 then
    raise exception 'Revisa método, referencia y observaciones.' using errcode = '22023';
  end if;
  if sale_state = 'Pagada' and (pay_date is null or method = '') then
    raise exception 'Para marcar Pagada, completa la fecha y el método de pago.' using errcode = '22023';
  end if;
  if sale_state <> 'Pagada' then pay_date := null; end if;
  if actor = 'Vendedor' then
    if p_id is null then
      if owner_id is not null and owner_id <> auth.uid() then raise exception 'No puedes asignar una venta a otro usuario.' using errcode = '42501'; end if;
      owner_id := auth.uid();
    elsif owner_id is distinct from previous.responsable_id then
      raise exception 'Solo Administrador o Gerente pueden reasignar ventas.' using errcode = '42501';
    end if;
  end if;
  if p_id is null and owner_id is null then raise exception 'Selecciona un responsable activo.' using errcode = '22023'; end if;
  if owner_id is not null and (p_id is null or owner_id is distinct from previous.responsable_id) then
    perform 1 from public.profiles where id = owner_id and activo and rol in ('Administrador', 'Gerente', 'Vendedor') for share;
    if not found then raise exception 'El responsable debe estar activo.' using errcode = '22023'; end if;
  end if;
  perform 1 from public.clientes where id = customer for share;
  if not found then raise exception 'El cliente ya no está disponible.' using errcode = '22023'; end if;
  if opportunity is not null and (p_id is null or opportunity is distinct from previous.oportunidad_id or customer is distinct from previous.cliente_id) then
    perform 1 from public.oportunidades where id = opportunity and cliente_id = customer and etapa = 'Ganada' for share;
    if not found then raise exception 'Selecciona una oportunidad Ganada del mismo cliente.' using errcode = '22023'; end if;
  end if;
  -- Validación completa antes de reemplazar los ítems; toda la RPC es una transacción.
  for row_data in select value from jsonb_array_elements(p_items) loop
    description := trim(coalesce(row_data ->> 'descripcion', ''));
    if char_length(description) not between 1 and 200 then raise exception 'Completa la descripción de cada ítem.' using errcode = '22023'; end if;
    quantity := nexo_private.sale_decimal(row_data ->> 'cantidad', 9, 3);
    price := nexo_private.sale_decimal(row_data ->> 'precio_unitario', 12, 2);
    discount := nexo_private.sale_decimal(row_data ->> 'descuento', 12, 2);
    gross := round(quantity * price, 2);
    if quantity <= 0 or gross > 999999999999.99 or discount > gross then
      raise exception 'Revisa cantidades, precios y descuentos de los ítems.' using errcode = '22023';
    end if;
    gross_total := gross_total + gross;
    discount_total := discount_total + discount;
  end loop;
  tax := case when igv then round((gross_total - discount_total) * 0.18, 2) else 0 end;
  final_total := gross_total - discount_total + tax;
  if gross_total > 999999999999.99 or final_total > 999999999999.99 then raise exception 'La venta supera el máximo permitido.' using errcode = '22023'; end if;
  if p_id is null then
    insert into public.ventas(numero, request_id, created_by, cliente_id, oportunidad_id, responsable_id, estado, subtotal, descuento, impuesto, total, aplica_igv, fecha_venta, fecha_pago, metodo_pago, referencia_pago, observaciones, emitida_at)
    values (nexo_private.next_sale_number(), p_request_id, auth.uid(), customer, opportunity, owner_id, sale_state, gross_total, discount_total, tax, final_total, igv, sale_date, pay_date, method, reference, notes, case when sale_state <> 'Borrador' then clock_timestamp() else null end)
    returning id into sale_id;
  else
    sale_id := p_id;
    update public.ventas set cliente_id = customer, oportunidad_id = opportunity, responsable_id = owner_id,
      estado = sale_state, subtotal = gross_total, descuento = discount_total, impuesto = tax, total = final_total,
      aplica_igv = igv, fecha_venta = sale_date, fecha_pago = pay_date, metodo_pago = method, referencia_pago = reference, observaciones = notes,
      emitida_at = coalesce(previous.emitida_at, case when sale_state <> 'Borrador' then clock_timestamp() else null end), updated_at = clock_timestamp()
      where id = sale_id;
    delete from public.venta_items where venta_id = sale_id;
  end if;
  for row_data in select value from jsonb_array_elements(p_items) loop
    item_index := item_index + 1;
    quantity := (row_data ->> 'cantidad')::numeric; price := (row_data ->> 'precio_unitario')::numeric;
    insert into public.venta_items(venta_id, orden, descripcion, cantidad, precio_unitario, descuento, subtotal)
      values (sale_id, item_index, trim(row_data ->> 'descripcion'), quantity, price, (row_data ->> 'descuento')::numeric, round(quantity * price, 2));
  end loop;
  return sale_id;
end $$;

create or replace function public.set_sale_status(
  p_id uuid, p_estado text, p_updated_at timestamptz, p_fecha_pago date default null,
  p_metodo_pago text default '', p_referencia_pago text default '', p_motivo text default ''
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor text; previous public.ventas;
begin
  actor := nexo_private.sale_actor();
  if p_estado is null or p_estado not in ('Pendiente', 'Pagada', 'Cancelada') then raise exception 'Estado no válido.' using errcode = '22023'; end if;
  if p_estado = 'Cancelada' and actor not in ('Administrador', 'Gerente') then raise exception 'Solo Administrador o Gerente pueden cancelar ventas.' using errcode = '42501'; end if;
  select * into previous from public.ventas where id = p_id for update;
  if not found then raise exception 'No se encontró la venta.' using errcode = 'P0002'; end if;
  if previous.estado = p_estado then return previous.id; end if;
  if previous.estado = 'Cancelada' or (previous.estado = 'Pagada' and p_estado <> 'Cancelada') then
    raise exception 'Una venta pagada o cancelada no puede modificarse.' using errcode = '42501';
  end if;
  if p_updated_at is null or previous.updated_at <> p_updated_at then raise exception 'La venta cambió. Actualiza antes de continuar.' using errcode = '40001'; end if;
  if p_estado = 'Pagada' and (p_fecha_pago is null or coalesce(p_metodo_pago, '') not in ('Efectivo', 'Transferencia', 'Tarjeta', 'Yape', 'Plin', 'Otro') or char_length(coalesce(p_referencia_pago, '')) > 160) then
    raise exception 'Completa la fecha, el método y una referencia válida de pago.' using errcode = '22023';
  end if;
  if p_estado = 'Cancelada' and char_length(trim(coalesce(p_motivo, ''))) not between 2 and 500 then
    raise exception 'Registra un motivo de cancelación de 2 a 500 caracteres.' using errcode = '22023';
  end if;
  update public.ventas set estado = p_estado, updated_at = clock_timestamp(),
    emitida_at = coalesce(previous.emitida_at, clock_timestamp()),
    fecha_pago = case when p_estado = 'Pagada' then p_fecha_pago else previous.fecha_pago end,
    metodo_pago = case when p_estado = 'Pagada' then p_metodo_pago else previous.metodo_pago end,
    referencia_pago = case when p_estado = 'Pagada' then coalesce(p_referencia_pago, '') else previous.referencia_pago end,
    motivo_cancelacion = case when p_estado = 'Cancelada' then trim(p_motivo) else '' end,
    cancelada_at = case when p_estado = 'Cancelada' then clock_timestamp() else null end,
    cancelada_por = case when p_estado = 'Cancelada' then auth.uid() else null end
    where id = p_id;
  return p_id;
end $$;

create or replace function public.delete_sale(p_id uuid, p_updated_at timestamptz)
returns boolean language plpgsql security definer set search_path = '' as $$
declare actor text; previous public.ventas;
begin
  actor := nexo_private.sale_actor();
  if actor not in ('Administrador', 'Gerente') then raise exception 'No puedes eliminar ventas.' using errcode = '42501'; end if;
  select * into previous from public.ventas where id = p_id for update;
  if not found then raise exception 'No se encontró la venta.' using errcode = 'P0002'; end if;
  if previous.estado <> 'Borrador' or previous.emitida_at is not null then raise exception 'Solo se eliminan borradores no emitidos. Usa Cancelar venta.' using errcode = '42501'; end if;
  if p_updated_at is null or previous.updated_at <> p_updated_at then raise exception 'La venta cambió. Actualiza antes de eliminar.' using errcode = '40001'; end if;
  delete from public.ventas where id = p_id;
  return true;
end $$;
revoke all on function public.sale_responsibles(), public.save_sale(uuid, timestamptz, uuid, jsonb, jsonb), public.set_sale_status(uuid, text, timestamptz, date, text, text, text), public.delete_sale(uuid, timestamptz) from public, anon;
grant execute on function public.sale_responsibles(), public.save_sale(uuid, timestamptz, uuid, jsonb, jsonb), public.set_sale_status(uuid, text, timestamptz, date, text, text, text), public.delete_sale(uuid, timestamptz) to authenticated;
commit;
