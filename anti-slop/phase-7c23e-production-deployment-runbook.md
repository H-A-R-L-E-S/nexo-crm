# Fase 7C.2.3E — runbook de despliegue productivo

Fecha de preparación: 28 de octubre de 2026 (America/Lima).

Estado: **plan final solamente**. No se conectó a producción, no se ejecutó SQL, no se enlazó el proyecto y no se activó el frontend.

## Propósito y regla de ejecución

Este runbook controla exclusivamente la expansión backend de responsables UUID. Cada bloque tiene un gate humano propio. Un resultado inesperado detiene la ventana: no se corrige producción improvisadamente, no se continúa al siguiente SQL y no se repite un archivo sin diagnóstico y nueva autorización.

Los archivos SQL funcionales son la fuente ejecutable. No se copia su contenido dentro de este runbook porque una tercera copia podría divergir. El operador debe abrir, verificar por hash y ejecutar **el archivo completo**, sin seleccionar fragmentos ni agregar sentencias.

## 1. Estado previo obligatorio

Antes de abrir la ventana deben cumplirse simultáneamente:

- commit candidato exacto: `29dbebfb937c2cb24dda2829389f94d2c232e678` (`Cierra preflight de produccion fase 7C.2.3D`);
- árbol de despliegue limpio y construido desde ese commit; cualquier commit posterior exige repetir hashes y revisar este runbook;
- `7C.2.3D PREFLIGHT PRODUCCIÓN = GO — MIGRACIÓN AÚN NO EJECUTADA`;
- `src/features/clients/responsibles-activation.ts` conserva `CLIENT_RESPONSIBLES_UUID_ENABLED = false`;
- frontend UUID cerrado: no consulta `responsable_id`, no llama al directorio nuevo y no escribe UUID;
- `public.clientes.responsable_id` ausente en el precheck inmediato;
- producción sigue en PostgreSQL 17.6 y el proyecto/destino coinciden con la evidencia aprobada en 7C.2.3D;
- backup/PITR y responsables de operación confirmados;
- snapshot histórico esperado:

```text
clientes_total = 1
clientes_history_fingerprint = ed21b427602e3b236b5a135c9d0b11ff
```

No iniciar si el commit, el flag, el destino o la huella no coinciden.

## 2. Artefactos exactos autorizables

| Orden | Archivo que se ejecutará íntegro | SHA-256 |
|---|---|---|
| SQL 1 | `supabase/client_responsibles.sql` | `F10C8821C67E744C253081BD4BE5C90DAF31F56898BDB169B904BFC38E89B747` |
| SQL 2 | `supabase/client_responsibles_directory.sql` | `F99DB55D7145F290252E19C2CA8E3E41E88CBC512C4A05071142F499F09D4ED0` |

Verificación local del 28 de octubre de 2026:

| Fuente | Migración | Resultado byte a byte | SHA-256 común |
|---|---|---|---|
| `client_responsibles.sql` | `migrations/20261027000800_client_responsibles.sql` | `fc /b`: sin diferencias | `F10C8821C67E744C253081BD4BE5C90DAF31F56898BDB169B904BFC38E89B747` |
| `client_responsibles_directory.sql` | `migrations/20261027000900_client_responsibles_directory.sql` | `fc /b`: sin diferencias | `F99DB55D7145F290252E19C2CA8E3E41E88CBC512C4A05071142F499F09D4ED0` |

Las migraciones 008/009 son artefactos equivalentes de trazabilidad, no archivos adicionales a ejecutar. Elegir una sola representación: este runbook autoriza los dos archivos fuente de la tabla, en ese orden.

### Prohibido durante esta ventana

- `supabase db push`, ejecución automática del directorio de migraciones o `supabase link`;
- migraciones 001–007;
- `schema.sql`, `seed.sql`, `auth_roles.sql`, `user_management.sql`, `leads.sql` u otros baseline históricos;
- `phase-7c23-client-responsibles.proposed.sql`;
- backfill, fixtures, creación de usuarios o inferencia por nombres;
- vincular a Ana García o cambiar su texto histórico;
- activar `CLIENT_RESPONSIBLES_UUID_ENABLED`;
- cualquier cambio fuera de 7C.2.3.

## 3. Secuencia operativa

### A. Precheck inmediato read-only

**Autorización:** permite inspección, no permite SQL 1.

Ejecutar exactamente en una sesión nueva del proyecto confirmado:

