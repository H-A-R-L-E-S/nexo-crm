# Fase 7C.2.3G — integración local del flujo UUID en Clientes

Fecha: 29 de octubre de 2026 (America/Lima).

Commit base: `723d1d09c274bef90219f4769b7bc006c3fe287b` (`Cierra despliegue backend productivo fase 7C.2.3E`).

## Conclusión

**7C.2.3G WIRING LOCAL UUID = GO.**

El flujo UUID quedó conectado localmente a la ruta productiva `/clientes`, detrás de una bifurcación explícita. Con el flag en `false` se conserva el comportamiento legado; con el modo UUID se usa el formulario real, RPC, Auth/Profile, escrituras por `responsable_id` y concurrencia optimista. El valor productivo no cambió:

```ts
export const CLIENT_RESPONSIBLES_UUID_ENABLED = false;
```

GO significa que el wiring local está completo y validado. No autoriza activar ni desplegar el frontend.

## 1. Arquitectura final

```text
app/(crm)/clientes/page.tsx (Server Component)
  ├─ flag false → ClientsView(uuidEnabled=false)
  │                └─ ClientFormDialog → ClientsProvider → clients.service
  └─ flag true  → ClientsView(uuidEnabled=true)
                   ├─ actor desde AuthProvider/Profile
                   ├─ ClientUuidFormDialog
                   │   └─ ResponsibleSelector
                   └─ adapter productivo
                       ├─ getClientResponsibles → RPC client_responsibles
                       ├─ createAssignedCliente → INSERT responsable_id
                       └─ updateAssignedCliente → PATCH por id + updated_at
```

### Punto único de bifurcación

La página servidor calcula `uuidEnabled` y lo pasa como booleano serializable a `ClientsView`. El valor normal procede de `CLIENT_RESPONSIBLES_UUID_ENABLED`.

Para probar la rama `true` sin cambiar el flag se admite exclusivamente una excepción E2E con cuatro condiciones simultáneas:

1. query `responsables_uuid=enabled`;
2. `NEXO_E2E_CLIENT_RESPONSIBLES=enabled`;
3. Supabase configurado en loopback;
4. Host de petición loopback.

Una URL Supabase o Host remoto desactiva la excepción. No existe toggle de navegador o sesión productiva.

### Estado del provider

`ClientsProvider` conserva sus métodos legacy y añade dos entradas para filas ya persistidas:

- `acceptCreatedClient`: inserta al inicio y evita duplicar el mismo ID;
- `acceptUpdatedClient`: sustituye la fila por ID.

Ambas incrementan `mutationVersion`, actualizan `clientsRef` y evitan que una carga anterior sobrescriba la mutación.

### Diálogo UUID

`ClientUuidFormDialog` ahora soporta el mismo contrato de composición que el diálogo legacy:

- modo controlado/no controlado;
- `children` como trigger;
- `hideTrigger` para acciones de fila;
- `onCloseAutoFocus` para restaurar foco al menú;
- apertura inicial de la preview conservada.

No se eliminó `/prueba-responsables-clientes`: sigue aportando cobertura detallada de estados y está aislada por loopback. El wiring real se prueba adicionalmente sobre `/clientes`; la preview ya no es la única evidencia.

## 2. Comportamiento con flag `false`

- `/clientes` monta `ClientFormDialog`;
- altas llaman `createCliente` y continúan pendientes de vincular;
- ediciones llaman `updateCliente` y no modifican `responsable` ni `responsable_id`;
- no se llama `client_responsibles`;
- no se seleccionan ni escriben UUID;
- lista, filtros, CRUD, permisos visuales y módulos comerciales conservan comportamiento;
- Ana García mantiene texto exacto y UUID NULL al editar contacto.

La prueba operativa captura requests y confirma cero llamadas RPC/selecciones UUID y cero propiedades nuevas en el PATCH.

## 3. Comportamiento con flag `true`

### Lectura y selector

