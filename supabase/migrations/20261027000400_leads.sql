-- Nexo CRM · Leads. Ejecutar manualmente después de auth_roles.sql y user_management.sql.
-- Conserva Clientes, Auth, perfiles y sus políticas. No utiliza claves privilegiadas en la app.
begin;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  nombres text not null check (char_length(trim(nombres)) between 2 and 80),
  apellidos text not null default '' check (char_length(apellidos) <= 100),
  empresa text not null default '' check (char_length(empresa) <= 100),
  correo text not null default '' check (char_length(correo) <= 254 and (correo = '' or correo ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  telefono text not null check (char_length(telefono) <= 30 and char_length(regexp_replace(telefono, '[^0-9]', '', 'g')) between 7 and 15),
  cargo text not null default '' check (char_length(cargo) <= 100),
  fuente text not null default 'Otro' check (fuente in ('Web', 'Referido', 'Redes sociales', 'Campaña', 'Llamada', 'Evento', 'Otro')),
  estado text not null default 'Nuevo' check (estado in ('Nuevo', 'Contactado', 'Calificado', 'No interesado', 'Convertido')),
  prioridad text not null default 'Media' check (prioridad in ('Alta', 'Media', 'Baja')),
  responsable_id uuid references public.profiles(id) on delete restrict,
  notas text not null default '' check (char_length(notas) <= 1500),
  ultimo_contacto timestamptz,
  proximo_seguimiento timestamptz,
  convertido_cliente_id uuid references public.clientes(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_conversion_consistente check ((estado = 'Convertido') = (convertido_cliente_id is not null))
);
create index if not exists leads_estado_idx on public.leads(estado);
create index if not exists leads_prioridad_idx on public.leads(prioridad);
create index if not exists leads_fuente_idx on public.leads(fuente);
create index if not exists leads_responsable_idx on public.leads(responsable_id);
create index if not exists leads_correo_idx on public.leads(lower(trim(correo))) where correo <> '';
create index if not exists leads_seguimiento_idx on public.leads(proximo_seguimiento) where estado not in ('Convertido', 'No interesado');
create index if not exists leads_cliente_idx on public.leads(convertido_cliente_id) where convertido_cliente_id is not null;
create index if not exists leads_created_idx on public.leads(created_at desc, id);

create or replace function nexo_private.prepare_lead()
returns trigger language plpgsql security definer set search_path = '' as $$
declare actor_role text; assignment_changed boolean;
begin
  actor_role := nexo_private.active_role();
  new.correo := lower(trim(new.correo));
  new.nombres := trim(new.nombres);
  new.apellidos := trim(new.apellidos);
  if tg_op = 'INSERT' then
    if actor_role = 'Vendedor' then
      if new.responsable_id is not null and new.responsable_id <> auth.uid() then
        raise exception 'Solo Administrador o Gerente pueden asignar responsables.' using errcode = '42501';
      end if;
      new.responsable_id := auth.uid();
    end if;
    assignment_changed := new.responsable_id is not null;
  else
    assignment_changed := new.responsable_id is distinct from old.responsable_id;
    if assignment_changed and actor_role = 'Vendedor' then
      raise exception 'Solo Administrador o Gerente pueden reasignar leads.' using errcode = '42501';
    end if;
  end if;
  if assignment_changed and new.responsable_id is not null then
    -- FOR SHARE serializa la asignación con la inactivación del perfil.
    perform 1 from public.profiles where id = new.responsable_id and activo
      and rol in ('Administrador', 'Gerente', 'Vendedor') for share;
    if not found then raise exception 'El responsable debe ser un usuario activo.' using errcode = '22023'; end if;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function nexo_private.prepare_lead() from public, anon, authenticated;
drop trigger if exists leads_prepare on public.leads;
create trigger leads_prepare before insert or update on public.leads
  for each row execute function nexo_private.prepare_lead();

alter table public.leads enable row level security;
revoke all on public.leads from public, anon, authenticated;
grant select, delete on public.leads to authenticated;
-- Sin escritura directa de id, fechas automáticas ni convertido_cliente_id.
grant insert (nombres, apellidos, empresa, correo, telefono, cargo, fuente, estado, prioridad, responsable_id, notas, ultimo_contacto, proximo_seguimiento) on public.leads to authenticated;
grant update (nombres, apellidos, empresa, correo, telefono, cargo, fuente, estado, prioridad, responsable_id, notas, ultimo_contacto, proximo_seguimiento) on public.leads to authenticated;
drop policy if exists leads_read on public.leads;
create policy leads_read on public.leads for select to authenticated
  using ((select nexo_private.active_role()) in ('Administrador', 'Gerente', 'Vendedor'));
drop policy if exists leads_create on public.leads;
create policy leads_create on public.leads for insert to authenticated
  with check ((select nexo_private.active_role()) in ('Administrador', 'Gerente', 'Vendedor'));
drop policy if exists leads_edit on public.leads;
create policy leads_edit on public.leads for update to authenticated
  using ((select nexo_private.active_role()) in ('Administrador', 'Gerente', 'Vendedor'))
  with check ((select nexo_private.active_role()) in ('Administrador', 'Gerente', 'Vendedor'));
drop policy if exists leads_delete on public.leads;
create policy leads_delete on public.leads for delete to authenticated
  using ((select nexo_private.active_role()) in ('Administrador', 'Gerente'));

-- Directorio mínimo: no amplía las políticas ni expone correos de profiles.
-- Incluye inactivos ya asignados para conservar sus etiquetas en el historial.
create or replace function public.lead_responsibles()
returns table (id uuid, nombres text, apellidos text, activo boolean, rol text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.nombres, p.apellidos, p.activo, p.rol from public.profiles p
  where nexo_private.active_role() in ('Administrador', 'Gerente', 'Vendedor')
    and (p.activo or exists (select 1 from public.leads l where l.responsable_id = p.id))
  order by p.nombres, p.apellidos, p.id
$$;
revoke all on function public.lead_responsibles() from public, anon;
grant execute on function public.lead_responsibles() to authenticated;

-- Transacción idempotente. Serializa cada lead y las conversiones del mismo correo.
-- Un cliente existente solo se vincula tras confirmar su ID y el mismo correo.
create or replace function public.convert_lead(
  p_lead_id uuid,
  p_apellidos text default null,
  p_correo text default null,
  p_existing_client_id uuid default null
)
returns table (resultado text, cliente_id uuid, cliente_nombre text, cliente_correo text)
language plpgsql security definer set search_path = '' as $$
declare source public.leads; customer public.clientes; email_value text; surname text; owner_name text; outcome text;
begin
  if nexo_private.active_role() is null then raise exception 'Necesitas un perfil activo para convertir leads.' using errcode = '42501'; end if;
  select * into source from public.leads where id = p_lead_id for update;
  if not found then raise exception 'No se encontró el lead.' using errcode = 'P0002'; end if;
  if source.convertido_cliente_id is not null then
    select * into customer from public.clientes where id = source.convertido_cliente_id;
    return query select 'ya_convertido'::text, customer.id, trim(customer.nombres || ' ' || customer.apellidos), customer.correo;
    return;
  end if;
  email_value := lower(trim(coalesce(p_correo, source.correo)));
  surname := trim(coalesce(p_apellidos, source.apellidos));
  if email_value = '' or char_length(email_value) > 254 or email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Completa un correo válido para convertir el lead a cliente.' using errcode = '22023';
  end if;
  if char_length(surname) not between 1 and 100 then
    raise exception 'Completa los apellidos antes de convertir el lead.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(719025, hashtext(email_value));
  if p_existing_client_id is not null then
    select * into customer from public.clientes where id = p_existing_client_id and lower(trim(correo)) = email_value for share;
    if not found then raise exception 'El cliente ya no coincide con el correo. Vuelve a comprobarlo.' using errcode = '22023'; end if;
    outcome := 'vinculado';
  else
    select * into customer from public.clientes where lower(trim(correo)) = email_value order by created_at, id limit 1 for share;
    if found then
      return query select 'requiere_vinculo'::text, customer.id, trim(customer.nombres || ' ' || customer.apellidos), customer.correo;
      return;
    end if;
    select nullif(trim(nombres || ' ' || apellidos), '') into owner_name from public.profiles where id = source.responsable_id;
    begin
      insert into public.clientes(nombres, apellidos, empresa, correo, telefono, cargo, estado, notas, responsable, ultimo_contacto)
      values (source.nombres, surname, source.empresa, email_value, source.telefono, source.cargo, 'Prospecto', source.notas, coalesce(owner_name, 'Sin asignar'), source.ultimo_contacto)
      returning * into customer;
    exception when unique_violation then
      -- Un alta concurrente desde Clientes también puede ganar la carrera.
      select * into customer from public.clientes where lower(trim(correo)) = email_value order by created_at, id limit 1 for share;
      if not found then raise; end if;
      return query select 'requiere_vinculo'::text, customer.id, trim(customer.nombres || ' ' || customer.apellidos), customer.correo;
      return;
    end;
    outcome := 'creado';
  end if;
  update public.leads set estado = 'Convertido', convertido_cliente_id = customer.id,
    apellidos = surname, correo = email_value where id = source.id;
  return query select outcome, customer.id, trim(customer.nombres || ' ' || customer.apellidos), customer.correo;
end;
$$;
revoke all on function public.convert_lead(uuid, text, text, uuid) from public, anon;
grant execute on function public.convert_lead(uuid, text, text, uuid) to authenticated;
commit;
