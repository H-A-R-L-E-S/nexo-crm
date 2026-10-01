# Nexo CRM

CRM con Next.js 16 App Router, TypeScript, Tailwind y shadcn/ui. Clientes, Leads y Oportunidades guardan sus datos en Supabase. El acceso al CRM usa Supabase Auth, perfiles y permisos respaldados por RLS.

## Instalación y ejecución

Requisitos: Node.js 20.9 o superior, npm y Git. Se conserva `package-lock.json`.

```bash
npm ci
npm run dev -- --webpack
```

Abre http://localhost:3000. Continuamos usando Webpack; esta etapa no modifica Turbopack.

Configura en `.env.local` las variables existentes (puedes copiar `.env.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Usa la URL y la clave pública `anon` del mismo proyecto. `.env.local` está ignorado por Git. Nunca agregues contraseñas, claves secretas ni `service_role` al frontend. Reinicia el servidor después de cambiar las variables.

## Autenticación y usuarios

### 1. Aplicar la migración

En el proyecto Supabase existente abre **SQL Editor** y ejecuta completo [supabase/auth_roles.sql](supabase/auth_roles.sql).

- Preserva los clientes existentes y el esquema actual.
- Crea `public.profiles`, sus constraints, índices y triggers.
- Crea perfiles faltantes para usuarios existentes; no sobrescribe sus roles al repetirla.
- Reemplaza todas las políticas de `clientes` y revoca el acceso de `anon`.
- Permite repetir la migración sobre el esquema de esta entrega.

**No vuelvas a ejecutar `supabase/schema.sql` después:** contiene las políticas públicas temporales de la etapa anterior. Se conserva como historial. En un proyecto nuevo, el orden es `schema.sql`, opcionalmente `seed.sql`, después `auth_roles.sql`, `user_management.sql`, `leads.sql` y `opportunities.sql`.

Este repositorio no ejecuta migraciones contra tu proyecto remoto. Hasta que apliques el SQL, las políticas anteriores seguirán vigentes y el acceso al CRM requerirá completar la configuración de perfiles.

### 2. Desactivar el registro público

En **Authentication → Sign In / Providers** (configuración de proveedores de Auth), desactiva **Allow new users to sign up** y los inicios de sesión anónimos. Mantén el proveedor Email para iniciar sesión con contraseña.

No hay formulario de registro, OAuth ni recuperación automática de contraseña. El primer Administrador se crea desde Supabase Dashboard. Los siguientes usuarios pueden crearse desde el módulo Usuarios, después de aplicar la configuración administrativa descrita abajo.

### 3. Crear el primer Administrador

1. Ve a **Authentication → Users → Add user → Create new user**.
2. Introduce el correo y una contraseña segura; confirma el correo mediante la opción correspondiente del Dashboard para poder usar inmediatamente esa cuenta controlada.
3. Copia el UUID del usuario. El trigger crea su perfil con rol **Vendedor**, independientemente de los metadatos enviados.
4. En SQL Editor ejecuta lo siguiente, reemplazando los valores de ejemplo:

```sql
update public.profiles
set rol = 'Administrador', nombres = 'Tu nombre', apellidos = 'Tu apellido'
where id = 'UUID_DEL_USUARIO';
```

Confirma que se actualizó una fila. También puedes editar estos campos en Table Editor como operador del proyecto. No guardes la contraseña en el repositorio. Para otros usuarios repite la creación y asigna `Gerente` o conserva `Vendedor`.

### 4. Iniciar y cerrar sesión

- Visita `/login`, introduce el correo y contraseña del usuario creado e inicia sesión.
- El usuario autenticado ve sus iniciales, nombre y rol en Header y Sidebar.
- El menú del usuario abre **Mi perfil**, **Configuración** y **Cerrar sesión**.
- `/perfil` permite editar únicamente nombres y apellidos. Correo, rol y estado son informativos.
- Cerrar sesión invalida la sesión actual con `signOut({ scope: 'local' })` y vuelve al login; no cierra otros dispositivos.
- Una cuenta sin perfil, con rol inválido o `activo = false` ve una pantalla de acceso restringido y no carga el CRM. Ante perfiles faltantes, revisa la migración; ante perfiles inactivos, revisa el estado en Supabase.

### 5. Roles y RLS

| Identidad | Leer clientes | Crear | Editar | Eliminar |
| --- | --- | --- | --- | --- |
| Sin sesión (`anon`) | No | No | No | No |
| Administrador activo | Sí | Sí | Sí | Sí |
| Gerente activo | Sí | Sí | Sí | Sí |
| Vendedor activo | Sí | Sí | Sí | No |
| Perfil inactivo o inexistente | No | No | No | No |

Políticas de clientes: `clientes_select_authenticated`, `clientes_insert_authenticated`, `clientes_update_authenticated`, `clientes_delete_managers`. Consultan el rol vigente y el estado activo en la base de datos mediante `nexo_private.active_role()`, no metadatos editables ni un rol guardado en el navegador. No expongas el esquema `nexo_private` en la Data API.

Perfiles: `profiles_read_self` y `profiles_update_self` permiten consultar el perfil propio y actualizar nombres/apellidos si está activo. El permiso SQL `UPDATE (nombres, apellidos)` impide modificar `rol`, `activo`, `email`, `id` y otros campos desde la API, incluso al Administrador. El módulo Usuarios cambia rol y estado mediante una RPC controlada; el UPDATE directo de esas columnas continúa prohibido. El primer Administrador se asigna desde Supabase Dashboard/SQL Editor. No se permite insertar ni eliminar perfiles desde el cliente; el trigger los crea y `auth.users` controla su ciclo de vida.

La restricción de eliminar para Vendedores existe en RLS además de ocultar el botón. PostgreSQL puede responder con cero filas eliminadas en vez de un error; el servicio no presenta una eliminación exitosa si no se eliminó ninguna fila. La interfaz vuelve a comprobar el perfil al navegar, al recuperar visibilidad y cada 60 segundos mientras está visible. RLS usa el valor actualizado en cada operación, incluso antes de refrescar la interfaz.

## Arquitectura de sesión

- `src/lib/supabase/client.ts`: cliente de navegador con `@supabase/ssr`, compartido por Auth y el CRUD existente.
- `src/lib/supabase/server.ts`: cliente por petición con cookies de Next.js.
- `src/proxy.ts` y `src/lib/supabase/proxy.ts`: renuevan cookies y verifican la identidad con `getUser()` contra Supabase Auth. No confían en `getSession()` como autorización. Las respuestas son privadas y no se almacenan en caché compartida.
- `src/features/auth/server.ts`: valida también el perfil activo antes de renderizar el layout privado. El cache de React es por petición.
- `src/app/(crm)`: agrupa las pantallas protegidas sin alterar sus URLs. Dashboard y Clientes se movieron conservando su contenido.
- `src/features/auth`: formularios, contexto, roles tipados, perfil y menú de usuario.

`/`, `/clientes`, `/perfil` y `/configuracion` están protegidas. El proxy aplica la misma regla a `/leads`, `/oportunidades`, `/ventas`, `/tareas`, `/calendario`, `/reportes` y futuras rutas; estos módulos aún no se implementan. `/login` es pública y redirige al Resumen si ya existe sesión. `/acceso-restringido` requiere sesión pero permite cerrar sesión cuando no hay perfil activo. Para nuevas consultas del servidor usa también `requireProfile()` antes de acceder a datos.

## Comprobaciones

```bash
npm run typecheck
npm run lint
npm run build -- --webpack
npm run test:e2e
```

Playwright inicia Next con Webpack en el puerto **3100** y un servicio Supabase simulado en **54321**. Usa variables ficticias y no modifica `.env.local` ni el proyecto remoto. Mantén esos puertos libres. En Windows aprovecha Edge instalado; en otros equipos instala el navegador de pruebas con `npx playwright install chromium`.

Las pruebas cubren redirecciones sin sesión, validación y errores del login, contraseña visible/oculta, sesión persistente, logout por teclado, cookies inválidas, sesión revocada, perfiles inactivos/faltantes, perfil editable, móvil, permisos visuales para los tres roles y regresión del CRUD de Clientes con carga/error/reintento. El servicio simulado no prueba las políticas reales de PostgreSQL.

Para comprobar RLS en Supabase, después de la migración ejecuta [supabase/tests/auth_roles.sql](supabase/tests/auth_roles.sql) en SQL Editor. Crea usuarios y un cliente de prueba dentro de una transacción, verifica acceso anónimo, permisos de roles, perfiles inactivos y ausencia de autoasignación de rol, y termina con `ROLLBACK`. Si aparece una excepción, ejecuta `ROLLBACK` y revisa la configuración antes de continuar. Este SQL de verificación tampoco se ejecuta automáticamente.

Prueba manual final: inicia sesión con una cuenta de cada rol, registra y edita un cliente; verifica que Administrador/Gerente pueden eliminar y Vendedor no. Cierra sesión y confirma que `/clientes` vuelve a `/login`.

## Siguientes etapas

La siguiente etapa es Ventas. Quedan recuperación de contraseña, cambio obligatorio de contraseña inicial, visibilidad individual por responsable, seguimiento y tareas completos, cotizaciones, productos, calendario y reportes. No se incorporan multiempresa, facturación ni pagos en esta etapa.


## Administración de usuarios

### Preparación manual de esta etapa

1. En el proyecto Supabase existente ejecuta completo [supabase/user_management.sql](supabase/user_management.sql) en **SQL Editor**, después de la migración de autenticación ya aplicada. No hace falta repetir `auth_roles.sql` ni `schema.sql`.
2. En **Project Settings → API Keys** obtén una clave administrativa del mismo proyecto. Puedes usar la clave `service_role` de la sección **Legacy API keys**, o una clave secreta actual `sb_secret_...` (recomendada por Supabase); ambas deben mantenerse únicamente en el servidor.
3. Añádela a `.env.local` con este nombre exacto:

   ```env
   SUPABASE_SERVICE_ROLE_KEY=
   ```

4. Conserva `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` como están. No uses `NEXT_PUBLIC_` para la clave administrativa. `.env.example` contiene solamente nombres sin valores reales.
5. Reinicia `npm run dev -- --webpack` y entra con tu Administrador activo.

No se ejecuta SQL remoto ni se modifica `.env.local` desde esta entrega. La clave solo se necesita para crear cuentas en Auth; listar y editar perfiles usa el cliente de sesión y RLS. No se agregan dependencias para este módulo.

### Uso y permisos

La ruta es **`/configuracion/usuarios`**. Solo Administradores ven el enlace Usuarios en Sidebar y la tarjeta correspondiente en Configuración. Gerentes y Vendedores que escriban la URL reciben acceso restringido. Todas las Server Actions vuelven a comprobar la sesión y el rol actual en el servidor.

El módulo incluye conteos de usuarios y roles, búsqueda por nombre/correo, filtros de rol/estado, paginación, creación, edición y activación/inactivación con confirmación. El correo es de solo lectura al editar; no se permite editar identificadores ni fechas. No hay eliminación permanente de cuentas.

Nuevo usuario pide nombres, apellidos, correo, contraseña temporal confirmada de 12–128 caracteres con letras y números, rol y estado. La contraseña se envía únicamente a Supabase Auth, nunca a `profiles` ni a logs. La cuenta se crea con correo confirmado, sin invitación por correo. Entrega la contraseña por un canal seguro; todavía no se fuerza su cambio al primer acceso.

### Protecciones del servidor y SQL

- `src/lib/supabase/admin.ts` usa `server-only`. Su cliente privilegiado no lee ni modifica cookies y no se envía al navegador. Solo se utiliza para `auth.admin.createUser()` después de comprobar el Administrador.
- `profiles_admin_read_team` permite a Administradores activos consultar el equipo. Los demás conservan la lectura de su perfil propio. Reutiliza `nexo_private.active_role()` para evitar recursión RLS.
- El UPDATE directo de `rol`/`activo` sigue prohibido. `admin_update_profile` verifica nuevamente al actor, valida los campos y aplica la modificación en una transacción con bloqueo asesor. Impide desactivarse, quitarse el propio rol y dejar cero Administradores activos; las modificaciones concurrentes del módulo se serializan. También detecta un formulario obsoleto mediante `updated_at`.
- `admin_user_management_ready` comprueba que esta migración existe antes de iniciar un alta en Auth.
- El trigger existente se reutiliza: para cuentas creadas con `app_metadata.nexo_provisioning`, genera inicialmente un perfil Vendedor **inactivo**. La RPC completa sus datos y permisos. No se duplican perfiles.
- Auth y PostgreSQL no comparten una transacción de alta. Si la segunda fase falla, la UI avisa y bloquea repetir el envío: revisa la cuenta existente desde Editar. No se elimina automáticamente ni se vuelve a crear. Si se perdió solo la respuesta final, comprueba el estado real en la lista antes de continuar.
- Un usuario inactivado conserva su sesión de Auth, pero RLS bloquea sus operaciones inmediatamente. Al navegar, volver a la pestaña o en la comprobación periódica, la UI lo lleva a acceso restringido. Allí puede cerrar sesión. No se borran cuentas ni historial.

Conserva el orden de migraciones. Si vuelves a aplicar `auth_roles.sql`, reaplica después `user_management.sql`, porque la primera define la versión anterior del trigger de altas. Los cambios manuales con claves privilegiadas en Supabase Dashboard son operaciones del administrador del proyecto y pueden eludir RLS; las protecciones de esta pantalla cubren las operaciones de su RPC.

### Cómo probar

- **Administrador:** abre Usuarios, crea una cuenta de prueba, cambia su nombre y rol, cancela una inactivación y después confírmala; verifica que puedes reactivarla. Tu propia fila debe impedir cambiar rol/estado.
- **Vendedor y Gerente:** inicia sesión con cada rol; Usuarios no debe aparecer y `/configuracion/usuarios` debe bloquearse. Clientes debe conservar sus permisos anteriores.
- **Sesión activa:** deja una cuenta de prueba abierta en otro navegador, inactívala y navega en esa sesión; debe ir a acceso restringido.
- **Pruebas automáticas:** `npm run test:e2e` añade casos de administración y mantiene login/Clientes. Incluye intentos de invocar Server Actions con otro rol y de manipular el propio rol, además de alta incompleta, validaciones y móvil. Usa un servicio local simulado, no la base real.
- **RLS real:** ejecuta opcionalmente [supabase/tests/user_management.sql](supabase/tests/user_management.sql) después de la migración. Verifica lectura por rol, bloqueo del UPDATE directo y de la autoasignación, provisión inactiva y RPC; revierte los datos al terminar. No sustituye pruebas concurrentes de integración en tu infraestructura. No se ejecuta automáticamente desde aquí.

Archivos nuevos principales: `src/features/users/`, `src/app/(crm)/configuracion/usuarios/`, `src/lib/supabase/admin.ts`, `supabase/user_management.sql`, `supabase/tests/user_management.sql` y `tests/users.spec.ts`. Se actualizan el contexto de perfil, Header/Sidebar, Configuración, acceso restringido, tipos de Supabase, configuración de pruebas, `.env.example` y este README. No se reconstruyen Dashboard, Clientes ni autenticación.

Referencias oficiales: [Auth Admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [claves API de Supabase](https://supabase.com/docs/guides/api/api-keys).

## Leads

### Activación manual en el proyecto existente

1. En **Supabase → SQL Editor**, ejecuta completo [supabase/leads.sql](supabase/leads.sql). Requiere las migraciones de Clientes, autenticación y Usuarios que ya están aplicadas. **Para esta entrega solo debes aplicar `leads.sql`**; no repitas `schema.sql` ni las migraciones anteriores.
2. No hay nuevas dependencias ni variables de entorno. Conserva las claves existentes. Ejecuta `npm ci` si necesitas instalar el proyecto y `npm run dev -- --webpack`; abre `/leads` con una cuenta activa.
3. Para verificar los permisos reales y la conversión, ejecuta opcionalmente [supabase/tests/leads.sql](supabase/tests/leads.sql) completo en SQL Editor. Crea datos de prueba y termina en `ROLLBACK`. Si falla, ejecuta `ROLLBACK` y revisa el error. Este archivo **no es una migración**.

No se ha ejecutado ninguna operación contra Supabase remoto. La migración permite repetirse sobre su propio esquema: crea tabla/índices si faltan y reemplaza sus funciones, trigger y políticas. No modifica las políticas existentes de Clientes o Profiles. En una instalación nueva, el orden completo es `schema.sql` → `auth_roles.sql` → `user_management.sql` → `leads.sql`.

### Uso

Leads tiene indicadores reales, búsqueda por contacto/empresa/correo/teléfono, filtros combinables de estado/prioridad/fuente/responsable, paginación de diez filas, detalle, alta, edición, eliminación confirmada y conversión. Los estados de carga, vacío, error y operaciones pendientes incluyen mensajes en español. La edición detecta cambios concurrentes mediante `updated_at` y pide actualizar la lista.

Nombres y teléfono son obligatorios al registrar. Apellidos y correo pueden completarse al convertir porque Clientes sí los requiere. Los responsables vienen de perfiles reales. Los selectores de asignación ofrecen solo perfiles activos; un responsable posteriormente inactivado sigue visible en su lead y puede conservarse al editarlo. Las fechas usan **America/Lima (UTC−5)**. Seguimientos pendientes cuenta leads abiertos con seguimiento hoy o anterior; la tabla marca como vencida una hora ya pasada. Convertidos y No interesados no cuentan como pendientes.

La tarjeta Prospectos del Resumen conserva su significado actual (clientes en estado Prospecto). No se cambió el Dashboard; una métrica comercial conjunta queda para la siguiente etapa.

### Roles y consistencia

| Acción | Administrador | Gerente | Vendedor |
| --- | --- | --- | --- |
| Ver todos los leads, crear, editar y convertir | Sí | Sí | Sí |
| Asignar/reasignar responsable | Sí | Sí | No; al crear se asigna a sí mismo |
| Eliminar | Sí | Sí | No |

`leads_read`, `leads_create` y `leads_edit` exigen un perfil activo con uno de los tres roles. `leads_delete` solo admite Administrador/Gerente. La restricción de asignación vive también en un trigger; no depende de la UI. Usuarios inactivos y anónimos no acceden al módulo. Se reutiliza `nexo_private.active_role()` para evitar recursión RLS.

`lead_responsibles()` expone únicamente ID, nombres, apellidos, estado y rol a usuarios activos; no amplía el acceso directo a Profiles ni entrega sus correos. Incluye los inactivos ya referenciados para mostrar el historial.

`convert_lead()` comprueba al usuario activo y ejecuta la creación/vinculación y actualización del lead en una transacción. Bloquea el lead y serializa conversiones del mismo correo normalizado. Una repetición devuelve el cliente ya vinculado. Un correo existente devuelve una propuesta: solo la confirmación explícita vincula el ID coincidente, sin sobrescribir los datos del cliente. Un índice único existente de Clientes protege también frente a altas concurrentes desde su propio módulo.

El lead se conserva con estado Convertido y referencia al cliente; el detalle permite abrirlo en Clientes. Estado y vínculo deben ser consistentes y no se permite escribir el vínculo directamente desde el navegador. Editar después el lead no sincroniza sus datos con el cliente. Las claves foráneas impiden borrar un cliente o perfil todavía referenciado; inactivar usuarios conserva sus relaciones. Eliminar el lead es permanente y no elimina el cliente vinculado.

### Verificación

```bash
npm run typecheck
npm run lint
npm run build -- --webpack
npm run test:e2e
```

Playwright usa exclusivamente Supabase simulado local, con casos de los tres roles, validaciones, CRUD, conversión, correo existente con confirmación, búsqueda/filtros, paginación, detalle, carga fallida/reintento, acceso autenticado y móvil. Mantiene las pruebas de Auth, Clientes y Usuarios. Estos casos comprueban la aplicación; no certifican RLS ni la transacción PostgreSQL. El SQL de verificación manual comprueba permisos de roles, asignación, directorio, vínculo consistente, conversión idempotente, duplicados e inactivos, con reversión final. No sustituye una prueba de concurrencia contra PostgreSQL.

Prueba manual con **Administrador** y después **Gerente**: crea un lead, asigna un usuario activo, edita empresa/estado/seguimiento, combina filtros, consulta detalle y elimina otro lead tras confirmar. Con **Vendedor**, crea y edita un lead, comprueba la autoasignación y la ausencia de Eliminar. Para verificar que la restricción también existe en base de datos, usa el SQL de pruebas.

Para probar **Lead → Cliente**, crea un lead con un correo nuevo, pulsa Convertir a cliente y completa apellidos/correo si faltan. Debe quedar Convertido y abrir su cliente desde el detalle. Repite con otro lead del mismo correo: debe ofrecer vincular al existente sin duplicarlo. Recarga para comprobar persistencia. Inactiva después a un responsable desde Usuarios y verifica que sus leads lo conservan, pero no aparece como opción para nuevas asignaciones.

Archivos de esta etapa: `src/features/leads/` (tipos, validación, fechas, permisos, servicio, hook y componentes), `src/app/(crm)/leads/`, `supabase/leads.sql`, `supabase/tests/leads.sql` y `tests/leads.spec.ts`. Se actualizan los tipos de Supabase, Sidebar/Header, aviso del layout, búsqueda por ID y mensaje de relación de Clientes, y este README. Se conserva `package-lock.json` sin cambios y no se usa el cliente administrativo para Leads.

## Oportunidades comerciales

### Paso manual necesario

Ejecuta completo [supabase/opportunities.sql](supabase/opportunities.sql) en **SQL Editor de tu proyecto Supabase existente**, después de `leads.sql`. Si Leads ya está instalado, **solo necesitas ejecutar `opportunities.sql`**. Si aún no aplicaste la entrega anterior de Leads, ejecuta primero `leads.sql`. No vuelvas a aplicar `schema.sql` ni cambies las políticas anteriores.

La migración crea `public.oportunidades`, índices, constraints, cuatro políticas RLS, el trigger de validación/fechas y un directorio mínimo de responsables. Se puede volver a ejecutar sobre el esquema de esta entrega. No se ejecutó ningún SQL contra Supabase remoto desde el desarrollo. No hay nuevas dependencias, claves o variables de entorno; `package-lock.json` se conserva.

Inicia el proyecto con `npm run dev -- --webpack` y abre **`/oportunidades`**. Sidebar ahora navega al módulo. Ventas y los demás módulos pendientes mantienen «Pronto».

### Pipeline, Lista y cifras

La vista inicial Pipeline tiene seis columnas: Nueva, Contacto, Propuesta, Negociación, Ganada y Perdida. Cada tarjeta muestra cliente, valor en soles, responsable, probabilidad y cierre estimado. La columna suma sus oportunidades visibles. El selector de etapa funciona con teclado y guarda inmediatamente; no se incorpora drag & drop. Si el guardado falla o detecta una edición concurrente, conserva la etapa anterior y muestra el error.

Lista ofrece las mismas acciones y paginación de diez registros. Ambas vistas comparten búsqueda por título/cliente/origen y filtros combinables de etapa, responsable, cliente, abierta/cerrada y rango inclusivo de fecha estimada. Al usar rango de fechas se excluyen las oportunidades sin fecha. Las tarjetas superiores son **globales**, independientes de los filtros; columnas y número de resultados reflejan los filtros.

- **Abiertas:** etapas distintas de Ganada y Perdida.
- **Valor del pipeline:** suma exacta de los importes abiertos. El valor ponderado suma `valor × probabilidad / 100` y redondea el total al céntimo.
- **Ganadas este mes:** etapa actual Ganada y fecha real de cierre dentro del mes de Lima.
- **Tasa de cierre:** ganadas / (ganadas + perdidas), histórica; muestra 0% cuando no hay cerradas.

El dinero se guarda como `numeric(14,2)`, no float. El campo generado `valor_decimal` permite recibir texto exacto desde PostgREST. TypeScript mantiene `valor` como cadena decimal y calcula sumas en céntimos `bigint`. Se admiten importes de 0 a 999999999999.99. El formulario acepta punto o coma decimal, hasta dos decimales y sin separadores de miles.

Las probabilidades sugeridas son 10/25/50/75/100/0 por etapa. Cambiar etapa aplica su sugerencia; en etapas abiertas puede ajustarse manualmente entre 0 y 100. Ganada fija 100 y Perdida 0 también en SQL. `cerrada_at` se gestiona solo en el servidor: cambia al cerrar/cambiar a otra etapa cerrada, se borra al reabrir y se conserva al editar otros datos. `created_at`, `updated_at`, `cerrada_at` y el ID no se escriben desde formularios. El Dashboard permanece con sus estadísticas actuales de Clientes; no se reconstruye ni mezcla métricas de distinto significado.

### Relaciones y permisos

El formulario carga clientes, leads y perfiles reales. Desde una fila de Clientes, **Nueva oportunidad** abre el formulario con ese cliente. Desde el detalle de un lead convertido, la misma acción preselecciona cliente y lead. No crea ni duplica clientes. Solo se pueden asociar leads convertidos al cliente elegido, y SQL verifica esa relación. El detalle incluye cliente enlazado, lead de origen, fechas, importe y descripción.

| Acción | Administrador | Gerente | Vendedor |
| --- | --- | --- | --- |
| Leer todas, crear, editar y cambiar etapa | Sí | Sí | Sí |
| Asignar y reasignar responsable | Sí | Sí | No; nuevas asignadas a sí mismo |
| Eliminar con confirmación | Sí | Sí | No |

`oportunidades_read`, `oportunidades_create` y `oportunidades_edit` requieren uno de los tres roles activos; `oportunidades_delete` exige Administrador/Gerente. El trigger impide que Vendedor asigne a otra persona o cambie responsables. Las restricciones existen en PostgreSQL, además de los botones. `opportunity_responsibles()` solo expone datos mínimos a perfiles activos, sin ampliar SELECT de Profiles. Una nueva asignación exige perfil activo; un responsable posteriormente inactivado sigue relacionado y puede conservarse al editar. Las claves foráneas conservan trazabilidad: no se elimina un cliente, lead o perfil mientras tenga oportunidades asociadas.

Leads, Clientes, Auth y Usuarios conservan sus flujos. Oportunidades no usa `service_role`. No se implementan Ventas, cotizaciones, productos, tareas completas, calendario, reportes ni multiempresa.

### Cómo verificar esta entrega

1. **Administrador:** crea una oportunidad desde Clientes; completa título, valor, etapa, probabilidad y responsable. Comprueba ambos modos y el detalle. Edita importe/fecha/descripción y recarga. Cambia a Ganada: debe mostrar 100%, salir del pipeline abierto y contar en el mes del cierre. Elimina otra oportunidad tras cancelar primero la confirmación.
2. **Gerente:** repite alta, edición, cambio de etapa, asignación y eliminación. Debe conservar los mismos permisos comerciales sin acceso a Usuarios.
3. **Vendedor:** crea y edita una oportunidad; el responsable nuevo debe ser su propia cuenta y no permitir reasignación. Cambia etapa y recarga para comprobar persistencia. No debe aparecer Eliminar.
4. **Trazabilidad:** desde un lead convertido abre Nueva oportunidad y comprueba el cliente y lead preseleccionados. El cliente existente debe conservar su ID. Inactiva a un responsable desde Usuarios: debe seguir visible en las oportunidades previas y no ofrecerse para nuevas asignaciones.
5. **RLS y precisión en PostgreSQL:** ejecuta opcionalmente [supabase/tests/opportunities.sql](supabase/tests/opportunities.sql) completo, después de la migración. Comprueba CRUD por rol, bloqueo de reasignación/borrado, dinero, probabilidad, consistencia lead-cliente, fechas de cierre e inactivos. Termina con `ROLLBACK`; ante una excepción ejecuta `ROLLBACK`. No es una migración y no se ejecuta automáticamente.

Comprobaciones locales: `npm run typecheck`, `npm run lint`, `npm run build -- --webpack` y `npm run test:e2e`. Playwright añade los flujos anteriores, filtros/paginación, cambios obsoletos, error/reintento, móvil, importes exactos y límite mensual de Lima. Conserva las regresiones de Clientes, Leads, Auth y Usuarios. Usa exclusivamente el servicio Supabase simulado local: **la persistencia y RLS del proyecto remoto requieren aplicar el SQL y realizar la prueba manual**. No se ejecutaron los SQL de verificación en PostgreSQL local porque este entorno no tiene `psql` ni Docker.

Archivos creados: `src/features/opportunities/` (tipos, dinero, estadísticas, validación, permisos, servicio, hook, formularios, detalle, acciones y vistas), `src/app/(crm)/oportunidades/`, `supabase/opportunities.sql`, `supabase/tests/opportunities.sql` y `tests/opportunities.spec.ts`. Archivos modificados: tipos de Supabase, Sidebar/Header/aviso de layout, acciones de Clientes y detalle de Leads, mensajes al eliminar registros relacionados y README. La prueba de inactivación de Usuarios navega directamente a la ruta para evitar una carrera con su redirección periódica; no se modifica la autenticación.
