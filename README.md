# Nexo CRM

CRM con Next.js 16 App Router, TypeScript, Tailwind y shadcn/ui. Clientes, Leads, Oportunidades, Ventas y Tareas guardan sus datos en Supabase. El acceso al CRM usa Supabase Auth, perfiles y permisos respaldados por RLS.

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

**No vuelvas a ejecutar `supabase/schema.sql` después:** contiene las políticas públicas temporales de la etapa anterior. Se conserva como historial. En un proyecto nuevo, el orden es `schema.sql`, opcionalmente `seed.sql`, después `auth_roles.sql`, `user_management.sql`, `leads.sql`, `opportunities.sql`, `sales.sql` y `tasks.sql`.

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

`/`, `/clientes`, `/perfil` y `/configuracion` están protegidas. El proxy aplica la misma regla a `/leads`, `/oportunidades`, `/ventas`, `/tareas`, `/calendario`, `/reportes` y futuras rutas. Clientes, Leads, Oportunidades, Ventas y Tareas están implementados; Calendario y Reportes siguen pendientes. `/login` es pública y redirige al Resumen si ya existe sesión. `/acceso-restringido` requiere sesión pero permite cerrar sesión cuando no hay perfil activo. Para nuevas consultas del servidor usa también `requireProfile()` antes de acceder a datos.

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

Quedan recuperación de contraseña, cambio obligatorio de contraseña inicial, visibilidad individual por responsable, cotizaciones, productos, inventario, calendario, reportes y pagos por cuotas. Tareas y seguimiento ya están implementados. Facturación electrónica SUNAT y multiempresa quedan fuera de esta etapa.


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

Leads, Clientes, Auth y Usuarios conservan sus flujos. Oportunidades no usa `service_role`. Ventas se describe en la sección siguiente; Tareas y seguimiento se describen más adelante; quedan pendientes cotizaciones, productos, calendario, reportes y multiempresa.

### Cómo verificar esta entrega

1. **Administrador:** crea una oportunidad desde Clientes; completa título, valor, etapa, probabilidad y responsable. Comprueba ambos modos y el detalle. Edita importe/fecha/descripción y recarga. Cambia a Ganada: debe mostrar 100%, salir del pipeline abierto y contar en el mes del cierre. Elimina otra oportunidad tras cancelar primero la confirmación.
2. **Gerente:** repite alta, edición, cambio de etapa, asignación y eliminación. Debe conservar los mismos permisos comerciales sin acceso a Usuarios.
3. **Vendedor:** crea y edita una oportunidad; el responsable nuevo debe ser su propia cuenta y no permitir reasignación. Cambia etapa y recarga para comprobar persistencia. No debe aparecer Eliminar.
4. **Trazabilidad:** desde un lead convertido abre Nueva oportunidad y comprueba el cliente y lead preseleccionados. El cliente existente debe conservar su ID. Inactiva a un responsable desde Usuarios: debe seguir visible en las oportunidades previas y no ofrecerse para nuevas asignaciones.
5. **RLS y precisión en PostgreSQL:** ejecuta opcionalmente [supabase/tests/opportunities.sql](supabase/tests/opportunities.sql) completo, después de la migración. Comprueba CRUD por rol, bloqueo de reasignación/borrado, dinero, probabilidad, consistencia lead-cliente, fechas de cierre e inactivos. Termina con `ROLLBACK`; ante una excepción ejecuta `ROLLBACK`. No es una migración y no se ejecuta automáticamente.

Comprobaciones locales: `npm run typecheck`, `npm run lint`, `npm run build -- --webpack` y `npm run test:e2e`. Playwright añade los flujos anteriores, filtros/paginación, cambios obsoletos, error/reintento, móvil, importes exactos y límite mensual de Lima. Conserva las regresiones de Clientes, Leads, Auth y Usuarios. Usa exclusivamente el servicio Supabase simulado local: **la persistencia y RLS del proyecto remoto requieren aplicar el SQL y realizar la prueba manual**. No se ejecutaron los SQL de verificación en PostgreSQL local porque este entorno no tiene `psql` ni Docker.