```sql
begin transaction read only;
set local statement_timeout = '30s';

select current_database(), current_user,
  current_setting('server_version') as server_version,
  current_setting('server_version_num') as server_version_num,
  pg_is_in_recovery() as is_replica;

select column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'clientes'
  and column_name in ('responsable', 'responsable_id', 'updated_at')
order by ordinal_position;

select c.relname, c.relrowsecurity, c.relforcerowsecurity,
  pg_get_userbyid(c.relowner) as owner
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('profiles', 'clientes', 'leads')
order by c.relname;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('profiles', 'clientes', 'leads')
order by tablename, cmd, policyname;

select grantee, table_schema, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('profiles', 'clientes', 'leads')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

select
  count(*) as clientes_total,
  md5(coalesce(string_agg(
    md5(id::text || ':' || encode(convert_to(responsable, 'UTF8'), 'hex') || ':' ||
        extract(epoch from updated_at)::text),
    '' order by id
  ), '')) as clientes_history_fingerprint
from public.clientes;

select count(*) as ana_historica_sin_uuid
from public.clientes
where responsable = 'Ana García';

select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef, p.proconfig, pg_get_userbyid(p.proowner) as owner, p.proacl,
  md5(pg_get_functiondef(p.oid)) as definition_md5
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where (n.nspname, p.proname) in (
  ('nexo_private', 'active_role'),
  ('public', 'convert_lead'),
  ('public', 'set_clientes_updated_at')
)
order by n.nspname, p.proname;

select to_regclass('nexo_private.client_conversion_policy_baseline') as unexpected_baseline,
  to_regclass('nexo_private.client_responsible_directory') as unexpected_directory,
  to_regprocedure('public.client_responsibles(uuid)') as unexpected_rpc;

rollback;
```

**Resultado esperado:** destino y versión aprobados; `responsable_id` ausente; RLS, policies, grants y funciones iguales al cierre 7C.2.3D; objetos nuevos ausentes; conteo `1`; huella `ed21b427602e3b236b5a135c9d0b11ff`.

**GO:** todos los resultados coinciden y el operador firma la autorización separada para SQL 1.

**ABORT:** destino dudoso, réplica, columna/objetos ya presentes, deriva de RLS/ACL/funciones, timeout, conteo o huella distintos.

**Evidencia:** CSV completo por consulta, captura del proyecto/branch, hora, identidad del operador, commit y hashes locales.

### B. Ejecución del primer SQL

**SQL exacto:** contenido íntegro de `supabase/client_responsibles.sql`, SHA-256 `F10C8821C67E744C253081BD4BE5C90DAF31F56898BDB169B904BFC38E89B747`. El archivo contiene su propio `BEGIN`, timeouts, guards y `COMMIT`. No envolverlo, fragmentarlo ni editarlo.

**Resultado esperado:** una transacción confirmada sin error; expansión estructural, controles de asignación y conversión instalados.

**GO:** el editor confirma finalización completa y COMMIT; después se pasa únicamente a C.

**ABORT:** cualquier error, timeout, sesión desconectada o resultado ambiguo. No ejecutar SQL 2. Confirmar mediante consultas read-only si la transacción revirtió y guardar el error completo.

**Evidencia:** archivo y SHA usados, log íntegro, inicio/fin, operador y transaction status.

### C. Verificación inmediata del primer SQL

```sql
begin transaction read only;
set local statement_timeout = '30s';

select column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'clientes'
  and column_name in ('responsable', 'responsable_id', 'updated_at')
order by ordinal_position;

select conname, convalidated, confupdtype, confdeltype,
  pg_get_constraintdef(oid, true) as definition
from pg_constraint
where conrelid = 'public.clientes'::regclass
  and conname = 'clientes_responsable_id_fkey';

select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'clientes'
  and indexname = 'clientes_responsable_id_idx';

select tgname, tgenabled, tgfoid::regprocedure as function_signature,
  pg_get_triggerdef(oid, true) as definition
from pg_trigger
where tgrelid = 'public.clientes'::regclass and not tgisinternal
order by tgname;

select c.relname, c.relrowsecurity, c.relforcerowsecurity,
  pg_get_userbyid(c.relowner) as owner
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('profiles', 'clientes', 'leads')
order by c.relname;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('profiles', 'clientes', 'leads')
order by tablename, cmd, policyname;

select grantee, table_schema, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('profiles', 'clientes', 'leads')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef, p.proconfig, pg_get_userbyid(p.proowner) as owner, p.proacl,
  md5(pg_get_functiondef(p.oid)) as definition_md5
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where (n.nspname, p.proname) in (
  ('nexo_private', 'client_profile_name'),
  ('nexo_private', 'assert_client_conversion_policy_baseline'),
  ('nexo_private', 'prepare_client_responsible'),
  ('nexo_private', 'convert_lead_to_client'),
  ('public', 'set_clientes_updated_at'),
  ('public', 'convert_lead')
)
order by n.nspname, p.proname;

select nexo_private.assert_client_conversion_policy_baseline();

select count(*) as clientes_con_uuid
from public.clientes where responsable_id is not null;

select count(*) as ana_historica_intacta
from public.clientes
where responsable = 'Ana García' and responsable_id is null;

select count(*) as clientes_total,
  md5(coalesce(string_agg(
    md5(id::text || ':' || encode(convert_to(responsable, 'UTF8'), 'hex') || ':' ||
        extract(epoch from updated_at)::text),
    '' order by id
  ), '')) as clientes_history_fingerprint
from public.clientes;

rollback;
```