- la lista base continúa usando lectura dual de `clientes`;
- abrir alta/edición carga `public.client_responsibles(p_client_id)`;
- el actor visual procede de `AuthProvider`; el servicio vuelve a validar la sesión mediante `auth.getUser()` y Profile activo;
- homónimos se distinguen por UUID;
- inactivos/incompletos históricos se presentan, pero no se vuelven asignables;
- loading, vacío, error, reintento y búsqueda sin coincidencias permanecen disponibles.

### Creación

- requiere selección expresa por UUID;
- Vendedor solo puede seleccionarse a sí mismo;
- el navegador envía `responsable_id`, nunca `responsable`;
- PostgreSQL deriva y conserva el texto histórico;
- la fila devuelta se incorpora al provider sin reload.

### Edición

- Administrador/Gerente pueden seleccionar un UUID autorizado;
- Vendedor conserva pero no reasigna;
- el servicio vuelve a leer `responsable_id` antes de validar un cambio;
- el PATCH se condiciona por `id` y `updated_at` original;
- cero filas produce conflicto y no sobrescribe;
- si no cambia el responsable, el patch omite `responsable_id` y `responsable`;
- un histórico NULL puede editar otros campos sin vinculación automática.

## 4. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/app/(crm)/clientes/page.tsx` | Composición del modo legacy/UUID y excepción E2E estrictamente loopback. |
| `src/features/clients/clients-view.tsx` | Selección de diálogo, adapter real, actor Auth y actualización del provider. |
| `src/features/clients/clients-provider.tsx` | Acepta filas creadas/actualizadas por el servicio UUID. |
| `src/features/clients/client-uuid-form.tsx` | Contrato controlado de diálogo, trigger y restauración de foco. |
| `src/features/clients/responsibles-activation.ts` | Guard con decisión explícita inyectada desde el punto de composición; default sigue cerrado. |
| `src/features/clients/services/client-responsibles.service.ts` | Propaga la decisión revisada al guard y a cargas RPC anidadas. |
| `tests/unit/client-responsibles-activation.test.mjs` | Verifica default cerrado y composición explícita. |
| `tests/client-responsibles-ui.spec.ts` | Cuatro recorridos nuevos en `/clientes` real con modo UUID. |
| `anti-slop/phase-7c23g-clients-uuid-wiring.md` | Informe de la fase. |

No se modificaron `.env.local`, SQL, migraciones, RLS, Auth ni datos. Los archivos antiguos/no relacionados del `git status` se preservaron.

## 5. Pruebas ejecutadas

| Comando | Resultado |
|---|---|
| `npm run typecheck` (temprano) | PASS. |
| `npm run typecheck` (final con pruebas) | PASS; `next typegen` y `tsc --noEmit`. |
| `npm run lint` | PASS, sin diagnósticos. |
| `npm run test:unit` | PASS, 62/62. |
| `npx playwright test tests/client-responsibles-ui.spec.ts` | PASS, 25/25. |
| `npm run build` | PASS, Next 16.3.6/Turbopack, TypeScript y 16 páginas. |
| `npx playwright test tests/crm.spec.ts tests/directories-ui.spec.ts tests/leads.spec.ts tests/opportunities.spec.ts tests/sales.spec.ts tests/reports.spec.ts` | PASS, 59/59. |
| `git diff --check` | PASS. |

Cobertura Playwright específica:

- 21 escenarios previos: roles, históricos, homónimos, inactivos/incompletos, errores, accesibilidad, temas y responsive;
- legacy real en `/clientes`: no RPC, no UUID y Ana García conservada;
- alta UUID real simulada: `responsable_id`, sin nombre enviado;
- edición de histórico NULL: contacto cambia sin tocar identidad;
- reasignación: UUID y filtro `updated_at=eq...` presentes;
- error RPC: alta bloqueada, mensaje y reintento visibles.

Total local de esta fase: 62 unitarias y 84 escenarios Playwright aprobados.