Archivos creados: `src/features/opportunities/` (tipos, dinero, estadísticas, validación, permisos, servicio, hook, formularios, detalle, acciones y vistas), `src/app/(crm)/oportunidades/`, `supabase/opportunities.sql`, `supabase/tests/opportunities.sql` y `tests/opportunities.spec.ts`. Archivos modificados: tipos de Supabase, Sidebar/Header/aviso de layout, acciones de Clientes y detalle de Leads, mensajes al eliminar registros relacionados y README. La prueba de inactivación de Usuarios navega directamente a la ruta para evitar una carrera con su redirección periódica; no se modifica la autenticación.

## Ventas

### Activación manual

En **SQL Editor del proyecto Supabase existente**, ejecuta completo [supabase/sales.sql](supabase/sales.sql). Como Oportunidades ya está instalado, **solo necesitas ejecutar `sales.sql`**. No repitas las migraciones anteriores. La migración puede repetirse sobre su propio esquema y no modifica las políticas de Clientes, Leads, Oportunidades o Profiles.

No se ejecutó ninguna operación contra Supabase remoto. No hay nuevas dependencias ni variables de entorno; se conserva `package-lock.json`. Ejecuta `npm ci` si necesitas instalar y `npm run dev -- --webpack`. Abre **`/ventas`** con una cuenta activa. **`/ventas/[id]`** muestra el detalle de cada venta.

### Crear, editar y registrar pago

Nueva venta pide cliente, responsable, fecha, estado y al menos un ítem. Los ítems admiten descripción, cantidad, precio unitario y descuento monetario por línea. Puedes agregar y quitar filas, hasta 100. El resumen se actualiza al escribir; permite aplicar o desactivar IGV 18%. Métodos: Efectivo, Transferencia, Tarjeta, Yape, Plin y Otro. El formulario, listado y detalle incluyen carga, vacío, error/reintento y operaciones pendientes.

Desde una **Oportunidad Ganada**, la acción **Nueva venta** abre el formulario con cliente, oportunidad y responsable preseleccionados. Para Vendedor, el responsable nuevo siempre es su propia cuenta. Se propone el título y valor de la oportunidad como primer ítem; ese valor se interpreta como precio base antes del IGV y puede editarse. No se crea otro cliente. SQL exige que la oportunidad pertenezca al cliente y esté Ganada al crear la asociación; no cambia su etapa automáticamente. Si luego se reabre la oportunidad, la relación previa se conserva como historial.

**Borrador** y **Pendiente** permiten editar datos e ítems. Borrador puede pasar a Pendiente o Pagada; una Pendiente no puede volver a Borrador. Al pulsar **Marcar pagada**, completa fecha de pago y método, y opcionalmente referencia; confirma **Marcar Pagada**. También puedes registrar una nueva venta directamente Pagada, completando esos campos. Los tres roles pueden registrar el pago.

Una venta **Pagada** queda bloqueada para editar datos, relaciones, importes e ítems, incluso para Administrador/Gerente. Para revertir la operación comercial, ellos deben usar **Cancelar venta**, registrar un motivo y confirmar. **Cancelada** conserva número, ítems, importes, pago original, motivo, fecha y actor de cancelación; no permite edición ni reapertura. No cuenta como ingreso. No se admite borrado permanente de ventas Pagadas, Pendientes o Canceladas.

### Cálculos y numeración

- Cada `venta_items.subtotal` es el importe bruto `round(cantidad × precio_unitario, 2)`. El descuento de la línea es un importe total, no un porcentaje, y no puede superar ese subtotal.
- `ventas.subtotal` suma los importes brutos; `ventas.descuento` suma los descuentos de las líneas.
- La base neta es subtotal menos descuento. El IGV es 18% de esa base, redondeado al céntimo, o cero si está desactivado. `total = subtotal − descuento + impuesto`.
- Ejemplo: 2 × S/ 100.00 con S/ 10.00 de descuento, más 1.5 × S/ 20.00, produce subtotal **S/ 230.00**, descuento **S/ 10.00**, IGV **S/ 39.60** y total **S/ 259.60**.

