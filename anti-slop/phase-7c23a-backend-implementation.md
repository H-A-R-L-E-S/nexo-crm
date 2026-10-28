# Nexo CRM: base local para responsables UUID, Fase 7C.2.3A

Elaboración: 2026-10-22. Cierre: 2026-10-23, America/Lima.

Estado: Fase 7C.2.3A completa dentro de su alcance local autorizado. Contratos, servicios, SQL funcional y pruebas preparados; comprobaciones locales aprobadas. El SQL no se ha ejecutado ni validado en PostgreSQL. Las pantallas de Clientes conservan su flujo actual y la Fase 7C.2.3B no se ha iniciado.

## 1. Alcance y estado de Git

Se inspeccionó Git antes de editar. Ya existían modificaciones en las tres capturas de `anti-slop/users-evidence/` y archivos sin seguimiento correspondientes al informe/SQL de 7C.2.3, `anti-slop/settings-evidence/`, `tatus` y un archivo cuyo nombre comienza por `e 5A rediseño premium`. Se conservaron; no se limpiaron ni incluyeron en un commit.

Esta etapa prepara el backend para la fase visual posterior. No modifica formularios, vistas, rutas ni Provider de Clientes. No despliega servicios, no abre conexiones a una base, no modifica `.env.local`, Auth, los tres roles o datos de producción. No crea cuentas ni perfiles. No se realizó commit ni push.

Las afirmaciones sobre el esquema real siguen procediendo del usuario. El código SQL fue contrastado estáticamente con los archivos del repositorio; no se presenta como aprobado en PostgreSQL real.

## 2. Archivos preparados

| Archivo | Cambio y propósito |
| --- | --- |
| `src/features/clients/types.ts` | `owner` conserva texto histórico; `ownerId` es UUID nullable. Añade contratos separados para contacto, alta vinculada, actor y DTO mínimo de responsables. El `ClientInput` antiguo permanece por compatibilidad con las pantallas actuales. |
| `src/lib/supabase/database.types.ts` | Añade `ClientRow.responsable_id`, firma de `client_responsibles` y `ClientReadRow` para leer respuestas anteriores a la expansión. INSERT admite omitir campos con default, sin inventar un UUID. |
| `src/features/clients/client-mapping.ts` | Mapper compartido: un campo UUID ausente se interpreta como NULL; preserva exactamente `responsable` y los timestamps. No resuelve personas por nombre. |
| `src/features/clients/services/clients.service.ts` | Reutiliza el mapper dual. Sus rutas de escritura antiguas no se activan como implementación UUID ni se presentan como protegidas por concurrencia. |
| `src/features/clients/responsible-contract.ts` | Validación explícita de UUID, elegibilidad y matriz de asignación. No importa `OWNERS`. Estas comprobaciones anticipan errores; la autorización definitiva se prepara en SQL. |
| `src/features/clients/client-write.ts` | Allowlist de cambios de contacto, asignación separada, versión original obligatoria, puerto de actualización condicionado y error de conflicto sin reintento ciego. |
| `src/features/clients/services/client-responsibles.service.ts` | Nueva API de sesión para directorio, alta con UUID y actualización condicionada por `id` y `updated_at`. Verifica identidad con Auth y perfil propio; no usa cliente administrativo ni `service_role`. No está conectada a las pantallas. |
| `src/features/clients/demo-data.ts` | Solo adapta los tipos de fixtures existentes y añade `ownerId: null`; no añade identidades ni vínculos. Los nuevos servicios no importan esos datos. |
| `supabase/client_responsibles.sql` | SQL funcional completo de expansión, integridad, control de versiones y adaptación de conversión. Preparado, no ejecutado. Sustituye al SQL estructural anterior; no deben ejecutarse ambos. |
| `supabase/client_responsibles_directory.sql` | Directorio mínimo mediante vista privada con barrera de seguridad y RPC pública invocadora. Preparado, no ejecutado. Requiere el SQL anterior. |
| `supabase/tests/client_responsibles.sql` | Pruebas SQL para una base local aislada autorizada, con perfiles existentes suministrados por el operador. Escribe fixtures y termina con rollback; no se ha ejecutado. |
| `tests/unit/client-responsibles.test.mjs` | Pruebas de reglas, preservación, allowlist, UUID y concurrencia mediante un puerto en memoria, sin red ni cuentas Auth. |
| `package.json`, `tsconfig.json`, `playwright.config.ts` | Añaden `test:unit`, imports TypeScript explícitos para Node y exclusión de las pruebas unitarias de la búsqueda de Playwright. No se instalaron dependencias. |

