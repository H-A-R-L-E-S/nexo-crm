# Fase 5B · Configuración

Fecha: 2026-10-15  
Alcance: `/configuracion`, apariencia y accesos existentes  
Design Read: configuración empresarial para miembros de Nexo, con selección de apariencia directa y contexto de cuenta verificable. ENERGY 2 / RHYTHM 2 / MOTION 2.

## Objetivo

Convertir Configuración en una página clara y profesional sin inventar preferencias. La jerarquía se apoya en tres acciones o datos reales: revisar la cuenta, elegir Claro/Oscuro/Sistema y, solo para Administradores, abrir la gestión de Usuarios.

## Estado inicial

La ruta mostraba un encabezado, un enlace a Usuarios para Administradores y una lista de idioma, moneda, almacenamiento, rol y permisos. No ofrecía selección de apariencia dentro de la página ni acceso directo a la edición de perfil. El texto indicaba que las preferencias editables llegarían después, aunque el tema ya era funcional desde el header.

Al comenzar esta fase, `main` y `origin/main` estaban en `ef9cfa8`, commit de la Fase 5A. Existían dos archivos no rastreados ajenos a Configuración (`tatus` y `e 5A rediseño premium del modulo Usuarios…`); se preservaron y no forman parte de este trabajo.

## Cambios realizados

- Encabezado de Configuración con propósito concreto y jerarquía alineada con Nexo.
- Sección Cuenta con nombre, correo, rol, estado y enlace real a `/perfil`.
- Selector de apariencia con tres opciones funcionales: Claro, Oscuro y Sistema.
- Estado seleccionado visible mediante borde, fondo, texto y control radio, sin depender solo del color.
- Reutilización directa de `useTheme()` y del provider existente; no se creó un segundo sistema de temas.
- Contexto del espacio con idioma, moneda, almacenamiento y permisos presentado como información, sin controles ficticios.
- Acceso a Usuarios visible exclusivamente para Administrador mediante la comprobación de servidor existente.
- Loading de ruta específico, perceptible y compatible con reduced motion.
- Reflow de una composición de dos columnas en desktop a una columna en tablet/móvil.
- Ajuste adicional para zoom 200 %: cuenta, hechos del sistema y selector abandonan columnas que ya no caben.

## Archivos modificados

- `src/app/(crm)/configuracion/page.tsx`
- `src/app/(crm)/configuracion/loading.tsx` (nuevo)
- `src/features/settings/appearance-settings.tsx` (nuevo)
- `src/features/settings/settings.module.css` (nuevo)
- `tests/settings.spec.ts` (nuevo)
- `anti-slop/settings-evidence/settings-light-desktop.png` (nuevo)
- `anti-slop/settings-evidence/settings-dark-mobile.png` (nuevo)
- `anti-slop/settings-evidence/settings-system-tablet.png` (nuevo)
- `anti-slop/phase-5b-settings-2026-10-15.md` (nuevo)

## Funcionalidad y seguridad conservadas

- `requireProfile()` continúa protegiendo la ruta antes de renderizar datos.
- `isAdmin(profile.rol)` continúa controlando en servidor el acceso visual a Usuarios.
- `canDeleteClient(profile.rol)` sigue siendo la fuente de la descripción de permisos.
- Mi perfil conserva su formulario, servicio, validaciones y persistencia sin cambios.
- `ThemeProvider` conserva `attribute="class"`, `storageKey="nexo-theme"`, `defaultTheme="system"` y `enableSystem`.
- No se modificaron Supabase, Auth, RLS, SQL, sesiones, tokens, middleware, roles, permisos, servicios, consultas, contratos ni lógica comercial.
- Las pruebas usaron exclusivamente el servidor Supabase simulado local.

## Resultados exactos

| Comprobación | Resultado |
| --- | --- |
| `npm run lint` | PASS, 0 errores |
| `npm run typecheck` | PASS, `next typegen` y `tsc --noEmit` |
| `npm run build` | PASS, compilación y 14/14 páginas estáticas generadas |
| `npm run test:e2e -- tests/settings.spec.ts` | PASS, 4 aprobadas, 0 fallidas, 53.1 s |
| `npm run test:e2e -- tests/auth.spec.ts tests/themes.spec.ts` | PASS, 11 aprobadas, 0 fallidas, 2.4 min |
| Total relevante final | PASS, 15 aprobadas, 0 fallidas |

El build mostró el aviso preexistente de que Next.js ignora `C:\Users\Usuario\package-lock.json` porque está fuera del repositorio. No afectó la compilación. Dentro del sandbox, el build alcanzó TypeScript y recibió `spawn EPERM`; al ejecutarse con autorización para crear workers terminó correctamente.

## Cobertura verificada

### Configuración