PostgreSQL guarda dinero como `numeric(14,2)` y cantidades como `numeric(12,3)`. Rechaza cantidades cero/negativas, descuentos excesivos e importes fuera de rango. Los campos de texto generados entregan decimales exactos al navegador; los cálculos de la UI usan enteros `bigint` en céntimos y milésimas de cantidad. No se usa float para dinero. `save_sale()` valida y recalcula todo en SQL; los totales enviados por un navegador manipulado se ignoran.

La numeración se asigna exclusivamente en PostgreSQL: **V-año-000001**, con contador anual privado y bloqueo transaccional. El año corresponde a la creación en Lima, independientemente de una fecha de venta anterior. La restricción única refuerza la protección concurrente. Un número de una venta borrada no se reutiliza. Las altas usan además un UUID de solicitud: reintentar el mismo formulario después de perder la respuesta devuelve la venta ya creada. Edición y cambios de estado verifican `updated_at` para detectar formularios obsoletos. Cabecera y reemplazo de ítems se guardan en una transacción; un error revierte ambos.

### Permisos y conservación del historial

| Acción | Administrador | Gerente | Vendedor |
| --- | --- | --- | --- |
| Leer todas, crear y editar Borrador/Pendiente | Sí | Sí | Sí |
| Registrar pago | Sí | Sí | Sí |
| Asignar y reasignar responsable | Sí | Sí | No; altas asignadas a sí mismo |
| Cancelar con motivo | Sí | Sí | No |
| Eliminar Borrador no emitido | Sí | Sí | No |
| Editar o eliminar una Pagada | No; puede cancelarla | No; puede cancelarla | No |

`ventas_read` exige uno de los tres roles activos. `venta_items_read` exige una venta visible por RLS. Anónimos e inactivos no tienen acceso. No hay permisos directos INSERT/UPDATE/DELETE sobre cabecera o ítems: todas las mutaciones usan `save_sale`, `set_sale_status` y `delete_sale`, que vuelven a comprobar rol, estado y relaciones en el servidor. `ventas_delete_draft` limita también la política DELETE a Administrador/Gerente y borradores no emitidos; la aplicación necesita la RPC autorizada para borrar. El contador y sus funciones privadas no están accesibles al cliente.

`sale_responsibles()` entrega solo datos mínimos de perfiles activos y de responsables históricos. No amplía SELECT sobre Profiles. Una asignación nueva exige usuario activo; una relación previa puede conservarse después de inactivarlo. Las claves foráneas impiden borrar un cliente, oportunidad o perfil todavía referenciado. Eliminar un borrador seguro borra sus ítems en cascada y conserva cliente/oportunidad.

### Listado y pruebas manuales

El listado tiene búsqueda por número/cliente/referencia, filtros combinables por estado/responsable/cliente/método y rango inclusivo de fecha de venta, paginación de diez filas y detalle enlazado. Los indicadores son globales, independientes de los filtros:

- **Ventas totales:** cantidad de registros no cancelados, incluidos borradores.
- **Ingresos pagados:** suma histórica de Pagadas.
- **Pendientes de pago:** importe y cantidad de Pendientes; excluye borradores.
- **Ventas este mes:** registros no cancelados cuya fecha de venta pertenece al mes actual de Lima.

El Dashboard conserva sus métricas actuales de Clientes. Los indicadores reales de ventas están en `/ventas`.

