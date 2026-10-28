-- Nexo CRM, Fase 7C.2.3. PROPUESTA, NO EJECUTADA.
-- Fecha de revisión: 2026-10-22 (America/Lima).
-- Requiere aprobación expresa posterior y ensayo en una base aislada.
-- Guardado fuera de supabase/migrations para evitar su aplicación automática.
-- Alcance: ampliación estructural. NO habilita por sí sola el flujo UUID.
-- Los controles de asignación, RPC y conversión descritos en el informe
-- deben implementarse y probarse antes de habilitar las nuevas escrituras.
-- No modifica políticas RLS, Auth, grants, funciones ni triggers existentes.
-- No asigna usuarios, no actualiza filas y no interpreta nombres históricos.

-- Preflight propuesto, solo lectura. Verificar el resultado antes de aplicar.
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'clientes' and column_name in
      ('id', 'responsable', 'responsable_id', 'updated_at'))
    or (table_name = 'profiles' and column_name in
      ('id', 'nombres', 'apellidos', 'rol', 'activo', 'updated_at'))
  )
order by table_name, ordinal_position;

-- Una única transacción, para una ventana de mantenimiento autorizada.
-- Sin IF NOT EXISTS: una segunda ejecución o deriva exige revisión manual.
begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.clientes
  add column responsable_id uuid;

alter table public.clientes
  add constraint clientes_responsable_id_fkey
  foreign key (responsable_id)
  references public.profiles (id)
  on update restrict
  on delete restrict;

create index clientes_responsable_id_idx
  on public.clientes (responsable_id)
  where responsable_id is not null;

commit;

-- Verificación estructural propuesta, solo lectura, posterior al COMMIT.
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'clientes'
  and column_name in ('responsable', 'responsable_id', 'updated_at')
order by ordinal_position;

select conname, convalidated, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.clientes'::regclass
  and conname = 'clientes_responsable_id_fkey';

-- En la expansión, con escrituras suspendidas, el resultado esperado es 0.
-- Esta consulta debe ejecutarse como operador autorizado que vea todas las filas;
-- un conteo filtrado por RLS no acredita integridad de toda la tabla.
select count(*) as clientes_con_uuid_en_expansion
from public.clientes
where responsable_id is not null;

-- No se proporciona un DROP de rollback: borraría referencias incorporadas
-- después. Conservar columna/FK/UUID y volver a una aplicación compatible.