El SQL está fuera de `supabase/migrations` y no hay un script que lo ejecute. Conservar la propuesta anterior como antecedente no implica aplicarla junto con el SQL funcional nuevo.

## 3. Contrato dual y autorización

| Situación | Regla preparada |
| --- | --- |
| Alta vinculada por Administrador/Gerente | UUID elegido expresamente, perfil existente, activo, rol válido y nombres/apellidos completos. |
| Alta vinculada por Vendedor | Solo su propio UUID, con elección expresa y perfil completo. Nunca se asigna al actor por defecto. |
| Reasignación o vinculación de un legado | Solo Administrador/Gerente. Vendedor no puede cambiar un UUID, tampoco de NULL a sí mismo. |
| Vaciar un UUID vinculado | Rechazado. |
| Editar contacto sin cambiar UUID | Conserva vínculos inactivos, incompletos y legados NULL. No exige reasignarlos. |
| Texto histórico existente | Inmutable en UPDATE, incluso en una reasignación. El trigger compara con colación C para conservar el contenido exacto. |
| Texto inicial de alta vinculada | Se obtiene del perfil validado en la misma transacción; no se confía en el nombre enviado por navegador. |

La autorización SQL deriva del JWT y el perfil existente. Rechaza actores sin perfil, inactivos, con rol inválido o sesión anónima. Bloquea actor/destino con `FOR SHARE` en orden estable y vuelve a leerlos antes de asignar, para serializarse con cambios de nombre, rol o actividad.

La validación de nombre usa un conjunto explícito de espacios Unicode equivalente al `trim()` de JavaScript. Así no depende de diferencias de `LC_CTYPE` para aceptar un perfil compuesto solo por tabulaciones, NBSP o BOM. El helper recibe texto y devuelve texto; no lee tablas ni tiene privilegios elevados.

`responsable_id` sigue nullable, sin default ni backfill, con FK e índice y acciones RESTRICT. El caso de producción Ana García no se busca ni modifica: su texto y UUID NULL permanecen. Solo los fixtures en memoria y el SQL de pruebas no ejecutado representan ese caso para comprobar conservación.

**Límite transitorio deliberado:** la integridad permite INSERT con UUID NULL para escritores legados y conversiones pendientes. El texto de esas filas es información histórica sin identidad verificada. No es una asignación UUID autorizada. La API nueva exige selección para altas vinculadas; no se impone todavía un NOT NULL ni se certifica que el formulario antiguo ofrezca responsables reales.

## 4. Directorio mínimo y RLS

La lectura directa de Profiles permanece intacta: Gerente/Vendedor conservan únicamente su fila y Administrador activo conserva el equipo, según el SQL existente. Un cliente de servidor con JWT o una función invocadora no convierte ese SELECT en un directorio global.

La solución preparada utiliza:

1. Una vista privada `nexo_private.client_responsible_directory` con `security_barrier`, cinco columnas explícitas y solo permiso SELECT. Su propietario lee esa proyección de Profiles como una capacidad mínima deliberada. Esa lectura usa los privilegios del propietario; no se describe como lectura bajo la RLS personal de Profiles.
2. Un helper PL/pgSQL `SECURITY INVOKER` que comprueba referencias históricas consultando Clientes bajo el contexto del usuario. Clientes no aparece como relación directa en la vista para evitar heredar allí los privilegios del propietario.
3. Una RPC pública `client_responsibles(p_client_id uuid default NULL)`, `SECURITY INVOKER`, con autorización interna. Devuelve únicamente `id`, `nombres`, `apellidos`, `activo`, `rol` y `can_assign`. Un cliente contextual debe ser visible al actor.

Administrador/Gerente obtienen candidatos activos y diagnóstico de perfiles incompletos. Vendedor obtiene su candidato propio y las referencias históricas que puede ver. Un inactivo o incompleto mostrado por contexto no pasa a ser candidato asignable; `can_assign` tampoco concede al Vendedor autoridad para reasignar un cliente existente.

