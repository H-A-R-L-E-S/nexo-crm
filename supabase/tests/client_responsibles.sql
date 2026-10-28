-- Fase 7C.2.3A. PRUEBAS PREPARADAS, NO EJECUTADAS.
-- Escribe fixtures de Clientes/Leads y modifica temporalmente dos perfiles
-- existentes. ROLLBACK no convierte este archivo en una consulta de solo lectura.
-- Requiere autorizacion expresa futura y una base local aislada desechable.
-- No crea cuentas Auth, perfiles ni roles. No ejecutar en Supabase real.
-- Aplicar previamente el esquema aprobado, controles, directorio y convert_lead.
-- El operador debe suministrar settings de sesion ANTES de ejecutar el archivo:
-- nexo.cr_test_authorization = client-responsibles-isolated-authorized
-- nexo.cr_test_database = nombre exacto de la base aislada
-- nexo.cr_test_admin, nexo.cr_test_manager, nexo.cr_test_seller = UUID existentes
--   activos, de su rol respectivo y con nombres/apellidos completos.
-- nexo.cr_test_inactive = UUID existente inactivo, rol comercial.
-- nexo.cr_test_incomplete = UUID Vendedor existente activo sin nombres o apellidos.
-- Todos deben ser distintos y pertenecer exclusivamente al entorno de pruebas.
-- Si falla una asercion, emitir ROLLBACK; no continuar ni hacer COMMIT.

begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';

do $$
declare fixture text; actor public.profiles; required_role text;
begin
  if current_setting('nexo.cr_test_authorization', true)
       is distinct from 'client-responsibles-isolated-authorized'
    or current_setting('nexo.cr_test_database', true) is distinct from current_database()
    or (inet_server_addr() is not null
        and inet_server_addr() not in ('127.0.0.1'::inet, '::1'::inet)) then
    raise exception 'Prueba bloqueada: falta autorizacion expresa de una base local aislada.';
  end if;
  foreach fixture in array array['admin', 'manager', 'seller', 'inactive', 'incomplete'] loop
    select * into actor from public.profiles
      where id = nullif(current_setting('nexo.cr_test_' || fixture, true), '')::uuid;
    if not found then raise exception 'Falta un perfil de prueba existente: %', fixture; end if;
    if actor.rol not in ('Administrador', 'Gerente', 'Vendedor') then
      raise exception 'Rol no comercial en fixture %', fixture;
    end if;
    required_role := case fixture when 'admin' then 'Administrador'
      when 'manager' then 'Gerente' when 'seller' then 'Vendedor'
      when 'incomplete' then 'Vendedor' else actor.rol end;
    if actor.rol <> required_role then raise exception 'Rol incorrecto en fixture %', fixture; end if;
    if fixture in ('admin', 'manager', 'seller')
      and (not actor.activo or nexo_private.client_profile_name(actor.nombres) = ''
        or nexo_private.client_profile_name(actor.apellidos) = '') then
      raise exception 'El actor % debe estar activo y completo', fixture;
    end if;
    if fixture = 'inactive' and actor.activo then raise exception 'El fixture inactive debe estar inactivo'; end if;
    if fixture = 'incomplete' and (not actor.activo
      or (nexo_private.client_profile_name(actor.nombres) <> ''
        and nexo_private.client_profile_name(actor.apellidos) <> '')) then
      raise exception 'El fixture incomplete debe estar activo e incompleto';
    end if;
  end loop;
  if (select count(distinct current_setting('nexo.cr_test_' || name))
      from unnest(array['admin','manager','seller','inactive','incomplete']) names(name)) <> 5 then
    raise exception 'Los cinco perfiles de prueba deben ser distintos';
  end if;
end $$;

