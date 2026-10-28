# Fase 7C.2.3C — pruebas PostgreSQL y RLS en entorno aislado

Fecha de ejecución: 27 de octubre de 2026 (America/Lima).

## Conclusión

**7C.2.3C VALIDADA Y LISTA PARA REVISIÓN PREVIA A 7C.2.3D.**

La migración funcional, el directorio mínimo y la suite específica finalizaron sin errores tanto en PostgreSQL aislado como en una pila Supabase local real. Las pruebas pendientes de PostgREST, GoTrue/Auth y concurrencia MVCC se ejecutaron con datos sintéticos, URLs loopback y proyecto no vinculado. Esta conclusión habilita revisión; no autoriza despliegue ni inicia 7C.2.3D.

### Revisión de cierre del 27 de octubre de 2026

La infraestructura cambió después del bloqueo anterior y se volvió a auditar sin conectarse a ningún servicio remoto:

- Docker Desktop 29.9.2 con servidor Linux local: disponible;
- Supabase CLI 2.122.0: ejecutado mediante `npx --yes supabase@2.122.0`;
- `supabase/config.toml`: presente, `project_id = "nexo-crm"`;
- `supabase/.temp/project-ref`: inexistente (`Not linked`);
- PostgreSQL, Kong/PostgREST, GoTrue/Auth, Studio y Mailpit locales: saludables durante las pruebas;
- URL API/REST/Auth: `http://127.0.0.1:54321`;
- PostgreSQL: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`;
- Studio: `http://127.0.0.1:54323`;
- Mailpit: `http://127.0.0.1:54324`.

La URL remota y las claves presentes en `.env.local` no se usaron ni se probaron. Todas las claves de API fueron obtenidas dinámicamente de `supabase status` y pertenecían a la pila local. No se ejecutó `supabase link`, `db push`, `db pull --linked` ni tráfico HTTP contra un endpoint remoto.

## 1. Entorno aislado utilizado

- PostgreSQL 17.11 local, inicializado desde cero con `initdb`.
- Base: `nexo_phase_7c23c`.
- Escucha: exclusivamente `127.0.0.1:55432`.
- Directorio efímero: `.tmp/phase-7c23c-postgres` dentro del workspace.
- Roles locales de prueba: `anon`, `authenticated` y `service_role`; este último no se usó para simular operaciones de la aplicación.
- Bootstrap Supabase mínimo: `auth.users`, `auth.jwt()`, `auth.uid()` y `auth.role()` en [phase-7c23c-local-supabase-bootstrap.sql](sql/phase-7c23c-local-supabase-bootstrap.sql).
- Cinco identidades exclusivamente locales con correos `example.invalid`: Administrador, Gerente, Vendedor, Vendedor inactivo y Vendedor activo incompleto. Administrador y Gerente compartieron el nombre `Alex Rivera` pero conservaron UUID distintos.

La validación ampliada utilizó además la pila Supabase CLI real descrita arriba. GoTrue creó los usuarios y emitió sus tokens; no se ejecutó el bootstrap de simulación sobre esa pila.

El clúster se detuvo y eliminó al terminar. No se modificó `.env.local`, no se llamó al host remoto configurado allí y no se utilizó ninguna clave de producción.

## 2. Evidencia de que no era producción

Antes de escribir se comprobó que el directorio de destino no existía y que el puerto 55432 estaba libre. Después de iniciar el servidor, PostgreSQL devolvió:

```text
current_database = nexo_phase_7c23c
inet_server_addr = 127.0.0.1
inet_server_port = 55432
data_directory = C:/Users/Usuario/Downloads/nexo-crm/.tmp/phase-7c23c-postgres
```

La instancia PostgreSQL ya instalada en el equipo usa otro directorio y el puerto 5432; no se conectó ni se escribió en ella. La afirmación histórica de que Docker/Supabase CLI no estaban disponibles quedó superada por la validación ampliada. El proyecto local continuó sin `project-ref` y todas las operaciones usaron loopback.

## 3. SQL realmente ejecutado

En la base efímera, en este orden:

1. Bootstrap local mínimo de Supabase Auth.
2. Baseline nuevo: `schema.sql`, `auth_roles.sql`, `user_management.sql`, `leads.sql`, `opportunities.sql`, `sales.sql` y `tasks.sql`.
3. Preflight de solo lectura sobre columnas, RLS y ACL.
4. [client_responsibles.sql](../supabase/client_responsibles.sql).
5. [client_responsibles_directory.sql](../supabase/client_responsibles_directory.sql).
6. Inserción de las cinco identidades locales de prueba.
7. [tests/client_responsibles.sql](../supabase/tests/client_responsibles.sql), dentro de su transacción con `ROLLBACK`.
8. Regresiones SQL `tests/auth_roles.sql`, `tests/user_management.sql` y `tests/leads.sql`, también con `ROLLBACK`.
9. Dos sesiones concurrentes para una actualización condicionada por el mismo `updated_at`; la fixture se eliminó al terminar.

No se ejecutó `anti-slop/sql/phase-7c23-client-responsibles.proposed.sql`: es la propuesta estructural anterior y el SQL funcional indica expresamente que la sustituye.

En la pila Supabase real local se ejecutaron estos comandos:

```text
npx --yes supabase@2.122.0 start
npx --yes supabase@2.122.0 status -o json
node tests/supabase-local-client-responsibles.mjs
npx --yes supabase@2.122.0 db reset --local
node tests/supabase-local-client-responsibles.mjs
npx --yes supabase@2.122.0 stop
```

El baseline se organizó como nueve migraciones en `supabase/migrations`, desde `20261027000100_schema.sql` hasta `20261027000900_client_responsibles_directory.sql`. Cada migración fue una copia byte a byte de su SQL versionado correspondiente y sus hashes se compararon con resultado `MATCH=True`. `seed.sql` se ejecutó después de las nueve migraciones. El bootstrap `phase-7c23c-local-supabase-bootstrap.sql` **no** se ejecutó sobre Supabase local real.

Hashes SHA-256 de los artefactos ejecutados de esta fase:

```text
supabase/client_responsibles.sql
F10C8821C67E744C253081BD4BE5C90DAF31F56898BDB169B904BFC38E89B747

supabase/client_responsibles_directory.sql
F99DB55D7145F290252E19C2CA8E3E41E88CBC512C4A05071142F499F09D4ED0

supabase/tests/client_responsibles.sql
17051D444B0B55D118C3AB306797C6D85468DC000CBC593D2EC3E4BF637FBAC2

anti-slop/sql/phase-7c23c-local-supabase-bootstrap.sql
CDF0724FE155231AC2A6B3FFF33ED59DC52996CFE969F38EF383E8C3A923B56A
```

## 4. Pruebas realizadas

### PostgreSQL, integridad y autorización

La suite específica terminó con código 0 y `ROLLBACK`. Comprobó realmente:

- columna `clientes.responsable_id UUID NULL`;
- FK validada a `profiles.id`, con `ON UPDATE RESTRICT` y `ON DELETE RESTRICT`;
- índice parcial `clientes_responsable_id_idx`;
- alta y cambio válido para Administrador y Gerente;
- Vendedor limitado a su propio UUID y sin apropiarse de históricos;
- rechazo de UUID inexistente, malformado, inactivo e incompleto;
- nombres duplicados resueltos por UUID;
- perfiles incompletos, nombres con whitespace Unicode e inactivos;
- directorio mínimo sin correo ni ampliación del `SELECT` sobre Profiles;
- sesiones inactiva, anónima y autenticada sin perfil válido;
- acceso SQL directo, además del contrato de interfaz;
- conservación de referencias históricas al editar otros campos;
- `Ana García` byte a byte, con `responsable_id = NULL`, sin vinculación automática;
- `convert_lead` para responsable válido, inactivo e incompleto, idempotencia y vínculo confirmado;
- policies restrictivas temporales para comprobar que RPC y núcleo privado respetan visibilidad RLS;
- propietarios, `SECURITY INVOKER`/`SECURITY DEFINER`, grants y exposición de funciones;
- token `updated_at` obsoleto en la suite secuencial.

La prueba adicional multisesión usó dos conexiones con el mismo token `updated_at`: sesión A obtuvo `UPDATE 1`, sesión B esperó el bloqueo y obtuvo `UPDATE 0`; el valor final fue `sesion-a`.

### Supabase Auth y PostgREST reales locales

[supabase-local-client-responsibles.mjs](../tests/supabase-local-client-responsibles.mjs) se ejecutó dos veces con código 0: antes y después de `supabase db reset --local`. Cada ejecución aprobó 17/17 grupos:

- health real de PostgREST, GoTrue y Studio;
- creación y login real por GoTrue de Administrador, Gerente, Vendedor, inactivo e incompleto;
- llamadas HTTP directas con `apikey`/Bearer, sin pasar por la interfaz;
- rechazo anónimo y RLS vacío para el perfil inactivo;
- directorio con homónimos diferenciados por UUID y perfil incompleto no asignable;
- asignación válida de Administrador/Gerente y autoasignación explícita de Vendedor;
- rechazo de UUID inexistente, malformado, inactivo, incompleto y ajeno al Vendedor;
- conservación de `Ana García` con UUID NULL al editar por API;
- históricos inactivo e incompleto visibles en contexto, pero no asignables;
- Lead → Cliente por RPC HTTP e idempotencia;
- `nexo_private.client_responsible_directory` y su helper no expuestos por PostgREST (`404`);
- dos conversiones HTTP simultáneas del mismo lead: `creado` + `ya_convertido`, mismo cliente;
- dos conversiones HTTP simultáneas con el mismo correo: `creado` + `requiere_vinculo`, sin duplicado;
- asignación concurrente contra desactivación y contra nombre incompleto: la petición esperó el lock y fue rechazada tras releer el perfil.

La suite obtuvo claves exclusivamente desde `supabase status`, validó host y puertos loopback antes de operar, usó correos `example.invalid` y eliminó usuarios, clientes y leads sintéticos al finalizar. La comprobación final mostró 0 usuarios de prueba, 0 perfiles, 0 leads, las 5 filas históricas del seed con UUID NULL y el trigger `clientes_prepare_responsible` habilitado.

### Regresiones SQL

- `supabase/tests/auth_roles.sql`: PASS; datos revertidos.
- `supabase/tests/user_management.sql`: PASS; datos revertidos.
- `supabase/tests/leads.sql`: PASS después de actualizar su expectativa de denegación; datos revertidos.

### Regresiones de aplicación

- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run build`: PASS.
- `npm run test:unit`: PASS, 62/62.
- `npx playwright test tests/client-responsibles-ui.spec.ts`: PASS, 21/21. El primer intento de esta ampliación encontró el puerto 54321 ocupado por Kong local; aprobó después de detener Supabase local de forma controlada.

Al finalizar las suites transaccionales había 0 clientes y 0 leads. Permanecían solo las cinco identidades de infraestructura local hasta destruir el clúster.

## 5. Resultados PASS/FAIL

| Comprobación | Resultado final | Evidencia |
|---|---:|---|
| Aislamiento técnico | PASS | loopback, puerto dedicado, directorio nuevo y base nueva |
| Preflight | PASS | contrato previo, RLS y ACL esperados |
| Migración funcional | PASS | transacción completa, FK e índice validados |
| Directorio mínimo | PASS | funciones/vista instaladas y suite RLS aprobada |
| Administrador/Gerente/Vendedor | PASS | tokens emitidos por GoTrue y llamadas PostgREST reales |
| Inactivo/anon/sin perfil | PASS | RLS y RPC comprobados por HTTP |
| Históricos/Ana García | PASS | texto exacto y UUID NULL comprobados por HTTP |
| Lead → Cliente | PASS | RPC HTTP, idempotencia y concurrencia |
| Concurrencia `updated_at` | PASS | dos sesiones: `UPDATE 1` y `UPDATE 0` |
| Auth/Usuarios/Leads SQL | PASS | tres scripts completos con rollback |
| Lint/typecheck/build | PASS | códigos finales 0 |
| Unitarias | PASS | 62/62 |
| Playwright específico | PASS | 21/21 |
| PostgREST HTTP | PASS | suite 17/17 ejecutada dos veces |
| Supabase Auth real | PASS | signup/signin local de cinco actores mediante GoTrue |
| Bypass de interfaz mediante API | PASS | peticiones REST/RPC directas con Bearer |
| `nexo_private` no expuesto | PASS | tabla/vista y RPC privada respondieron 404 |
| Carreras MVCC adicionales | PASS | perfil/asignación y dos variantes de conversión concurrente |
| Reconstrucción reproducible | PASS | `db reset --local`, 9 migraciones, seed y segunda suite 17/17 |

## 6. Problemas encontrados

1. El bootstrap local inicial no incluía `auth.role()`. La primera ejecución de la suite se abortó con error antes de persistir fixtures.
2. La regresión antigua de Leads solo aceptaba SQLSTATE `42501` para un usuario inactivo. El nuevo wrapper, sin filtrar existencia, también puede responder `P0002` cuando el lead no es visible. La suite específica ya reconocía ambas denegaciones; se alineó la regresión.
3. Build y Playwright encontraron inicialmente `spawn EPERM` por el sandbox. Ambos aprobaron al repetirse con permiso de creación de procesos.
4. PowerShell no transmitió correctamente dos literales acentuados usados en comandos ad hoc. No afectó scripts SQL UTF-8 ni las aserciones de `Ana García`; las comprobaciones relevantes se ejecutaron desde el archivo SQL.
5. El primer `supabase start` aplicó el seed antes de que existiera una migración de esquema. Se añadieron migraciones locales ordenadas.
6. `ON CONFLICT (correo)` del seed no coincidía con el índice único por `lower(correo)`; se cambió a `ON CONFLICT DO NOTHING`.
7. El trigger final exige Auth incluso para insertar históricos UUID NULL. El seed local suspende únicamente ese trigger dentro de una transacción y lo reactiva antes del commit.
8. La primera ejecución HTTP aprobó 17/17, pero su limpieza terminó no-cero al restaurar una nota histórica sin JWT. Se corrigió la limpieza, se eliminaron exactamente los cinco usuarios residuales y las dos ejecuciones posteriores terminaron con código 0.
9. Playwright y Kong local usan el puerto 54321. Se detuvo Supabase local antes de la regresión UI; 21/21 aprobaron.

## 7. Correcciones aplicadas localmente

- Se creó y completó `anti-slop/sql/phase-7c23c-local-supabase-bootstrap.sql` con `auth.role()`. Es infraestructura de prueba, no migración de producción.
- Se actualizó `supabase/tests/leads.sql` para aceptar `insufficient_privilege` o `no_data_found` como rechazo seguro del usuario inactivo.
- Se añadieron nueve migraciones locales ordenadas, idénticas a los SQL versionados.
- Se corrigió `supabase/seed.sql` para ser idempotente con el índice por correo normalizado y para insertar históricos locales dentro de una suspensión transaccional del trigger de Auth.
- Se añadió `tests/supabase-local-client-responsibles.mjs` con guardas loopback, GoTrue/PostgREST reales, carreras y limpieza.
- No se modificaron Auth, RLS, roles ni datos de producción.

## 8. Pruebas pendientes

No quedan pruebas obligatorias pendientes dentro del alcance local de 7C.2.3C. Un ensayo posterior sobre staging administrado y una comparación de catálogo de producción en solo lectura siguen siendo controles recomendados antes de desplegar, no PASS reclamados por este informe.

## 9. Riesgos antes de producción

- Deriva entre el catálogo real y los SQL versionados: owners, policies, grants, triggers o firmas podrían hacer fallar correctamente el preflight funcional.
- Diferencias futuras entre las versiones locales de Supabase y el proyecto administrado.
- `nexo_private` no estuvo expuesto localmente; debe volver a comprobarse si cambia `config.toml` o la configuración de esquemas expuestos.
- Activar la interfaz antes de instalar y verificar columna, funciones y caché de esquema produciría errores o contratos parciales.
- La migración funcional no debe combinarse con la propuesta estructural antigua.
- Docker Desktop publicó puertos locales sobre interfaces del host, aunque todas las URLs y peticiones de esta fase usaron `127.0.0.1`; deben mantenerse protegidos por el firewall del equipo durante desarrollo.

## 10. Condiciones para autorizar la Fase 7C.2.3D

Antes de iniciar 7C.2.3D se requiere autorización expresa y, como mínimo:

1. Revisar y aprobar este informe, los dos SQL funcionales y la corrección de la prueba de Leads.
2. Revisar los cambios locales de migraciones, seed y suite HTTP y decidir su incorporación.
3. Comparar el catálogo de producción en modo de solo lectura antes de cualquier ventana: extensiones, owners, policies, grants, triggers y definiciones de funciones.
4. Mantener `responsable_id` deshabilitado en el frontend hasta que el despliegue backend y sus verificaciones finalicen.
5. Preparar staging administrado, ventana, observabilidad, backups y rollback compatible que conserve tanto `responsable` como cualquier UUID ya escrito.

No se autoriza por este informe ninguna ejecución en producción ni el inicio automático de la Fase 7C.2.3D.

### Estado de la infraestructura local

La infraestructura que faltaba quedó disponible y fue validada. La pila se detuvo con backup local al finalizar. Puede recrearse con `npx --yes supabase@2.122.0 start` o reconstruirse con `db reset --local`; continúa sin vínculo remoto.

## Estado de Git

El worktree continúa sucio con cambios preexistentes de 7C.2.3A/7C.2.3B y los artefactos de esta fase. No se descartó, sobrescribió, añadió al índice, confirmó ni publicó ningún cambio. No hubo commit ni push.