No se concede lectura nueva sobre Profiles ni se añade una función de directorio `SECURITY DEFINER` en `public`. La vista privada es la capacidad de lectura adicional y se documenta como tal, incluso para quien tenga acceso SQL directo. La semántica de funciones invocadoras dentro de vistas está documentada por [PostgreSQL, CREATE VIEW](https://www.postgresql.org/docs/15/sql-createview.html); su funcionamiento en el entorno concreto sigue pendiente de prueba SQL.

Prerrequisitos: `nexo_private` debe permanecer fuera de los esquemas API expuestos, el propietario debe ser de confianza y sus ACL deben coincidir con el preflight. No basta con que el nombre del esquema sea privado. No hay email, avatar, tokens ni acceso a `auth.users` en el directorio.

## 5. Conversión de Leads y concurrencia

`public.convert_lead` conserva firma y resultados de la RPC existente, pero su fachada preparada es `SECURITY INVOKER`. Comprueba visibilidad de Lead/Cliente con la RLS del usuario antes y después del núcleo privado; un resultado no visible aborta la llamada.

El núcleo privado conserva el bloqueo por Lead y por correo, la confirmación de vínculo y la idempotencia:

- Al crear un cliente, solo propaga la referencia UUID ya existente del Lead si el destino es elegible y ese actor está autorizado a asignarlo. No convierte nombres en identidades, no sustituye un destino por el actor y no enlaza clientes previos automáticamente.
- Si la fuente es nula, inactiva, incompleta o no asignable por ese actor, crea el cliente pendiente con UUID NULL y conserva el texto disponible. Esto mantiene el flujo comercial durante la transición.
- Al vincular un cliente existente, no cambia su texto ni UUID. Un reintento devuelve el mismo cliente sin duplicarlo.

El núcleo necesita privilegios para escribir los campos de conversión de Leads que no son actualizables directamente por el usuario. Reside en `nexo_private`, con permisos mínimos de ejecución y comprobaciones propias; no confía en que solo lo llame la fachada. Se prepara una comprobación de catálogo antes de instalar y en cada llamada: si las políticas de Clientes/Leads dejan de equivaler al conjunto global por rol que reproduce, la conversión debe fallar y exigir revisión. La referencia privada de políticas no contiene datos comerciales ni otorga acceso a las tablas originales.

Esta defensa no convierte al núcleo en invocador ni elimina la necesidad de comparar el catálogo real. La verificación debe probarse, incluyendo una invocación directa autenticada del núcleo y deriva de políticas en un entorno de ensayo autorizado.

Para actualizaciones nuevas, el servicio envía un PATCH de campos permitidos y conserva el timestamp original completo, incluidos sus seis decimales. Filtra por `id` y `updated_at`; cero filas genera conflicto sin reintentar sin condición. El SQL mantiene el trigger existente de versión y prepara un token monotónico con el reloj actual o el timestamp anterior más un microsegundo.

La concurrencia condicionada está preparada y probada en el contrato nuevo. El formulario/Provider antiguos todavía no envían su versión de edición a esa API. No se toma la versión más reciente del cache para fingir que representa el formulario abierto: la conexión correcta se hará en la fase visual autorizada. Las escrituras REST ajenas al contrato siguen necesitando respetar su precondición de versión; no se ha cambiado el modelo de grants a RPC exclusiva.

## 6. Validaciones locales y pruebas pendientes

Entorno comprobado: Node 24.19.0 y Next 16.3.6 instalado. Se consultaron las guías locales de Next sobre seguridad de datos, autorización de acciones y TypeScript. Las pruebas unitarias usan el soporte TypeScript de Node y no sustituyen el typecheck. Referencia: [TypeScript en Node](https://nodejs.org/docs/latest-v24.x/api/typescript.html).

| Comprobación ejecutada | Resultado |
| --- | --- |
| `npm run lint` | PASS. |
| `npm run typecheck` | PASS, generación de tipos de rutas y TypeScript sin errores. |
| `npm run build` | PASS al permitir el proceso local de Next fuera del sandbox. El primer intento compiló y después falló con `spawn EPERM` al iniciar TypeScript; el reintento completó compilación, tipos y generación de páginas. |
| `npm run test:unit` | PASS, 47 pruebas aprobadas, cero fallos, omitidas o canceladas. Incluye los cuatro casos adicionales de espacios Unicode. |
| Revisión estática y whitespace | Archivos y diff revisados; no se ejecutaron sentencias SQL para verificarlos. |

El runner unitario usa `--test-isolation=none` para no necesitar un proceso hijo por archivo en este entorno. Sus fixtures no usan red ni recursos globales de la aplicación. Node puede emitir un aviso de autodetección de módulos; no se cambia el tipo global del paquete para silenciarlo. El build avisa de un lockfile fuera del repositorio; no se modificó ese archivo externo ni la configuración de Turbopack para ocultar el aviso.

Las pruebas unitarias cubren roles, UUID canónicos, homónimos, perfiles inactivos/incompletos, Unicode, conservación de Ana García, lectura preexpansión, propiedades manipuladas, timestamp íntegro, conflicto y ausencia de reintento destructivo.

Estos resultados proceden de las ejecuciones locales realizadas durante esta misma implementación, antes de la interrupción. Al recuperar el trabajo se revisaron Git, los archivos actuales y las últimas adiciones SQL; no se reinició la implementación ni se repitieron build/typecheck sin cambios nuevos de TypeScript que lo justificaran.

**SQL preparado, no ejecutado ni aprobado:** la suite comprueba altas/reasignaciones por rol, conservación de históricos, referencias inválidas, texto inmutable, clear rechazado, tokens obsoletos, DTO mínimo, Profiles directo, conversión nueva/existente/idempotente, anon y perfiles ausentes/inactivos. Usa perfiles existentes suministrados por el operador y modifica temporalmente dos perfiles de prueba dentro de su transacción; no crea usuarios, perfiles ni roles. Termina con rollback, que no convierte esas escrituras en solo lectura.

También está preparado el escenario de RLS por fila en `supabase/tests/client_responsibles.sql`: una política SELECT restrictiva temporal oculta los clientes del perfil inactivo y mantiene visible otro histórico. Comprueba que ni la vista privada ni la RPC revelen el responsable oculto y que la conversión pública y el núcleo privado invocado directamente rechacen la deriva sin escrituras parciales. `ROLLBACK TO SAVEPOINT` elimina la política de prueba. Se revisó estáticamente este bloque; no se ha aplicado ninguna política a una base.

No se acreditó una base aislada autorizada ni se abrió una conexión. Permanecen pendientes:

- Aplicar y compilar realmente ambos SQL en una base local aislada, únicamente con autorización expresa de escritura; validar todos los SQLSTATE y aserciones.
- Ejecutar el escenario ya preparado de directorio con clientes visibles/ocultos para el mismo actor; no se atribuye un PASS de RLS por fila a la inspección del código.
- Ejecutar los casos ya preparados de deriva de políticas y llamada directa al núcleo privado, sin exponer `nexo_private` por API.
- Carreras con dos sesiones: asignación frente a inactivación/nombre incompleto, dos conversiones simultáneas y actualización condicionada después de esperar un bloqueo.
- API HTTP/PostgREST real, sesión caducada y despliegue con grants/owners de la versión concreta de PostgreSQL.
- Regresión comercial y visual posterior: Clientes, Leads, Oportunidades, Ventas y sus cálculos, Reportes/CSV, Resumen, Tareas y calendario. No se ejecutaron E2E ni clics de pantallas en esta etapa.

## 7. Riesgos y condiciones antes del siguiente paso

1. **SQL sin ensayo real.** La inspección y las pruebas TypeScript no acreditan que las funciones, vistas, políticas de referencia y fixtures SQL compilen o se comporten correctamente en PostgreSQL. Este es un bloqueo para aplicar el cambio a producción.
2. **Aplicación parcialmente preparada.** Las pantallas siguen usando `OWNERS` y el servicio legado, por restricción expresa. No desplegar el SQL por separado ni anunciar la eliminación del responsable demo: faltan la conexión visual y su regresión.
3. **Deriva de esquema/políticas.** El SQL falla ante expansión previa y ante políticas incompatibles. Si ya se aplicó el archivo estructural anterior, no ejecutar la nueva expansión sin adaptar y revisar la diferencia. No reaplicar `schema.sql`, `auth_roles.sql` ni seeds para resolverlo.
4. **NULL transitorio.** Se acepta para conservar compatibilidad; el texto no demuestra asignación real. Endurecer todas las altas exigiría adaptar y aprobar todos los productores de Clientes.
5. **Identidad frente a historia.** El texto original puede diferir del responsable UUID actual. La futura UI debe mostrar ambas cosas correctamente. No volver a una UI solo textual como rollback después de reasignar.
6. **RESTRICT y Auth.** Borrar un perfil asignado quedará bloqueado y puede impedir la cascada de eliminación de Auth. La operación prevista es inactivar, sin cambiar Auth ni perder referencias.
7. **Alcance de la defensa.** Los controles de integridad cubren asignaciones, no crean una bitácora completa de eventos ni garantizan precondición de versión para cualquier SQL fuera del nuevo servicio. No se afirma una protección más amplia.

## 8. Qué falta para la Fase 7C.2.3B, sin iniciarla

Esta entrega termina aquí, sin iniciar pantallas ni despliegue. Para un siguiente paso expresamente autorizado:

1. Revisar el diff local y este informe, especialmente la matriz de asignación, lectura mínima y NULL transitorio.
2. Obtener un catálogo de solo lectura del entorno que se quiera ensayar: tipos, policies completas, grants por tabla/columna, owners, triggers, firmas, `FORCE RLS` y esquemas expuestos.
3. Autorizar por separado una base PostgreSQL local aislada y escrituras de ensayo. Preparar los perfiles existentes que requiere la suite; si no existen, la suite debe quedar pendiente, sin crear cuentas ficticias para completarla.
4. En esa etapa autorizada, revisar/aplicar primero `supabase/client_responsibles.sql` y después `supabase/client_responsibles_directory.sql`. No aplicar además el SQL estructural de 7C.2.3. Verificar que todos los clientes previos siguen con UUID NULL y texto/fechas intactos.
5. Configurar los identificadores de perfiles y la autorización de entorno que documenta la cabecera de `supabase/tests/client_responsibles.sql`. El guard exige nombre exacto de base y conexión local; un contenedor cuya dirección interna no sea loopback requiere una revisión del entorno, sin retirar el guard por comodidad.
6. Solo con esa autorización ejecutar la suite SQL, incluidos los casos de RLS parcial y deriva ya preparados, registrar resultados reales, emitir rollback ante cualquier fallo y preparar los ensayos multisesión adicionales. No crear un informe de PASS a partir de lectura de código.
7. Solicitar una etapa visual separada para sustituir `OWNERS`, conectar la API nueva y llevar el `updated_at` original desde el formulario. Preservar el diseño existente y ejecutar entonces pruebas de temas, accesibilidad y responsive.
8. Revisar conjuntamente evidencia, versión compatible de recuperación y diff antes de solicitar cualquier autorización de producción. Esta etapa local no autoriza una migración remota ni un commit/push.

## 9. Cierre y confirmación de Git

La Fase 7C.2.3A queda completa como preparación local. No quedan tareas de implementación autorizada abiertas: están preparados el contrato dual, autorización, SQL de integridad/directorio/conversión, concurrencia y pruebas específicas. La validación SQL, las carreras entre sesiones y la integración visual son pendientes explícitos de etapas posteriores, no resultados aprobados de esta entrega.

Archivos versionados modificados por esta fase, todavía sin commit:

- `package.json`
- `playwright.config.ts`
- `src/features/clients/demo-data.ts`
- `src/features/clients/services/clients.service.ts`
- `src/features/clients/types.ts`
- `src/lib/supabase/database.types.ts`
- `tsconfig.json`

Archivos nuevos de esta fase, todavía sin seguimiento:

- `anti-slop/phase-7c23a-backend-implementation.md`
- `src/features/clients/client-mapping.ts`
- `src/features/clients/client-write.ts`
- `src/features/clients/responsible-contract.ts`
- `src/features/clients/services/client-responsibles.service.ts`
- `supabase/client_responsibles.sql`
- `supabase/client_responsibles_directory.sql`
- `supabase/tests/client_responsibles.sql`
- `tests/unit/client-responsibles.test.mjs`

`git status --short` confirma que siguen presentes los cambios ajenos descritos en el apartado 1. `git diff --check` no informa errores de whitespace; se revisan también los archivos nuevos por separado porque ese comando no incluye archivos sin seguimiento. No hay diferencias de esta fase en pantallas, rutas, Provider de Clientes, `DESIGN.md`, archivos originales de Auth/RLS ni `.env.local`. No se realizó commit, push, limpieza de cambios ni acceso a producción.

### Delivery Gate Anti Slop

Se mantuvo el modo `during` elegido por el usuario. Se usaron las cuatro skills locales: core, UI, human y layoutmobile. `DESIGN.md` conserva la dirección CRM ENERGY 3 / RHYTHM 2 / MOTION 2.

- PASS, R-02 y R-36/R-38: texto nuevo sin guion largo prohibido; resultados locales diferenciados de SQL pendiente y hechos remotos atribuidos al usuario.
- PASS, R-23 y Purpose-Gate: ningún asset ni diseño nuevo; UUID, vista mínima, restricciones, texto histórico y versión tienen una finalidad escrita verificable.
- PASS, R-35 en alcance backend local: lint, typecheck, build y pruebas unitarias ejecutadas; inspección SQL identificada como tal.
- PASS, C-5: no se inventan cuentas, UUID de producción, datos de negocio ni resultados SQL.
- No aplica la certificación visual: no se modificaron pantallas, CSS ni componentes. No se reclaman clics, contraste o responsive nuevamente comprobados; esa evidencia corresponde a la etapa visual posterior.
