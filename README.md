# Nexo CRM

CRM con Next.js 16 App Router, TypeScript, Tailwind y shadcn/ui. Clientes conserva su CRUD persistente en Supabase. El acceso al CRM usa Supabase Auth, perfiles y permisos respaldados por RLS.

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

**No vuelvas a ejecutar `supabase/schema.sql` después:** contiene las políticas públicas temporales de la etapa anterior. Se conserva como historial. En un proyecto nuevo, el orden es `schema.sql`, opcionalmente `seed.sql`, y finalmente `auth_roles.sql` antes de usar la aplicación.

Este repositorio no ejecuta migraciones contra tu proyecto remoto. Hasta que apliques el SQL, las políticas anteriores seguirán vigentes y el acceso al CRM requerirá completar la configuración de perfiles.

### 2. Desactivar el registro público

En **Authentication → Sign In / Providers** (configuración de proveedores de Auth), desactiva **Allow new users to sign up** y los inicios de sesión anónimos. Mantén el proveedor Email para iniciar sesión con contraseña.

No hay formulario de registro, OAuth ni recuperación automática de contraseña. La creación de usuarios es controlada por el operador del proyecto desde Supabase Dashboard.

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

Perfiles: `profiles_read_self` y `profiles_update_self` permiten consultar el perfil propio y actualizar nombres/apellidos si está activo. El permiso SQL `UPDATE (nombres, apellidos)` impide modificar `rol`, `activo`, `email`, `id` y otros campos desde la API, incluso al Administrador. Los cambios de rol se realizan por ahora solo desde Supabase Dashboard/SQL Editor. No se permite insertar ni eliminar perfiles desde el cliente; el trigger los crea y `auth.users` controla su ciclo de vida.

La restricción de eliminar para Vendedores existe en RLS además de ocultar el botón. PostgreSQL puede responder con cero filas eliminadas en vez de un error; el servicio no presenta una eliminación exitosa si no se eliminó ninguna fila. Un cambio de rol en Supabase se refleja en la interfaz al recargar; RLS usa el valor actualizado en cada operación.

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

Administración de usuarios, recuperación de contraseña, asignación individual por responsable, Leads, oportunidades, seguimiento, cotizaciones, ventas, tareas, calendario y reportes. No se incorporan multiempresa, facturación ni pagos en esta etapa.