**Resultado esperado:**

- `responsable_id`: `uuid`, nullable, sin default;
- FK validada a `public.profiles(id)`, `ON UPDATE/DELETE NO ACTION`;
- índice parcial `clientes_responsable_id_idx` con `WHERE responsable_id IS NOT NULL`;
- triggers `clientes_updated_at` y `clientes_prepare_responsible` habilitados;
- RLS/FORCE RLS, policies y grants comerciales sin deriva respecto al precheck;
- `convert_lead` es el wrapper público `SECURITY INVOKER`, `search_path=''`, con EXECUTE para `authenticated` y no para `anon`/`PUBLIC`; núcleo privado `SECURITY DEFINER` con ACL mínima;
- guard de policies sin error;
- `clientes_con_uuid = 0`, Ana García conserva texto y UUID NULL;
- conteo `1` y fingerprint exacto aprobado.

**GO:** todo coincide, la comparación de CSV pre/post no muestra cambios no previstos y una persona distinta o revisora autoriza SQL 2.

**ABORT:** falta/duplicidad de objetos, FK/índice/trigger distintos, deriva RLS/ACL, UUID inesperado, cambio histórico o guard con error. Mantener frontend apagado y no ejecutar SQL 2.

**Evidencia:** CSV, definiciones/hash de funciones, diff de policies/grants, fingerprint y log firmado de revisión.

### D. Ejecución del segundo SQL

**SQL exacto:** contenido íntegro de `supabase/client_responsibles_directory.sql`, SHA-256 `F99DB55D7145F290252E19C2CA8E3E41E88CBC512C4A05071142F499F09D4ED0`. Contiene su propio `BEGIN`, guards, timeouts y `COMMIT`. No editar ni fragmentar.

**Resultado esperado:** helper privado, vista mínima y RPC pública de directorio instalados sin alterar policies/grants de tablas comerciales.

**GO:** ejecución completa confirmada; pasar únicamente a E.

**ABORT:** cualquier error o ambigüedad. Conservar el estado seguro de SQL 1, mantener frontend apagado y no improvisar DDL de reversión.

**Evidencia:** archivo/hash, log íntegro, operador, inicio/fin y transaction status.

### E. Verificación inmediata del segundo SQL

```sql
begin transaction read only;
set local statement_timeout = '30s';

select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef, p.provolatile, p.proconfig,
  pg_get_userbyid(p.proowner) as owner, p.proacl,
  md5(pg_get_functiondef(p.oid)) as definition_md5
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where (n.nspname = 'public' and p.proname = 'client_responsibles')
   or (n.nspname = 'nexo_private'
       and p.proname = 'client_responsible_has_visible_client')
order by n.nspname, p.proname;

select n.nspname, c.relname, c.relkind, c.reloptions,
  pg_get_userbyid(c.relowner) as owner, c.relacl,
  pg_get_viewdef(c.oid, true) as definition
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'nexo_private'
  and c.relname = 'client_responsible_directory';

select has_function_privilege('anon', 'public.client_responsibles(uuid)', 'EXECUTE')
    as anon_rpc_execute,
  has_function_privilege('authenticated', 'public.client_responsibles(uuid)', 'EXECUTE')
    as authenticated_rpc_execute,
  has_function_privilege('anon',
    'nexo_private.client_responsible_has_visible_client(uuid)', 'EXECUTE')
    as anon_helper_execute,
  has_function_privilege('authenticated',
    'nexo_private.client_responsible_has_visible_client(uuid)', 'EXECUTE')
    as authenticated_helper_execute;

select has_table_privilege('anon',
    'nexo_private.client_responsible_directory', 'SELECT') as anon_view_select,
  has_table_privilege('authenticated',
    'nexo_private.client_responsible_directory', 'SELECT') as authenticated_view_select;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('profiles', 'clientes', 'leads')
order by tablename, cmd, policyname;

select grantee, table_schema, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('profiles', 'clientes', 'leads')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

rollback;
```