1. **Administrador:** crea la venta del ejemplo con dos ítems; verifica S/ 259.60. Edita un precio, desactiva IGV y recarga. Marca Pagada con fecha/método/referencia: Editar y Eliminar deben desaparecer. Cancélala con un motivo y confirma que se conservan los ítems y el pago y bajan los ingresos pagados. Crea otro Borrador y elimínalo tras cancelar primero el diálogo.
2. **Gerente:** repite creación, edición, pago y cancelación. Puede asignar responsables activos y eliminar borradores seguros; sigue sin tener acceso a Usuarios.
3. **Vendedor:** crea y edita una venta Borrador/Pendiente y registra pago. El responsable nuevo debe ser su cuenta; no puede reasignar, cancelar ni eliminar. La Pagada debe quedar bloqueada para editar.
4. **Desde oportunidad:** abre una Ganada y pulsa Nueva venta. Verifica los tres campos preseleccionados y el precio base propuesto, ajusta ítems/IGV y guarda. La oportunidad y el cliente deben conservar sus IDs. Una oportunidad abierta no ofrece esa acción ni se puede asociar mediante RPC.
5. **Persistencia y responsables:** recarga listado y detalle. Inactiva a un responsable desde Usuarios: las ventas previas conservan su nombre, pero no se ofrece para nuevas asignaciones. Combina filtros y revisa los estados vacíos.
6. **SQL real:** ejecuta opcionalmente [supabase/tests/sales.sql](supabase/tests/sales.sql) completo después de la migración. Comprueba los tres roles, anon/inactivos, pagos bloqueados, borrados, totales manipulados, reintentos, numeración, versiones obsoletas, asignaciones y trazabilidad. Termina en `ROLLBACK`; ante una excepción ejecuta `ROLLBACK`. Es una verificación, no una segunda migración.

Comandos de verificación: `npm run typecheck`, `npm run lint`, `npm run build -- --webpack` y `npm run test:e2e`. Playwright añade pruebas de Ventas y conserva las regresiones de Auth, Clientes, Leads, Oportunidades y Usuarios. El navegador usa exclusivamente el servicio HTTP simulado local. En esta etapa también se validaron las migraciones y los SQL de permisos en un **clúster temporal PostgreSQL 17**, con funciones mínimas de Auth para las identidades ficticias. Se aplicó `sales.sql` dos veces y pasó la prueba de concurrencia: 24 solicitudes, 17 ventas/números únicos y ocho reintentos de la misma alta produciendo una sola venta. Estas pruebas locales no ejecutan ni sustituyen la activación y verificación del proyecto Supabase remoto.

Archivos creados: `src/features/sales/` (tipos, cálculos, validación, estadísticas, permisos, servicios, hook, formulario, acciones, resumen, listado y detalle), `src/app/(crm)/ventas/`, `supabase/sales.sql`, `supabase/tests/sales.sql` y `tests/sales.spec.ts`. Se modifican tipos de Supabase, Sidebar/Header/aviso del layout, acción Nueva venta y mensaje de relaciones de Oportunidades, conservación del foco al mover tarjetas entre etapas, ESLint para ignorar reportes generados y este README. No se reconstruyen los módulos anteriores ni se utiliza `service_role` en Ventas.

## Tareas y seguimiento comercial

### Activación manual en el proyecto existente

1. Abre **Supabase → SQL Editor** en tu proyecto actual y ejecuta completo [supabase/tasks.sql](supabase/tasks.sql). Como los módulos anteriores ya están instalados, **solo ejecuta `tasks.sql`**; no repitas `schema.sql` ni las migraciones anteriores. La migración está en una transacción, puede repetirse sobre su propio esquema y no modifica las políticas de otros módulos.
2. No hay nuevas dependencias ni variables de entorno. Conserva tu `.env.local`. Ejecuta `npm ci` únicamente si necesitas instalar dependencias y después `npm run dev -- --webpack`.
3. Inicia sesión con una cuenta activa y abre **`/tareas`**. **`/tareas/[id]`** muestra el detalle. Calendario y Reportes siguen marcados «Pronto».
4. Opcionalmente ejecuta completo [supabase/tests/tasks.sql](supabase/tests/tasks.sql) en SQL Editor para comprobar permisos y persistencia. Introduce datos ficticios aislados y termina en `ROLLBACK`; si interrumpes o falla, ejecuta `ROLLBACK`. Es una prueba, no una migración.

No se ejecuta nada en tu Supabase remoto automáticamente. El módulo usa la sesión de Supabase Auth y la clave pública existente, sin `service_role` en Tareas.

### Crear, relacionar y consultar

Pulsa **Nueva tarea**. Completa título (2–160 caracteres), tipo, prioridad, responsable, estado y vencimiento. Puedes añadir descripción (hasta 3000 caracteres), inicio y recordatorio. El inicio y el recordatorio deben ser anteriores o iguales al vencimiento; se permiten tareas vencidas para registrar pendientes reales. Las fechas `datetime-local` se interpretan explícitamente en **America/Lima (UTC−5)**, aunque el navegador esté en otra zona, y se guardan como `timestamptz` en UTC.