## 6. Accesibilidad, responsive y temas

La integración reutiliza el componente ya validado y conserva:

- `combobox`/`listbox`, estados y descripciones enlazadas;
- Arrow Up/Down, Home/End, Enter y Escape en dos pasos;
- retorno de foco al trigger/menú al cerrar;
- foco visible y targets táctiles;
- contraste de texto y controles medido;
- Claro, Oscuro y Sistema;
- 320, 640, 900 y 1280 px sin overflow;
- texto al 200% y reduced motion;
- carga, vacío, error, reintento y ausencia de coincidencias perceptibles.

No se introdujeron cambios visuales nuevos; el wiring conecta componentes aprobados al flujo real.

## 7. Riesgos restantes

1. No se ejecutó ningún smoke contra producción en esta fase.
2. La rama UUID real se validó con mocks HTTP locales; RLS/PostgREST real fue validado previamente en 7C.2.3C y desplegado en 7C.2.3E, pero debe comprobarse nuevamente antes/después de activar.
3. La lista principal continúa presentando `responsable` histórico. Es deliberado para compatibilidad; la identidad UUID actual se ve en el formulario. Cambiar esa presentación requiere alcance separado.
4. La activación es un cambio de código y despliegue; no debe combinarse con SQL u otras funcionalidades.
5. La query E2E no es una autorización: solo funciona con todos los guards loopback y el backend sigue imponiendo permisos.

## 8. Condiciones GO / NO-GO para activación real

### GO solo si

- revisión humana aprueba este diff y el commit candidato;
- `CLIENT_RESPONSIBLES_UUID_ENABLED` es el único cambio funcional de activación posterior;
- build y suites de este informe se repiten sobre el commit candidato;
- configuración de producción no contiene `NEXO_E2E_CLIENT_RESPONSIBLES=enabled`;
- `/prueba-responsables-clientes` y `?responsables_uuid=enabled` no habilitan UUID con Host/Supabase remotos;
- smokes read-only productivos de RPC aprueban para Administrador, Gerente, Vendedor, inactivo y anon;
- fingerprint/historia backend siguen conformes;
- ventana, observación y rollback frontend están aprobados.

### NO-GO si

- cualquier test falla o el diff incluye cambios ajenos;
- el flag deja de ser el único gate productivo;
- la rama false genera RPC o columnas UUID;
- la rama true permite nombre como identidad, asignación implícita o fallback legacy de alta;
- Vendedor reasigna o anon/inactivo consulta responsables;
- falla RPC/RLS, concurrencia o preservación histórica;
- variables/mocks E2E aparecen en el entorno productivo.

Estado al cierre: **GO para preparar una activación separada; flag todavía false**.

## 9. Rollback del frontend

Si una activación futura falla:

1. cambiar únicamente `CLIENT_RESPONSIBLES_UUID_ENABLED` a `false`;
2. reconstruir y redesplegar el frontend;
3. comprobar que `/clientes` vuelve al formulario legacy y no llama RPC UUID;
4. conservar backend, columna, FK, índice, trigger, RPC, texto y UUID existentes;
5. no ejecutar SQL, no vaciar UUID, no reconstruir nombres ni hacer backfill;
6. verificar Clientes, Leads, Oportunidades, Ventas y Reportes;
7. investigar y corregir hacia adelante antes de reactivar.

La lectura dual y el provider permanecen compatibles en ambos modos, por lo que el rollback de UI no destruye identidad ni historia.

## 10. Delivery gate Anti Slop

- Core: PASS; todos los controles tienen comportamiento real y estados completos.
- UI: PASS; se reutiliza el selector aprobado sin introducir decoración o jerarquía nueva.
- Human: PASS; teclado, foco, contraste, mensajes y estados están cubiertos.
- Layout mobile: PASS; reflow y overflow fueron verificados entre 320 y 1280 px.
- Evidencia: PASS local; build, 62 unitarias y 84 Playwright aprobados.