Comprobar además en Dashboard → API/Data API que los esquemas expuestos siguen siendo `public` y `graphql_public`; `nexo_private` no debe aparecer.

**Resultado esperado:**

- `public.client_responsibles(uuid)`: `SECURITY INVOKER`, `STABLE`, `search_path=''`, `row_security=on`, owner `postgres`, EXECUTE solo efectivo para `authenticated` y owner;
- `nexo_private.client_responsible_has_visible_client(uuid)`: `SECURITY INVOKER`, `STABLE`, mismos parámetros seguros, owner `postgres`, EXECUTE mínimo para `authenticated` y owner;
- vista privada owner `postgres`, `security_barrier=true`, `security_invoker=false`, SELECT solo para `authenticated` y owner;
- `anon_rpc_execute`, `anon_helper_execute` y `anon_view_select` son `false`;
- valores `authenticated_*` previstos son `true`;
- ninguna deriva en policies o grants base;
- `nexo_private` no expuesto por PostgREST.

**GO:** todos los metadatos, ACL y exposición coinciden.

**ABORT:** `SECURITY DEFINER` inesperado, owner distinto, `search_path` inseguro, grant a `anon`/`PUBLIC`, esquema privado expuesto o deriva comercial.

**Evidencia:** CSV, definición de vista/funciones, captura de esquemas expuestos y diff de ACL/policies.

### F. Smoke tests read-only

No crear sesiones, usuarios ni datos. Con cuentas productivas existentes y autorización expresa:

```http
POST /rest/v1/rpc/client_responsibles
Authorization: Bearer <token-productivo-existente-autorizado>
Content-Type: application/json

{"p_client_id":null}
```

Ejecutar separadamente para Administrador, Gerente y Vendedor activos. Confirmar campos mínimos (`id`, `nombres`, `apellidos`, `activo`, `rol`, `can_assign`) y reglas de elegibilidad. Para usuario inactivo esperar denegación. Sin token/anon esperar denegación. Una petición directa a un objeto `nexo_private` debe devolver no encontrado/no expuesto.

**GO:** resultados coherentes con roles y sin datos privados adicionales; cero escrituras.

**ABORT:** anon/inactivo obtiene filas, Vendedor puede asignar otros usuarios, aparecen campos privados, `nexo_private` es accesible o hay errores no explicados.

**Evidencia:** solicitudes con tokens redactados, status, cuerpo redactado, request ID y hora. No guardar JWT.

### G. Fingerprint histórico final

Ejecutar la misma consulta usada antes de la ventana, sin cambios:

```sql
begin transaction read only;
set local statement_timeout = '30s';

select
  count(*) as clientes_total,
  md5(coalesce(string_agg(
    md5(
      id::text || ':' ||
      encode(convert_to(responsable, 'UTF8'), 'hex') || ':' ||
      extract(epoch from updated_at)::text
    ),
    '' order by id
  ), '')) as clientes_history_fingerprint
from public.clientes;

select count(*) as clientes_con_uuid
from public.clientes where responsable_id is not null;

select count(*) as ana_historica_intacta
from public.clientes
where responsable = 'Ana García' and responsable_id is null;

rollback;
```

**Resultado exigido:** `clientes_total = 1`, fingerprint `ed21b427602e3b236b5a135c9d0b11ff`, `clientes_con_uuid = 0` y Ana García intacta.

**GO:** coincidencia exacta.

**ABORT / incidente:** cualquier diferencia inexplicada. Congelar la ventana, preservar logs, mantener frontend apagado y escalar; no “reparar” la huella escribiendo datos.

**Evidencia:** CSV pre/post unidos al mismo ticket y firma del revisor.

### H. Cierre backend

No ejecutar SQL adicional. Registrar:

- SQL 1 y SQL 2 confirmados;
- verificaciones C/E y smokes read-only aprobados;
- fingerprint intacto;
- `CLIENT_RESPONSIBLES_UUID_ENABLED = false` confirmado en el artefacto frontend desplegado;
- frontend y escrituras UUID aún desactivados;
- período de observación y responsable de alertas;
- decisión de cierre backend separada de cualquier activación futura.

La activación del frontend requiere una fase y aprobación independientes. Este runbook no la autoriza.