**Relacionado con** permite elegir **Ninguno**, **Cliente**, **Lead**, **Oportunidad** o **Venta**, y luego seleccionar un registro existente. Cada tarea tiene como máximo una relación directa. Una tarea de oportunidad o venta conserva esa relación sin copiar ni modificar clientes, leads, etapas o pagos. Los cuatro módulos comerciales ofrecen el icono **Nueva tarea** en sus acciones, que abre el formulario con el registro preseleccionado. En Ventas también aparece desde su detalle. El responsable del registro se propone cuando está activo y tu rol permite asignarlo; Vendedor siempre crea para sí mismo.

La lista principal muestra tipo, relación enlazada, responsable, prioridad, estado, vencimiento y acciones; pagina diez tareas. El buscador incluye título, descripción y nombre del registro relacionado, incluidas ventas. Los filtros combinan estado, prioridad, tipo, responsable, fechas inclusivas de vencimiento en Lima y Vencidas/Para hoy. **Tablero** agrupa las cuatro etapas, incluida Cancelada, con las mismas acciones y filtros; no requiere arrastrar tarjetas. El detalle muestra descripción, responsable, creador, relación, todas las fechas y estado.

Los indicadores son globales e independientes de los filtros:

- **Pendientes:** estado Pendiente.
- **Vencidas:** Pendiente/En progreso con vencimiento estrictamente anterior a ahora.
- **Para hoy:** Pendiente/En progreso cuyo vencimiento cae en el día actual de Lima; puede incluir tareas ya vencidas hoy.
- **Completadas este mes:** estado Completada y fecha `completada_at` en el mes actual de Lima.

El Resumen conserva sus métricas y diseño e incorpora **Seguimiento comercial**, con tareas para hoy, vencidas y los primeros tres seguimientos abiertos ordenados por vencimiento (incluidas las vencidas). Los contadores se actualizan periódicamente; **Actualizar**, navegar o recargar vuelve a consultar Supabase. No hay suscripción Realtime en esta etapa.

### Completar, reabrir, cancelar y eliminar

- **Completar:** acción rápida que persiste inmediatamente el estado Completada y registra `completada_at` con la hora del servidor. Editar una tarea que sigue Completada conserva su fecha de finalización.
- **Reabrir:** disponible en Completadas, vuelve a Pendiente y limpia `completada_at`. Administrador/Gerente pueden hacerlo en todas; Vendedor solo en las propias. El formulario también permite pasar a En progreso.
- **Cancelar tarea:** solicita confirmación y conserva el registro como Cancelada; deja de contar como abierta o vencida. Una cancelada no se reabre ni elimina: crea una nueva tarea para retomar el seguimiento. Su información puede corregirse sin cambiar ese estado.
- **Eliminar:** solo Administrador/Gerente y únicamente tareas generales Pendientes, sin relación comercial ni actividad previa. `actividad_at` conserva la primera salida de Pendiente, por lo que completar y reabrir no habilita una eliminación posterior. En el resto de casos se usa Cancelar. Vendedor no elimina tareas en esta primera versión.

### Roles, RLS y consistencia

| Operación | Administrador | Gerente | Vendedor activo |
| --- | --- | --- | --- |
| Ver todas y crear | Sí | Sí | Sí; responsable propio |
| Editar, completar, reabrir y cancelar | Todas | Todas | Solo asignadas a su cuenta |
| Asignar/reasignar | A perfiles activos | A perfiles activos | No |
| Eliminar una general pendiente sin actividad | Sí | Sí | No |

`tareas_read` exige un perfil activo con uno de los tres roles. Se revocan permisos INSERT/UPDATE/DELETE directos; `save_task`, `set_task_status` y `delete_task` comprueban permisos, estado y versión `updated_at` bajo bloqueo de fila. Vendedor no puede modificar una tarea ajena aunque la haya creado antes de que se reasignara. Las funciones `SECURITY DEFINER` usan `search_path` vacío y solo se conceden a `authenticated`; anónimos e inactivos no pueden operar. Los campos de auditoría no son parámetros editables.

