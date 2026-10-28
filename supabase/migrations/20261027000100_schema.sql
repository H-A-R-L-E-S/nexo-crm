-- =========================================================
-- NEXO CRM - ESQUEMA INICIAL DE CLIENTES
-- =========================================================
-- DESARROLLO TEMPORAL:
-- La clave pública (anon) tendrá acceso CRUD sin autenticación.
-- Estas políticas DEBEN reemplazarse cuando implementemos
-- autenticación, usuarios y roles antes de producción.
-- =========================================================


-- Extensión necesaria para generar UUID
create extension if not exists pgcrypto;


-- =========================================================
-- TABLA CLIENTES
-- =========================================================

create table if not exists public.clientes (
    id uuid primary key default gen_random_uuid(),

    nombres text not null
        check (char_length(nombres) between 2 and 80),

    apellidos text not null
        check (char_length(apellidos) between 1 and 100),

    empresa text not null default ''
        check (char_length(empresa) <= 100),

    correo text not null
        check (char_length(correo) <= 254),

    telefono text not null
        check (char_length(telefono) <= 30),

    cargo text not null default ''
        check (char_length(cargo) <= 100),

    estado text not null default 'Prospecto'
        check (estado in ('Activo', 'Prospecto', 'Inactivo')),

    direccion text not null default ''
        check (char_length(direccion) <= 200),

    notas text not null default ''
        check (char_length(notas) <= 1500),

    responsable text not null default 'Sin asignar',

    ultimo_contacto timestamptz,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);


-- =========================================================
-- ÍNDICES
-- =========================================================

create index if not exists clientes_empresa_idx
    on public.clientes (empresa);

create index if not exists clientes_estado_idx
    on public.clientes (estado);

create index if not exists clientes_correo_idx
    on public.clientes (correo);

create unique index if not exists clientes_correo_lower_idx
    on public.clientes (lower(correo));


-- =========================================================
-- ACTUALIZACIÓN AUTOMÁTICA DE updated_at
-- =========================================================

create or replace function public.set_clientes_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;


drop trigger if exists clientes_updated_at
on public.clientes;


create trigger clientes_updated_at
before update on public.clientes
for each row
execute function public.set_clientes_updated_at();


-- =========================================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================================

alter table public.clientes
enable row level security;


-- =========================================================
-- PERMISOS TEMPORALES PARA DESARROLLO
-- =========================================================

grant select, insert, update, delete
on table public.clientes
to anon;


-- Si posteriormente probamos usuarios autenticados antes
-- de implementar roles definitivos, también permitimos CRUD.
grant select, insert, update, delete
on table public.clientes
to authenticated;


-- =========================================================
-- ELIMINAR POLÍTICAS PREVIAS SI EXISTEN
-- =========================================================

drop policy if exists "Desarrollo: leer clientes"
on public.clientes;

drop policy if exists "Desarrollo: crear clientes"
on public.clientes;

drop policy if exists "Desarrollo: editar clientes"
on public.clientes;

drop policy if exists "Desarrollo: eliminar clientes"
on public.clientes;


-- =========================================================
-- POLÍTICAS TEMPORALES PARA ANON
-- =========================================================

create policy "Desarrollo: leer clientes"
on public.clientes
for select
to anon
using (true);


create policy "Desarrollo: crear clientes"
on public.clientes
for insert
to anon
with check (true);


create policy "Desarrollo: editar clientes"
on public.clientes
for update
to anon
using (true)
with check (true);


create policy "Desarrollo: eliminar clientes"
on public.clientes
for delete
to anon
using (true);


-- =========================================================
-- FIN DEL ESQUEMA
-- =========================================================