## 4. Rollback compatible expand/contract

### Error dentro de SQL 1 o SQL 2

Ambos archivos son transaccionales. Si la transacción falla, conservar el error y comprobar el estado con consultas read-only. No emitir DDL compensatorio ni reintentar automáticamente. Si la sesión queda en transacción abortada, finalizar esa transacción conforme al procedimiento del operador; no continuar al siguiente archivo.

### SQL 1 confirmado y SQL 2 falla

Este es un estado intermedio seguro y soportado:

- conservar `responsable_id`, FK, índice, triggers y controles de conversión;
- mantener `CLIENT_RESPONSIBLES_UUID_ENABLED = false`;
- no existe directorio/RPC operativo nuevo para la UI;
- comprobar que todos los históricos siguen con UUID NULL y fingerprint intacto;
- corregir SQL 2 hacia adelante, ensayarlo y solicitar una nueva autorización antes de reintentar;
- no eliminar la columna ni debilitar el trigger para “volver” al baseline.

### Incidente después de ambos SQL, sin frontend activo

La primera respuesta es cerrar capacidad, no borrar datos:

1. mantener el flag en `false`;
2. suspender temporalmente las operaciones afectadas si es necesario;
3. conservar columna, FK, índice y trigger de integridad;
4. con aprobación específica, revocar temporalmente EXECUTE del RPC/directorio afectado;
5. si el incidente es `convert_lead`, restaurar únicamente la definición y ACL preflight exportada en 7C.2.3D, después de ensayo y autorización; nunca ejecutar `leads.sql` completo;
6. corregir hacia adelante y repetir verificaciones.

### Acciones que requieren decisión humana independiente

- cualquier `REVOKE`, restauración de función o cambio de disponibilidad;
- restaurar desde backup/PITR, porque puede sobrescribir trabajo posterior;
- eliminar objetos del directorio;
- cualquier contract futuro del campo textual;
- cualquier acción sobre UUID que ya pudiera haberse escrito.

No se propone ni autoriza `DROP COLUMN responsable_id`, borrado de FK/índice, vaciado de UUID, regeneración de texto desde UUID o backfill por nombre. El rollback conserva ambos contratos y toda la historia.

## 5. Evidencia mínima del paquete de despliegue

Guardar en un repositorio de evidencias aprobado, sin secretos:

1. commit exacto y árbol limpio del artefacto;
2. SHA-256 de ambos SQL;
3. salida completa del precheck inmediato;
4. autorización nominal y timestamp de cada SQL;
5. logs completos de ejecución;
6. CSV de verificaciones C y E;
7. captura de esquemas Data API;
8. smokes con tokens y datos sensibles redactados;
9. fingerprint pre/post;
10. cierre que confirme frontend desactivado.

## CHECKLIST HUMANO DE AUTORIZACIÓN

Cada casilla requiere nombre, fecha/hora y referencia de evidencia. Las autorizaciones para SQL 1 y SQL 2 son independientes.

- [ ] Backup/PITR disponible y restauración conocida.
- [ ] Ventana de mantenimiento y observación aprobada.
- [ ] Proyecto, organización, branch y región correctos confirmados.
- [ ] Commit `29dbebfb937c2cb24dda2829389f94d2c232e678` confirmado.
- [ ] Hash SQL 1 `F10C8821C67E744C253081BD4BE5C90DAF31F56898BDB169B904BFC38E89B747` confirmado.
- [ ] Hash SQL 2 `F99DB55D7145F290252E19C2CA8E3E41E88CBC512C4A05071142F499F09D4ED0` confirmado.
- [ ] Preflight inmediato read-only limpio, columna ausente y fingerprint aprobado.
- [ ] Autorización humana explícita para ejecutar SQL 1.
- [ ] Verificación posterior de SQL 1 aprobada y evidencia guardada.
- [ ] Autorización humana explícita para ejecutar SQL 2.
- [ ] Verificación posterior de SQL 2 aprobada y evidencia guardada.
- [ ] Smokes read-only por rol y anon aprobados.
- [ ] Fingerprint final: total `1` y `ed21b427602e3b236b5a135c9d0b11ff`.
- [ ] Ana García conserva texto histórico y `responsable_id = NULL`.
- [ ] Cierre backend firmado sin activar frontend ni escrituras UUID.

## Resultado de preparación

Runbook preparado estáticamente desde el baseline y la evidencia aprobada de 7C.2.3A/B/C/D. No acredita una ejecución productiva. La migración, los smokes productivos y las aprobaciones humanas permanecen pendientes.
