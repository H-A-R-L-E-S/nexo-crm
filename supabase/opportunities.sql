-- Ejecutar manualmente DESPUÉS de leads.sql. No altera políticas de módulos anteriores.
begin;
create table if not exists public.oportunidades (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(trim(titulo)) between 2 and 160),
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  lead_id uuid references public.leads(id) on delete restrict,
  responsable_id uuid references public.profiles(id) on delete restrict,
  etapa text not null default 'Nueva' check (etapa in ('Nueva', 'Contacto', 'Propuesta', 'Negociación', 'Ganada', 'Perdida')),
  valor numeric(14,2) not null default 0 check (valor >= 0 and valor <= 999999999999.99),
  -- PostgREST conserva el decimal exacto sin convertir numeric a un float JSON.
  valor_decimal text generated always as (valor::text) stored,
  probabilidad integer not null default 10 check (probabilidad between 0 and 100),
  fecha_cierre_estimada date,
  descripcion text not null default '' check (char_length(descripcion) <= 3000),
  origen text not null default '' check (char_length(origen) <= 100),
  cerrada_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint oportunidades_cierre_consistente check ((etapa in ('Ganada', 'Perdida')) = (cerrada_at is not null)),
  constraint oportunidades_probabilidad_cierre check ((etapa <> 'Ganada' or probabilidad = 100) and (etapa <> 'Perdida' or probabilidad = 0))
);
create index if not exists oportunidades_cliente_idx on public.oportunidades(cliente_id);
create index if not exists oportunidades_lead_idx on public.oportunidades(lead_id) where lead_id is not null;
create index if not exists oportunidades_responsable_idx on public.oportunidades(responsable_id);
create index if not exists oportunidades_etapa_idx on public.oportunidades(etapa);
create index if not exists oportunidades_fecha_idx on public.oportunidades(fecha_cierre_estimada);
create index if not exists oportunidades_cerrada_idx on public.oportunidades(cerrada_at) where etapa = 'Ganada';
create index if not exists oportunidades_created_idx on public.oportunidades(created_at desc, id);

create or replace function nexo_private.prepare_opportunity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare actor_role text; changed_owner boolean; changed_relation boolean;
begin
  actor_role := nexo_private.active_role();
  new.titulo := trim(new.titulo);
  if tg_op = 'INSERT' then
    if actor_role = 'Vendedor' then
      if new.responsable_id is not null and new.responsable_id <> auth.uid() then
        raise exception 'Solo Administrador o Gerente pueden asignar responsables.' using errcode = '42501';
      end if;
      new.responsable_id := auth.uid();
    end if;
    changed_owner := new.responsable_id is not null;
    changed_relation := new.lead_id is not null;
    new.cerrada_at := case when new.etapa in ('Ganada', 'Perdida') then clock_timestamp() else null end;
  else
    changed_owner := new.responsable_id is distinct from old.responsable_id;
    changed_relation := new.lead_id is distinct from old.lead_id or new.cliente_id is distinct from old.cliente_id;
    if changed_owner and actor_role = 'Vendedor' then
      raise exception 'Solo Administrador o Gerente pueden reasignar oportunidades.' using errcode = '42501';
    end if;
    if new.etapa is distinct from old.etapa then
      new.cerrada_at := case when new.etapa in ('Ganada', 'Perdida') then clock_timestamp() else null end;
    else new.cerrada_at := old.cerrada_at;
    end if;
  end if;
  if changed_owner and new.responsable_id is not null then
    perform 1 from public.profiles where id = new.responsable_id and activo and rol in ('Administrador', 'Gerente', 'Vendedor') for share;
    if not found then raise exception 'El responsable debe estar activo.' using errcode = '22023'; end if;
  end if;
  if changed_relation and new.lead_id is not null then
    perform 1 from public.leads where id = new.lead_id and estado = 'Convertido' and convertido_cliente_id = new.cliente_id for share;
    if not found then raise exception 'El lead debe estar convertido y pertenecer al cliente seleccionado.' using errcode = '22023'; end if;
  end if;
  if new.etapa = 'Ganada' then new.probabilidad := 100;
  elsif new.etapa = 'Perdida' then new.probabilidad := 0;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function nexo_private.prepare_opportunity() from public, anon, authenticated;
drop trigger if exists oportunidades_prepare on public.oportunidades;
create trigger oportunidades_prepare before insert or update on public.oportunidades for each row execute function nexo_private.prepare_opportunity();

alter table public.oportunidades enable row level security;
revoke all on public.oportunidades from public, anon, authenticated;
grant select, delete on public.oportunidades to authenticated;
grant insert (titulo, cliente_id, lead_id, responsable_id, etapa, valor, probabilidad, fecha_cierre_estimada, descripcion, origen) on public.oportunidades to authenticated;
grant update (titulo, cliente_id, lead_id, responsable_id, etapa, valor, probabilidad, fecha_cierre_estimada, descripcion, origen) on public.oportunidades to authenticated;
drop policy if exists oportunidades_read on public.oportunidades;
create policy oportunidades_read on public.oportunidades for select to authenticated using ((select nexo_private.active_role()) in ('Administrador', 'Gerente', 'Vendedor'));
drop policy if exists oportunidades_create on public.oportunidades;
create policy oportunidades_create on public.oportunidades for insert to authenticated with check ((select nexo_private.active_role()) in ('Administrador', 'Gerente', 'Vendedor'));
drop policy if exists oportunidades_edit on public.oportunidades;
create policy oportunidades_edit on public.oportunidades for update to authenticated using ((select nexo_private.active_role()) in ('Administrador', 'Gerente', 'Vendedor')) with check ((select nexo_private.active_role()) in ('Administrador', 'Gerente', 'Vendedor'));
drop policy if exists oportunidades_delete on public.oportunidades;
create policy oportunidades_delete on public.oportunidades for delete to authenticated using ((select nexo_private.active_role()) in ('Administrador', 'Gerente'));

create or replace function public.opportunity_responsibles()
returns table (id uuid, nombres text, apellidos text, activo boolean, rol text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.nombres, p.apellidos, p.activo, p.rol from public.profiles p
  where nexo_private.active_role() in ('Administrador', 'Gerente', 'Vendedor')
    and (p.activo or exists (select 1 from public.oportunidades o where o.responsable_id = p.id))
  order by p.nombres, p.apellidos, p.id
$$;
revoke all on function public.opportunity_responsibles() from public, anon;
grant execute on function public.opportunity_responsibles() to authenticated;
commit;