- Datos reales de cuenta, rol y estado.
- Navegación a Mi perfil y Usuarios.
- Ocultación de administración para Vendedor.
- Diferencia de permisos mostrada para Administrador y Vendedor.
- Selección por ratón y teclado de Claro, Oscuro y Sistema.
- Persistencia en `localStorage` y tras recarga.
- Sistema reaccionando a cambios del esquema del dispositivo.
- Responsive a 320, 390, 768, 1024 y 1440 px.
- Zoom 200 %, foco visible y ausencia de overflow horizontal.
- `prefers-reduced-motion: reduce`.

### Regresión existente

- Redirección de rutas privadas al login.
- Validación de login y credenciales incorrectas.
- Edición segura del perfil y persistencia al recargar.
- Logout, sesiones revocadas, cookies falsas y cuentas bloqueadas.
- Perfil y menú de usuario en móvil.
- Tema por teclado, persistencia entre rutas y otro contexto.
- Sistema sin flash incorrecto y seguimiento del dispositivo.
- Contraste de tokens, portales, diálogos y controles en ambos temas.
- Oscuro en los módulos existentes, menús, estados y navegación.

## Responsive y accesibilidad

- Desktop: cuenta y contexto en columna auxiliar; apariencia ocupa el foco principal.
- Tablet: las secciones pasan a una sola columna y mantienen previews completas.
- Móvil: controles de tema al ancho disponible, objetivos táctiles globales de 44 px y contenido sin scroll horizontal.
- Zoom 200 %: previews se ocultan para priorizar nombre, descripción y selección; los datos pasan a una columna.
- Secciones etiquetadas con `aria-labelledby`, tema como `radiogroup`, opciones con `role=radio` y `aria-checked`.
- El tema activo se expresa con texto, radio, borde y superficie.
- Links y radios usan foco visible global; navegación por Space/Enter probada.
- Loading usa `role=status`; reduced motion elimina la animación del skeleton.
- La suite global de temas comprobó contraste textual y no textual en Claro y Oscuro sin fallos.

## Decisiones visuales y propósito

- La apariencia ocupa la superficie principal porque es la única preferencia editable de esta pantalla.
- Las previews muestran el efecto de cada tema antes de seleccionarlo; no son ilustraciones decorativas.
- Cuenta y contexto usan superficies más compactas porque informan y derivan a acciones existentes.
- Azul Nexo identifica contexto, selección y destinos; no se aplica a todos los elementos.
- Una sombra se reserva para Apariencia, que es el plano interactivo principal.
- Iconos Lucide se reutilizan por continuidad con el producto y describen cuenta, seguridad, equipo y tema.
- Motion se limita a hover, active, cambios de estado y loading; no hay animaciones perpetuas.

## Auditoría Anti Slop final

### Hard Gate

- R-02 PASS: el copy nuevo no usa em dash.
- R-03 PASS: 320, 768, 1024, 1440 y zoom 200 % sin overflow horizontal.
- R-17/R-18/R-36/R-38 PASS: no hay estadísticas, testimonios, claims ni datos fabricados.
- R-23 PASS: no se crearon assets, perfiles o navegación ficticia.
- R-24/R-26 PASS: cada enlace y selector tiene comportamiento real.
- R-25 PASS: la suite global de contraste pasó en Claro y Oscuro.
- R-27 PASS: existe loading de ruta; la página no depende de una colección con estados vacío/error propios.
- R-32 PASS: radios y links funcionan por teclado con foco visible.
- R-34 PASS: Claro, Oscuro y Sistema probados, incluida persistencia y cambio del dispositivo.
- R-35 PASS: build y click-through automatizado ejecutados.

### Purpose, liveliness y craftsmanship

- R-01/R-10/R-12/R-13 PASS: sin glow ni glass adicional; una sombra comunica el plano editable.
- R-04 PASS: iconos funcionales y coherentes con el vocabulario existente.
- R-05/R-14/R-20 PASS: composición derivada de las opciones reales, sin mosaico bento ni tarjetas repetidas de relleno.
- R-09/R-11 PASS: el estado actual es informativo y los radios conservan su forma semántica; no hay cápsulas decorativas generalizadas.
- R-19 PASS: MOTION 2, sin loops y con reduced motion.
- R-29 PASS: neutros, azul Nexo y estados semánticos existentes.
- Liveliness PASS: ENERGY 2 / RHYTHM 2 / MOTION 2; Apariencia es el foco, las previews forman el motivo visual y el azul es el acento deliberado.
- C-1 a C-5 PASS: decisiones justificadas, controles funcionales, contenido real, reflow verificado y ausencia de claims fabricados.

Resultado final de auditoría: PASS.

## Limitaciones restantes

- Idioma, moneda y almacenamiento son informativos porque no existen contratos para editarlos. Crear controles queda fuera de esta fase.
- Correo, rol y estado no se editan desde Mi perfil; se conserva la restricción existente y se explica en la UI.
- La prueba móvil no emula un teclado virtual físico; verifica viewport, foco, targets y overflow con Playwright.
- Los dos archivos no rastreados anómalos de la raíz preceden esta fase y se preservaron para no eliminar contenido sin autorización.
- No se modificó `DESIGN.md`: los patrones son locales a Configuración y no introducen una primitiva global nueva.