`task_responsibles()` devuelve únicamente ID, nombres, rol y estado de perfiles activos y de creadores/responsables históricos referenciados, sin ampliar la política SELECT de Profiles. Una asignación nueva exige perfil activo; un responsable histórico inactivo puede conservarse al editar. Las claves foráneas `ON DELETE RESTRICT` impiden eliminar clientes, leads, oportunidades, ventas o perfiles aún relacionados. El alta usa una referencia UUID estable para que repetir una solicitud cuya respuesta se perdió no cree otra tarea; cambios simultáneos muestran un mensaje de actualización necesaria.

### Pruebas manuales por rol

1. **Administrador:** crea una tarea general y otra desde cada módulo comercial; comprueba preselección y enlaces. Edita descripción/fechas, reasigna a otro perfil activo, completa, recarga y reabre. Cancela con confirmación y verifica que permanece. Elimina otra tarea general pendiente sin actividad. Inactiva a un responsable y verifica que sus tareas anteriores conservan el nombre y que no se ofrece para nuevas asignaciones.
2. **Gerente:** repite creación, edición, reasignación, completar, reabrir y cancelar. Puede eliminar solo generales pendientes sin actividad; no obtiene permisos administrativos de Usuarios.
3. **Vendedor:** crea y edita su propia tarea; Responsable debe estar bloqueado a su cuenta. Completa, recarga y reabre. Consulta una tarea de otro responsable: no debe ofrecer edición, completar ni cancelación. No debe aparecer Eliminar. La prueba SQL verifica que invocar RPC directamente tampoco permite reasignar ni modificar/eliminar tareas ajenas.
4. **Fechas y consultas:** registra una tarea para ayer, otra para hoy y otra para mañana. Verifica Vencida/Hoy/Próxima, combina filtros, busca por descripción y por cliente/lead/oportunidad, cambia entre Lista/Tablero y revisa estados vacíos. Completar y cancelar deben excluirlas de vencidas y tareas para hoy.
5. **Recordatorio:** guarda una hora antes del vencimiento y comprueba su visualización en lista y detalle tras recargar. Solo se prepara el dato: no se envían emails, push ni WhatsApp.

Verificación local: `npm run typecheck`, `npm run lint`, `npm run build -- --webpack`, `npm run test:e2e -- tests/tasks.spec.ts` y la suite completa `npm run test:e2e`. Playwright usa transporte HTTP simulado local para los flujos de interfaz. En PostgreSQL 17 temporal se aplicó `tasks.sql` dos veces, pasó `supabase/tests/tasks.sql` y pasaron las cinco pruebas SQL de los módulos anteriores. También pasó la concurrencia: 16 solicitudes crearon nueve tareas únicas (ocho reintentos de una misma alta crearon una sola), y dos actualizaciones con la misma versión aceptaron solo una. El servidor temporal se detuvo al terminar. Estas pruebas no sustituyen la aplicación de la migración y las pruebas con tus cuentas reales de Supabase.

Archivos nuevos: `src/features/tasks/` (tipos estrictos, fechas/estadísticas, validación, permisos, servicio, hook/directorio, formulario, acciones, lista/tablero, detalle, enlace comercial y bloque de Resumen), `src/app/(crm)/tareas/`, `supabase/tasks.sql`, `supabase/tests/tasks.sql` y `tests/tasks.spec.ts`. Archivos modificados: tipos de Supabase, Sidebar, Header, aviso del layout, acciones de Clientes/Leads/Oportunidades/Ventas, búsqueda por ID y parámetro `buscar` en Leads/Oportunidades para enlazar relaciones, mensajes de claves foráneas, composición de Resumen y este README. Se conserva `package-lock.json`, sin nuevas dependencias.

**Siguiente etapa: Calendario.** Quedan fuera de esta entrega calendario completo, notificaciones push, email automático, WhatsApp, recurrencias complejas, reportes completos y multiempresa.