create function pg_temp.cr_assert(condition boolean, message text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if condition is distinct from true then raise exception 'FALLO: %', message; end if;
end $$;

create function pg_temp.cr_reject(statement text, states text[], message text)
returns void language plpgsql security invoker set search_path = '' as $$
declare actual text;
begin
  begin
    execute statement;
  exception when others then
    get stacked diagnostics actual = returned_sqlstate;
    if actual = any(states) then return; end if;
    raise exception 'FALLO: %, SQLSTATE inesperado %', message, actual;
  end;
  raise exception 'FALLO: se permitio %', message;
end $$;

create function pg_temp.cr_actor(fixture text, anonymous_session boolean default false)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform set_config('request.jwt.claims', json_build_object(
    'sub', current_setting('nexo.cr_test_' || fixture), 'role', 'authenticated',
    'is_anonymous', anonymous_session)::text, true);
end;
$$;

revoke all on function pg_temp.cr_assert(boolean,text) from public;
revoke all on function pg_temp.cr_reject(text,text[],text) from public;
revoke all on function pg_temp.cr_actor(text,boolean) from public;
grant execute on function pg_temp.cr_assert(boolean,text) to authenticated,anon;
grant execute on function pg_temp.cr_reject(text,text[],text) to authenticated,anon;
grant execute on function pg_temp.cr_actor(text,boolean) to authenticated;
do $$
declare temporary_schema text;
begin
  select nspname into temporary_schema from pg_namespace where oid = pg_my_temp_schema();
  execute format('grant usage on schema %I to authenticated,anon',temporary_schema);
end $$;

create temp table cr_profile_baseline as
  select * from public.profiles where id in (
    current_setting('nexo.cr_test_inactive')::uuid,
    current_setting('nexo.cr_test_incomplete')::uuid
  );
create temp table cr_fixture (label text primary key, id uuid not null, original text, version timestamptz);
grant select, insert, update on cr_fixture to authenticated;
create temp table cr_existing (relation text, id uuid, snapshot jsonb);
do $$
declare relation_name text;
begin
  foreach relation_name in array array['clientes','leads','oportunidades','ventas','venta_items','tareas'] loop
    execute format('insert into pg_temp.cr_existing select %L,id,to_jsonb(source_row) from public.%I source_row',
      relation_name,relation_name);
  end loop;
end $$;

-- Fixtures historicas: se crean con un UUID elegible y despues el mismo perfil
-- vuelve a su estado original. Solo afecta los perfiles desechables suministrados.
select pg_temp.cr_actor('admin');
update public.profiles set activo = true,
  nombres = case when nexo_private.client_profile_name(nombres) = '' then 'Fixture' else nombres end,
  apellidos = case when nexo_private.client_profile_name(apellidos) = '' then 'Historial' else apellidos end
where id in (select id from cr_profile_baseline);

with inserted as (
  insert into public.clientes(nombres, apellidos, correo, telefono, responsable_id)
  select 'Fixture', 'Historico', gen_random_uuid()::text || '@example.invalid', '999123456', id
  from cr_profile_baseline returning id, responsable, responsable_id, updated_at
)
insert into cr_fixture(label, id, original, version)
  select case when responsable_id = current_setting('nexo.cr_test_inactive')::uuid
    then 'inactive' else 'incomplete' end, id, responsable, updated_at from inserted;

with inserted as (
  insert into public.leads(nombres, apellidos, correo, telefono, responsable_id)
    select 'Fixture', 'Fuente historica', gen_random_uuid()::text || '@example.invalid',
      '999123456', current_setting('nexo.cr_test_inactive')::uuid
    returning id
)
insert into cr_fixture(label, id) select 'lead_inactive', id from inserted;

update public.profiles p set activo = original.activo,
  nombres = original.nombres, apellidos = original.apellidos
from cr_profile_baseline original where p.id = original.id;

-- Esta fila representa el caso historico, sin tocar al cliente real Ana Garcia.
with inserted as (
  insert into public.clientes(nombres, apellidos, correo, telefono, responsable, responsable_id)
    values ('Fixture', 'Ana historica', gen_random_uuid()::text || '@example.invalid',
      '999123456', 'Ana García', null) returning id, responsable, updated_at
)
insert into cr_fixture select 'ana', id, responsable, updated_at from inserted;

set local role authenticated;
do $$
declare role_name text; customer uuid; chosen uuid; original text; changed integer;
  before_version timestamptz; after_version timestamptz; directory_keys text[];
begin
  foreach role_name in array array['admin', 'manager'] loop
    perform pg_temp.cr_actor(role_name);
    chosen := current_setting('nexo.cr_test_seller')::uuid;
    insert into public.clientes(nombres, apellidos, correo, telefono, responsable, responsable_id)
      values ('Fixture', 'Asignacion', gen_random_uuid()::text || '@example.invalid',
        '999123456', 'Texto manipulado', chosen)
      returning id, responsable, updated_at into customer, original, before_version;
    perform pg_temp.cr_assert(original = (select nexo_private.client_profile_name(nombres)
      || ' ' || nexo_private.client_profile_name(apellidos)
      from public.client_responsibles() where id = chosen), role_name || ' alta canonica por UUID');
    chosen := current_setting('nexo.cr_test_admin')::uuid;
    update public.clientes set responsable_id = chosen where id = customer;
    perform pg_temp.cr_assert(exists(select 1 from public.clientes
      where id = customer and responsable_id = chosen and responsable = original),
      role_name || ' reasigna conservando texto exacto');

    perform pg_temp.cr_reject(format('update public.clientes set responsable_id = null where id = %L', customer),
      array['22023'], role_name || ' vaciar UUID');
    perform pg_temp.cr_reject(format('update public.clientes set responsable = %L where id = %L',
      'Texto sustituido', customer), array['42501'], 'reescribir texto historico');
    perform pg_temp.cr_reject(format('update public.clientes set responsable_id = %L where id = %L',
      current_setting('nexo.cr_test_inactive'), customer), array['22023'], 'asignar inactivo');
    perform pg_temp.cr_reject(format('update public.clientes set responsable_id = %L where id = %L',
      current_setting('nexo.cr_test_incomplete'), customer), array['22023'], 'asignar incompleto');
    perform pg_temp.cr_reject(format('update public.clientes set responsable_id = %L where id = %L',
      gen_random_uuid(), customer), array['22023','23503'], 'UUID inexistente');
    perform pg_temp.cr_reject(format('update public.clientes set responsable_id = %L where id = %L',
      'UUID-con-error', customer), array['22P02'], 'UUID mal formado');
    perform pg_temp.cr_reject(format('insert into public.clientes(nombres,apellidos,correo,telefono,responsable_id)
      values (%L,%L,%L,%L,%L)', 'Fixture','Invalido',gen_random_uuid()::text || '@example.invalid',
      '999123456',current_setting('nexo.cr_test_inactive')), array['22023'], 'alta con inactivo');
    perform pg_temp.cr_reject(format('insert into public.clientes(nombres,apellidos,correo,telefono,responsable_id)
      values (%L,%L,%L,%L,%L)', 'Fixture','Invalido',gen_random_uuid()::text || '@example.invalid',
      '999123456',current_setting('nexo.cr_test_incomplete')), array['22023'], 'alta con incompleto');

    -- Dos escrituras condicionadas con la misma version: la segunda no afecta filas.
    -- Es un ensayo secuencial de token obsoleto; no demuestra carreras multisesion.
    select updated_at into before_version from public.clientes where id = customer;
    update public.clientes set empresa = 'Primera escritura'
      where id = customer and updated_at = before_version returning updated_at into after_version;
    get diagnostics changed = row_count;
    perform pg_temp.cr_assert(changed = 1 and after_version > before_version,
      'timestamp monotono incluso dentro de una transaccion');
    update public.clientes set empresa = 'Segunda escritura obsoleta'
      where id = customer and updated_at = before_version;
    get diagnostics changed = row_count;
    perform pg_temp.cr_assert(changed = 0 and exists(select 1 from public.clientes
      where id = customer and empresa = 'Primera escritura' and responsable = original),
      'el token obsoleto conserva la primera escritura');
    update public.clientes set updated_at = before_version where id = customer;
    perform pg_temp.cr_assert(exists(select 1 from public.clientes
      where id = customer and updated_at > after_version), 'no se puede restaurar un token anterior');

    perform pg_temp.cr_assert(not exists(select 1 from public.client_responsibles()
      where can_assign and (not activo or nexo_private.client_profile_name(nombres) = ''
        or nexo_private.client_profile_name(apellidos) = '')),
      'opciones nuevas completas activas autorizadas');
    if role_name = 'manager' then
      perform pg_temp.cr_assert((select count(*) from public.profiles) = 1,
        'Gerente conserva SELECT de Profiles solo propio');
    else
      perform pg_temp.cr_assert((select count(*) from public.profiles where id in (
        current_setting('nexo.cr_test_admin')::uuid,current_setting('nexo.cr_test_manager')::uuid,
        current_setting('nexo.cr_test_seller')::uuid,current_setting('nexo.cr_test_inactive')::uuid,
        current_setting('nexo.cr_test_incomplete')::uuid)) = 5,
        'Administrador conserva lectura del equipo en Profiles');
    end if;
    delete from public.clientes where id = customer;
    get diagnostics changed = row_count;
    perform pg_temp.cr_assert(changed = 1, role_name || ' conserva DELETE autorizado');
  end loop;

  perform pg_temp.cr_actor('seller');
  chosen := current_setting('nexo.cr_test_seller')::uuid;
  insert into public.clientes(nombres,apellidos,correo,telefono,responsable_id)
    values ('Fixture','Vendedor',gen_random_uuid()::text || '@example.invalid','999123456', chosen)
    returning id into customer;
  perform pg_temp.cr_assert(exists(select 1 from public.clientes where id = customer and responsable_id = chosen),
    'Vendedor selecciona explicitamente su UUID');
  perform pg_temp.cr_reject(format('insert into public.clientes(nombres,apellidos,correo,telefono,responsable_id)
    values (%L,%L,%L,%L,%L)', 'Fixture','Prohibido',gen_random_uuid()::text || '@example.invalid',
    '999123456',current_setting('nexo.cr_test_admin')), array['42501'], 'Vendedor crea para otro');
  perform pg_temp.cr_reject(format('update public.clientes set responsable_id = %L where id = %L',
    current_setting('nexo.cr_test_admin'),customer), array['42501'], 'Vendedor reasigna');
  perform pg_temp.cr_reject(format('update public.clientes set responsable_id = null where id = %L', customer),
    array['42501'], 'Vendedor vacia UUID');
  perform pg_temp.cr_reject(format('update public.clientes set responsable_id = %L where id = %L',
    chosen,(select id from cr_fixture where label = 'ana')), array['42501'], 'Vendedor se apropia de historico NULL');
  update public.clientes set notas = 'Contacto actualizado'
    where id in (select id from cr_fixture where label in ('ana','inactive','incomplete'));
  get diagnostics changed = row_count;
  perform pg_temp.cr_assert(changed = 3, 'edicion ordinaria actualiza las tres fixtures historicas');
  perform pg_temp.cr_assert((select count(*) from public.profiles) = 1, 'Vendedor conserva RLS de Profiles');
  perform pg_temp.cr_assert((select count(*) from public.client_responsibles() where can_assign) = 1
    and exists(select 1 from public.client_responsibles() where id = chosen and can_assign),
    'Vendedor solo recibe su opcion de asignacion');

  foreach role_name in array array['inactive', 'incomplete'] loop
    select id into customer from cr_fixture where label = role_name;
    perform pg_temp.cr_assert(exists(select 1 from public.clientes c join cr_fixture f on c.id = f.id
      where f.label = role_name and convert_to(c.responsable,'UTF8') = convert_to(f.original,'UTF8')
        and c.notas = 'Contacto actualizado' and c.updated_at > f.version
        and c.responsable_id = current_setting('nexo.cr_test_' || role_name)::uuid),
      'edicion ordinaria conserva responsable historico ' || role_name);
    perform pg_temp.cr_assert(exists(select 1 from public.client_responsibles(customer)
      where id = current_setting('nexo.cr_test_' || role_name)::uuid and not can_assign),
      'directorio contextual conserva historico ' || role_name);
    perform pg_temp.cr_assert(not exists(select 1 from public.client_responsibles()
      where id = current_setting('nexo.cr_test_' || role_name)::uuid and can_assign),
      'historico no es opcion nueva');
  end loop;
  perform pg_temp.cr_assert(exists(select 1 from public.clientes c join cr_fixture f on c.id = f.id
    where f.label = 'ana' and c.responsable_id is null and c.responsable = 'Ana García'
      and convert_to(c.responsable,'UTF8') = convert_to(f.original,'UTF8')
      and c.notas = 'Contacto actualizado' and c.updated_at > f.version),
      'Ana Garcia conserva texto exacto y UUID NULL al editar contacto');
  select array_agg(key order by key) into directory_keys
    from (select * from public.client_responsibles() limit 1) row_value,
      lateral jsonb_object_keys(to_jsonb(row_value)) keys(key);
  perform pg_temp.cr_assert(directory_keys = array['activo','apellidos','can_assign','id','nombres','rol'],
    'DTO del directorio no expone email, avatar ni metadatos');
  perform pg_temp.cr_reject(format('select * from public.client_responsibles(%L)',gen_random_uuid()),
    array['42501'], 'directorio contextual de cliente no visible');
  delete from public.clientes where id = customer;
  get diagnostics changed = row_count;
  perform pg_temp.cr_assert(changed = 0, 'Vendedor sigue sin DELETE');
end $$;
reset role;

-- Conversion: nuevo cliente, fuente ajena para Vendedor, historial incompleto,
-- confirmacion de vinculo, y segunda llamada sobre el mismo Lead sin duplicacion.
select pg_temp.cr_actor('manager');
set local role authenticated;
do $$
declare lead_id uuid; customer uuid; response record; historical text; expected_owner text;
begin
  insert into public.leads(nombres,apellidos,telefono,correo,responsable_id)
    values ('Fixture','Conversion','999123456',gen_random_uuid()::text || '@example.invalid',
      current_setting('nexo.cr_test_seller')::uuid) returning id into lead_id;
  select * into response from public.convert_lead(lead_id);
  customer := response.cliente_id;
  perform pg_temp.cr_assert(response.resultado = 'creado' and exists(select 1 from public.clientes
    where id = customer and responsable_id = current_setting('nexo.cr_test_seller')::uuid),
    'Gerente convierte con UUID elegible de origen');
  select * into response from public.convert_lead(lead_id);
  perform pg_temp.cr_assert(response.resultado = 'ya_convertido' and response.cliente_id = customer,
    'convert_lead mantiene idempotencia');

  select id into lead_id from cr_fixture where label = 'lead_inactive';
  select coalesce(nullif(concat_ws(' ',
      nullif(nexo_private.client_profile_name(nombres),''),
      nullif(nexo_private.client_profile_name(apellidos),'')),''),'Sin asignar')
    into expected_owner from public.client_responsibles()
    where id = current_setting('nexo.cr_test_inactive')::uuid;
  select * into response from public.convert_lead(lead_id);
  perform pg_temp.cr_assert(response.resultado = 'creado' and exists(select 1 from public.clientes
    where id = response.cliente_id and responsable_id is null
      and convert_to(responsable,'UTF8') = convert_to(expected_owner,'UTF8')),
    'conversion inactiva conserva UUID pendiente y texto disponible exacto');

  -- Crear el Lead como Gerente y convertir como Vendedor no autoriza copiar a otro.
  insert into public.leads(nombres,apellidos,telefono,correo,responsable_id)
    values ('Fixture','Fuente ajena','999123456',gen_random_uuid()::text || '@example.invalid',
      current_setting('nexo.cr_test_manager')::uuid) returning id into lead_id;
  select concat_ws(' ',nexo_private.client_profile_name(nombres),nexo_private.client_profile_name(apellidos))
    into expected_owner from public.client_responsibles()
    where id = current_setting('nexo.cr_test_manager')::uuid;
  perform pg_temp.cr_actor('seller');
  select * into response from public.convert_lead(lead_id);
  perform pg_temp.cr_assert(response.resultado = 'creado' and exists(select 1 from public.clientes
    where id = response.cliente_id and responsable_id is null
      and convert_to(responsable,'UTF8') = convert_to(expected_owner,'UTF8')),
    'conversion Vendedor no asigna responsable ajeno y conserva su texto');

  insert into public.leads(nombres,apellidos,telefono,correo,responsable_id)
    values ('Fixture','Fuente propia','999123456',gen_random_uuid()::text || '@example.invalid',
      current_setting('nexo.cr_test_seller')::uuid) returning id into lead_id;
  select * into response from public.convert_lead(lead_id);
  perform pg_temp.cr_assert(response.resultado = 'creado' and exists(select 1 from public.clientes
    where id = response.cliente_id and responsable_id = current_setting('nexo.cr_test_seller')::uuid),
    'conversion Vendedor conserva su fuente propia elegible');

  -- El Vendedor incompleto puede mantener el flujo historico sin autoasignacion.
  perform pg_temp.cr_actor('incomplete');
  select coalesce(nullif(concat_ws(' ',
      nullif(nexo_private.client_profile_name(nombres),''),
      nullif(nexo_private.client_profile_name(apellidos),'')),''),'Sin asignar')
    into expected_owner from public.client_responsibles()
    where id = current_setting('nexo.cr_test_incomplete')::uuid;
  insert into public.leads(nombres,apellidos,telefono,correo,responsable_id)
    values ('Fixture','Fuente incompleta','999123456',gen_random_uuid()::text || '@example.invalid',
      current_setting('nexo.cr_test_incomplete')::uuid) returning id into lead_id;
  select * into response from public.convert_lead(lead_id);
  perform pg_temp.cr_assert(response.resultado = 'creado' and exists(select 1 from public.clientes
    where id = response.cliente_id and responsable_id is null
      and convert_to(responsable,'UTF8') = convert_to(expected_owner,'UTF8')),
    'conversion incompleta preserva pendiente y texto disponible exacto');

  -- El propio Vendedor de prueba cambia solo sus nombres permitidos. Cada
  -- variante sigue incompleta, no recibe UUID nuevo y se revierte al finalizar.
  update public.profiles set nombres = U&'\00A0Parcial\FEFF', apellidos = U&'\2003\00A0'
    where id = current_setting('nexo.cr_test_incomplete')::uuid;
  insert into public.leads(nombres,apellidos,telefono,correo,responsable_id)
    values ('Fixture','Nombre parcial','999123456',gen_random_uuid()::text || '@example.invalid',
      current_setting('nexo.cr_test_incomplete')::uuid) returning id into lead_id;
  select * into response from public.convert_lead(lead_id);
  perform pg_temp.cr_assert(response.resultado = 'creado' and exists(select 1 from public.clientes
    where id = response.cliente_id and responsable_id is null
      and convert_to(responsable,'UTF8') = convert_to('Parcial','UTF8')),
    'perfil parcial conserva exclusivamente el nombre disponible normalizado');

  update public.profiles set nombres = U&'\00A0\FEFF', apellidos = U&'\2003\202F\3000'
    where id = current_setting('nexo.cr_test_incomplete')::uuid;
  perform pg_temp.cr_assert(not exists(select 1 from public.client_responsibles()
    where id = current_setting('nexo.cr_test_incomplete')::uuid and can_assign),
    'perfil con whitespace Unicode no aparece como asignable');
  perform pg_temp.cr_reject(format('insert into public.clientes(nombres,apellidos,correo,telefono,responsable_id)
    values (%L,%L,%L,%L,%L)', 'Fixture','Unicode',gen_random_uuid()::text || '@example.invalid',
    '999123456',current_setting('nexo.cr_test_incomplete')), array['22023'],
    'asignacion nueva a perfil con nombres solo NBSP/BOM/Unicode');
  insert into public.leads(nombres,apellidos,telefono,correo,responsable_id)
    values ('Fixture','Sin nombre','999123456',gen_random_uuid()::text || '@example.invalid',
      current_setting('nexo.cr_test_incomplete')::uuid) returning id into lead_id;
  select * into response from public.convert_lead(lead_id);
  perform pg_temp.cr_assert(response.resultado = 'creado' and exists(select 1 from public.clientes
    where id = response.cliente_id and responsable_id is null and responsable = 'Sin asignar'),
    'perfil sin nombre conserva Sin asignar exacto y UUID NULL');

  perform pg_temp.cr_actor('manager');
  select id, original into customer, historical from cr_fixture where label = 'ana';
  insert into public.leads(nombres,apellidos,telefono,correo,responsable_id)
    select 'Fixture','Vinculo historico','999123456',correo,
      current_setting('nexo.cr_test_manager')::uuid from public.clientes where id = customer
      returning id into lead_id;
  select * into response from public.convert_lead(lead_id);
  perform pg_temp.cr_assert(response.resultado = 'requiere_vinculo' and response.cliente_id = customer,
    'correo coincidente requiere confirmacion');
  perform pg_temp.cr_assert(exists(select 1 from public.leads
    where id = lead_id and convertido_cliente_id is null), 'confirmacion no convierte prematuramente');
  select * into response from public.convert_lead(lead_id,null,null,customer);
  perform pg_temp.cr_assert(response.resultado = 'vinculado' and response.cliente_id = customer,
    'vinculo confirmado conserva cliente');
  perform pg_temp.cr_assert(exists(select 1 from public.clientes
    where id = customer and responsable = historical and responsable_id is null),
    'vincular conserva Ana Garcia intacta');
  select * into response from public.convert_lead(lead_id,null,null,customer);
  perform pg_temp.cr_assert(response.resultado = 'ya_convertido' and response.cliente_id = customer,
    'vinculo repetido es idempotente');
end $$;
reset role;

update public.profiles p set activo = original.activo,
  nombres = original.nombres, apellidos = original.apellidos
from cr_profile_baseline original where p.id = original.id;

-- Caso futuro de RLS por fila y deriva del catalogo. Esta policy temporal es
-- RESTRICTIVA: agrega una condicion a SELECT y no concede acceso adicional.
-- Solo pertenece a esta prueba aislada; ROLLBACK TO SAVEPOINT la elimina.
-- No se ha ejecutado este archivo ni modificado RLS de ninguna base.
select pg_temp.cr_actor('manager');
set local role authenticated;
with inserted as (
  insert into public.leads(nombres,apellidos,telefono,correo,responsable_id)
    values ('Fixture','Guardia RLS','999123456',gen_random_uuid()::text || '@example.invalid',
      current_setting('nexo.cr_test_seller')::uuid) returning id
)
insert into cr_fixture(label,id) select 'lead_rls_guard',id from inserted;
reset role;
create temp table cr_guard_clients as select id,to_jsonb(c) snapshot from public.clientes c;
create temp table cr_guard_lead as select id,to_jsonb(l) snapshot from public.leads l
  where id = (select id from cr_fixture where label = 'lead_rls_guard');
grant select on cr_guard_lead to authenticated;

savepoint cr_restrictive_rls;
create policy cr_test_hide_inactive on public.clientes
  as restrictive for select to authenticated
  using (responsable_id is distinct from current_setting('nexo.cr_test_inactive')::uuid);

select pg_temp.cr_actor('seller');
set local role authenticated;
do $$
declare lead_id uuid;
begin
  perform pg_temp.cr_assert(not exists(select 1 from public.clientes
    where responsable_id = current_setting('nexo.cr_test_inactive')::uuid),
    'policy restrictiva oculta todos los clientes del perfil inactivo');
  perform pg_temp.cr_assert(exists(select 1 from public.clientes
    where id = (select id from cr_fixture where label = 'incomplete')),
    'policy restrictiva conserva visible la fixture incompleta');
  perform pg_temp.cr_assert(not exists(select 1 from nexo_private.client_responsible_directory
    where id = current_setting('nexo.cr_test_inactive')::uuid)
    and not exists(select 1 from public.client_responsibles()
      where id = current_setting('nexo.cr_test_inactive')::uuid),
    'ni vista privada ni RPC filtran el perfil de clientes ocultos');
  perform pg_temp.cr_assert(exists(select 1 from nexo_private.client_responsible_directory
    where id = current_setting('nexo.cr_test_incomplete')::uuid)
    and exists(select 1 from public.client_responsibles()
      where id = current_setting('nexo.cr_test_incomplete')::uuid and not can_assign),
    'historico incompleto visible conserva su identidad sin conceder asignacion');
  perform pg_temp.cr_reject(format('select * from public.client_responsibles(%L)',
    (select id from cr_fixture where label = 'inactive')), array['42501'],
    'RPC contextual de cliente oculto por RLS');

  select id into lead_id from cr_fixture where label = 'lead_rls_guard';
  perform pg_temp.cr_reject(format('select * from public.convert_lead(%L)',lead_id),
    array['42501'], 'wrapper de conversion ante policy extra');
  perform pg_temp.cr_reject(format('select * from nexo_private.convert_lead_to_client(%L)',lead_id),
    array['42501'], 'nucleo privado llamado por SQL directo ante policy extra');
  perform pg_temp.cr_assert(exists(select 1 from public.leads l join cr_guard_lead before_row on l.id = before_row.id
    where to_jsonb(l) = before_row.snapshot and l.convertido_cliente_id is null),
    'rechazos de guardia conservan Lead completo sin conversion parcial');
end $$;
reset role;
select pg_temp.cr_assert((select count(*) from public.clientes) = (select count(*) from cr_guard_clients)
  and not exists(select 1 from cr_guard_clients before_row left join public.clientes c on c.id = before_row.id
    where c.id is null or to_jsonb(c) <> before_row.snapshot),
  'rechazos por deriva no insertan ni alteran clientes');

rollback to savepoint cr_restrictive_rls;
release savepoint cr_restrictive_rls;
select pg_temp.cr_assert(not exists(select 1 from pg_policy
  where polrelid = 'public.clientes'::regclass and polname = 'cr_test_hide_inactive'),
  'SAVEPOINT elimina exclusivamente la policy temporal restrictiva');
select nexo_private.assert_client_conversion_policy_baseline();

-- JWT valido con perfil inactivo: RLS no deja escribir, directorio no filtra equipo.
select pg_temp.cr_actor('inactive');
set local role authenticated;
do $$ declare changed integer; begin
  perform pg_temp.cr_assert(not exists(select 1 from public.clientes), 'inactivo no lee Clientes');
  perform pg_temp.cr_reject('select * from public.client_responsibles()',array['42501'], 'inactivo consulta directorio');
  perform pg_temp.cr_reject('insert into public.clientes(nombres,apellidos,correo,telefono)
    values (''Fixture'',''Prohibido'',''inactive@example.invalid'',''999123456'')',array['42501'], 'inactivo crea Cliente');
  perform pg_temp.cr_reject(format('select * from public.convert_lead(%L)',gen_random_uuid()),
    array['42501','P0002'], 'inactivo convierte');
  update public.clientes set notas = 'No permitido' where id = (select id from cr_fixture where label = 'ana');
  get diagnostics changed = row_count;
  perform pg_temp.cr_assert(changed = 0, 'RLS impide UPDATE de inactivo');
end $$;
reset role;

select pg_temp.cr_actor('seller',true);
set local role authenticated;
do $$ begin
  perform pg_temp.cr_assert(not exists(select 1 from public.clientes), 'sesion anonima no lee Clientes');
  perform pg_temp.cr_reject('select * from public.client_responsibles()',array['42501'], 'JWT is_anonymous consulta directorio');
  perform pg_temp.cr_reject('insert into public.clientes(nombres,apellidos,correo,telefono)
    values (''Fixture'',''Prohibido'',''anonymous@example.invalid'',''999123456'')',array['42501'], 'JWT anonimo crea Cliente');
end $$;
reset role;

select set_config('request.jwt.claims',json_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
  perform pg_temp.cr_assert(not exists(select 1 from public.clientes), 'sin perfil no lee Clientes');
  perform pg_temp.cr_reject('select * from public.client_responsibles()',array['42501'], 'sin perfil consulta directorio');
  perform pg_temp.cr_reject('insert into public.clientes(nombres,apellidos,correo,telefono)
    values (''Fixture'',''Prohibido'',''missing@example.invalid'',''999123456'')',array['42501'], 'sin perfil crea Cliente');
end $$;
reset role;

set local role anon;
do $$ begin
  perform pg_temp.cr_reject('select * from public.clientes',array['42501'], 'anon lee Clientes');
  perform pg_temp.cr_reject('select * from public.profiles',array['42501'], 'anon lee Profiles');
  perform pg_temp.cr_reject('update public.clientes set notas = ''No permitido'' where false',
    array['42501'], 'anon tiene UPDATE');
  perform pg_temp.cr_reject('select * from public.client_responsibles()',array['42501'], 'anon invoca directorio');
end $$;
reset role;

select pg_temp.cr_assert(not (select prosecdef from pg_proc
  where oid = 'public.client_responsibles(uuid)'::regprocedure), 'fachada publica es SECURITY INVOKER');
select pg_temp.cr_assert(not (select prosecdef from pg_proc
  where oid = 'public.convert_lead(uuid,text,text,uuid)'::regprocedure), 'convert_lead publico es SECURITY INVOKER');
select pg_temp.cr_assert(exists(select 1 from pg_constraint
  where conrelid = 'public.clientes'::regclass and confrelid = 'public.profiles'::regclass
    and conname = 'clientes_responsable_id_fkey' and convalidated
    and confupdtype = 'r' and confdeltype = 'r'), 'FK UUID validada con RESTRICT');

-- Inspeccion adicional de metadata del helper y guardia. El caso con una policy
-- restrictiva temporal esta preparado arriba; ninguno de los dos fue ejecutado.
select pg_temp.cr_assert(exists(select 1 from pg_proc
  where oid = 'nexo_private.client_profile_name(text)'::regprocedure
    and not prosecdef and proisstrict and provolatile = 'i'),
  'normalizador Unicode privado IMMUTABLE STRICT INVOKER');
select pg_temp.cr_assert(nexo_private.client_profile_name(U&'\00A0\FEFF\2003\202F\2007\3000') = ''
  and nexo_private.client_profile_name(U&'\00A0Nombre\FEFF') = 'Nombre',
  'normalizador comparte whitespace Unicode de String.trim');
select pg_temp.cr_assert(exists(select 1 from pg_proc
  where oid = 'nexo_private.assert_client_conversion_policy_baseline()'::regprocedure
    and not prosecdef and provolatile = 's')
  and not has_function_privilege('authenticated','nexo_private.assert_client_conversion_policy_baseline()','EXECUTE')
  and not has_function_privilege('anon','nexo_private.assert_client_conversion_policy_baseline()','EXECUTE'),
  'guardia privada estable sin invocacion por roles API');
select pg_temp.cr_assert(exists(select 1 from pg_class
  where oid = 'nexo_private.client_conversion_policy_baseline'::regclass
    and relrowsecurity and not relforcerowsecurity)
  and not has_table_privilege('authenticated','nexo_private.client_conversion_policy_baseline','SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('anon','nexo_private.client_conversion_policy_baseline','SELECT,INSERT,UPDATE,DELETE')
  and (select count(*) from pg_policy
    where polrelid = 'nexo_private.client_conversion_policy_baseline'::regclass) = 4
  and not exists(select 1 from nexo_private.client_conversion_policy_baseline),
  'referencia de policies vacia sin grants API');

-- Compara filas comerciales preexistentes completas, incluidas relaciones,
-- importes y fechas. No sustituye los tests funcionales/HTTP de cada modulo.
do $$
declare relation_name text; unchanged boolean;
begin
  foreach relation_name in array array['clientes','leads','oportunidades','ventas','venta_items','tareas'] loop
    execute format('select not exists (
      select 1 from pg_temp.cr_existing baseline left join public.%I current_row on current_row.id = baseline.id
      where baseline.relation = %L and (current_row.id is null or to_jsonb(current_row) <> baseline.snapshot))',
      relation_name,relation_name) into unchanged;
    perform pg_temp.cr_assert(unchanged, 'conservacion exacta de filas previas en ' || relation_name);
  end loop;
end $$;

rollback;
select 'Pruebas SQL completadas SOLO si no hubo errores anteriores; fixtures revertidas.' as resultado;

-- Pendiente con dos sesiones autorizadas: carreras asignacion vs desactivacion/
-- nombres incompletos (FOR SHARE vs UPDATE), dos convert_lead del mismo Lead o
-- correo, y UPDATE condicionado tras esperar el bloqueo. Esta suite secuencial
-- no demuestra esos casos MVCC ni verifica la API HTTP/PostgREST real.
