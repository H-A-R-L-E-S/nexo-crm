# Fase 7C.2.3F — preflight de activación del frontend UUID

Fecha: 29 de octubre de 2026 (America/Lima).

Commit auditado: `723d1d09c274bef90219f4769b7bc006c3fe287b` (`Cierra despliegue backend productivo fase 7C.2.3E`).

## Conclusión

**7C.2.3F PREFLIGHT FRONTEND UUID = NO-GO.**

El backend productivo está desplegado y el contrato frontend preparado coincide con sus tipos, permisos y errores. Sin embargo, el formulario UUID no está conectado al flujo real de `/clientes`. Cambiar únicamente `CLIENT_RESPONSIBLES_UUID_ENABLED` a `true` habilitaría los guards internos de los servicios, pero ningún componente productivo los invoca. La activación sería inefectiva, no un cambio funcional acotado.

No se corrigió esta diferencia porque el alcance solicitado es preparación y validación. El flag permanece en `false`.

## 1. Estado actual

- backend 7C.2.3E aplicado y validado según el cierre productivo aportado;
- `clientes.responsable_id` disponible como UUID nullable;
- RPC `public.client_responsibles(uuid)` invocadora, autenticada y fuera de acceso anon;
- directorio privado fuera de Data API;
- texto `responsable` conservado como historia;
- mapeo de lectura dual disponible;
- componentes, contratos, servicio UUID y mocks locales implementados;
- flujo operativo real todavía legado;
- `CLIENT_RESPONSIBLES_UUID_ENABLED = false` confirmado por código y prueba unitaria.

No se conectó a producción, no se ejecutó SQL, no se modificó `.env.local`, no hubo migraciones, backfill, commit ni push.

## 2. Trazado del flujo real

### Lectura y mapeo

`ClientsProvider` carga con `getClientes()`. El servicio usa `select('*')`, por lo que el esquema desplegado devuelve tanto `responsable` como `responsable_id`. `toClient()` conserva ambos separadamente:

- `owner = row.responsable` mantiene el texto histórico byte por byte;
- `ownerId = row.responsable_id ?? null` mantiene UUID o NULL;
- una fila anterior a la expansión sin la propiedad nueva también se interpreta como NULL.

La lista y el filtro actuales siguen presentando/filtrando `client.owner`, no identidad UUID. Esto mantiene compatibilidad histórica, pero no muestra en el directorio general el nombre actual del perfil vinculado.

### Alta y edición productivas actuales

El recorrido vigente es:

```text
/clientes
  → ClientsView
  → ClientFormDialog
  → useClients()
  → ClientsProvider.addClient/updateClient
  → createCliente/updateCliente
```

Ese flujo:

- no importa `ClientUuidFormDialog`;
- no construye un `ClientResponsibleFormAdapter`;
- no llama `getClientResponsibles`, `createAssignedCliente` ni `updateAssignedCliente`;
- en alta escribe contacto y `responsable = 'Sin asignar'` sin UUID;
- en edición escribe solo contacto y conserva texto/UUID existentes;
- muestra el responsable histórico como campo read-only;
- informa que las reasignaciones todavía no están habilitadas.

### Flujo UUID preparado pero aislado

`ClientUuidFormDialog` está conectado únicamente a `/prueba-responsables-clientes/preview.tsx`, mediante un adaptador de mocks. No existe referencia productiva desde `ClientsView`, `ClientFormDialog` o `ClientsProvider`.

El servicio real preparado sí implementa:

- guard central `assertClientResponsiblesEnabled()` antes de red;
- actor autenticado obtenido mediante Auth y su Profile activo;
- RPC mínima `client_responsibles` con `p_client_id` nullable;
- validación frontend por UUID, rol, actividad, perfil completo y `can_assign`;
- alta con `responsable_id` sin escribir texto histórico desde el navegador;
- actualización condicionada por `updated_at`;
- omisión total de `responsable_id` al editar otros campos sin reasignar;
- traducción de SQLSTATE `42501`, `23503`, `23505`, `22023`, `22P02` y `40001`.

### Ruta de prueba

La ruta `/prueba-responsables-clientes` aparece como ruta dinámica en el build, pero su contenido requiere simultáneamente:

- `NEXO_E2E_CLIENT_RESPONSIBLES=enabled`;
- URL Supabase loopback;
- Host de petición loopback.

La prueba E2E confirmó que un Host público recibe rechazo aunque el servidor local tenga mocks habilitados. Con la URL productiva remota, el guard no permite montar la preview.

## 3. Contrato funcional revisado

### Creación

- Administrador/Gerente: pueden elegir un candidato activo, completo y `can_assign=true`.
- Vendedor: solo puede elegir explícitamente su propio UUID elegible.
- no hay selección por defecto ni resolución por nombre;
- homónimos se distinguen por UUID;
- un directorio vacío o con error impide crear con una identidad inventada.

### Edición

- Administrador/Gerente pueden cambiar a un UUID autorizado;
- Vendedor conserva la asignación pero no reasigna;
- una edición de contacto sin cambio de responsable omite `responsable_id` del patch;
- `updated_at` original se conserva con microsegundos y condiciona la escritura;
- cero filas actualizadas se convierte en conflicto y no reintenta sin condición.

### Historia y NULL

- Ana García se presenta con su texto exacto y `Pendiente de vincular` cuando `ownerId = null`;
- editar otros campos conserva texto y NULL;
- cancelar una selección vuelve al estado histórico sin asignación automática;
- referencias ya vinculadas a perfiles inactivos o incompletos se muestran y conservan;
- una referencia vinculada ausente del directorio conserva UUID y texto, sin inventar nombre;
- el frontend no permite vaciar una referencia UUID existente.

### Presentación y selector

- búsqueda por nombre, rol, estado o UUID, sin distinguir acentos/mayúsculas;
- máximo visual de 100 opciones y aviso para refinar;
- estados activo, inactivo e incompleto expresados con texto;
- carga, vacío, error, reintento y sin coincidencias presentes;
- `combobox`/`listbox`, `aria-activedescendant`, Arrow Up/Down, Home/End, Enter y Escape;
- Escape cierra primero la lista y mantiene el diálogo;
- UUID visible para desambiguación;
- responsive sin overflow en 320, 640, 900 y 1280 px;
- temas Claro, Oscuro y Sistema, reduced motion, foco y contraste medidos;
- texto al 200% y recorrido de teclado verificados.

## 4. Diferencia bloqueante

| Contrato esperado para activar | Estado encontrado | Decisión |
|---|---|---|
| El flag selecciona entre flujo legado y UUID en `/clientes`. | Ningún componente productivo lee el flag. | NO-GO |
| Alta real usa `createAssignedCliente`. | `ClientsProvider.addClient` usa siempre `createCliente`. | NO-GO |
| Edición real usa `updateAssignedCliente` y `updated_at`. | `ClientsProvider.updateClient` usa siempre `updateCliente`, sin concurrencia optimista. | NO-GO |
| Formulario real carga RPC y selector UUID. | `ClientsView` monta siempre `ClientFormDialog` legado. | NO-GO |
| Tests ejercitan el flujo UUID desde `/clientes`. | Los 20 escenarios UUID funcionales usan la preview; el caso 21 verifica expresamente que `/clientes` sigue legado. | NO-GO |

No hay incompatibilidad detectada entre el servicio UUID aislado y el contrato backend productivo. La incompatibilidad es de ensamblaje: el servicio correcto no tiene consumidor productivo.

## 5. Pruebas ejecutadas

| Comando | Resultado real |
|---|---|
| `npm run test:unit` | PASS, 62/62. Contratos UUID, permisos, legacy, mapping, concurrencia y flag cerrado. |
| `npm run lint` | PASS, sin diagnósticos. |
| `npm run typecheck` | PASS, `next typegen` y `tsc --noEmit`. |
| `npm run build` | Primer intento: infraestructura, `spawn EPERM` después de compilar. Repetido fuera de la restricción: PASS con Next 16.3.6, TypeScript y 16 páginas. |
| `npx playwright test tests/client-responsibles-ui.spec.ts` | Primer intento: infraestructura, `spawn EPERM`. Repetido con procesos locales autorizados: PASS, 21/21. |
| `npx playwright test tests/crm.spec.ts tests/directories-ui.spec.ts tests/leads.spec.ts tests/opportunities.spec.ts tests/sales.spec.ts tests/reports.spec.ts` | PASS, 59/59. Clientes legado, Leads, Oportunidades, Ventas y Reportes sin regresión. |

Total ejecutado en esta fase: 62 unitarias y 80 escenarios Playwright aprobados. Los fallos `spawn EPERM` fueron intentos de infraestructura anteriores a la ejecución válida y quedaron resueltos al repetir localmente con permiso de procesos; no se atribuyen al código.

No se reejecutaron pruebas PostgreSQL/RLS ni HTTP productivas. 7C.2.3C ya validó el backend aislado y 7C.2.3E documentó el despliegue; esta fase no puede atribuir un nuevo PASS de producción.

## 6. Riesgos

### Bloqueante

1. **Activación inefectiva:** cambiar solo el booleano no modifica `/clientes`. Podría desplegarse creyendo que la función está activa cuando el usuario seguiría en el flujo legado.

### Antes de una activación futura

2. El adaptador productivo y la actualización del estado de `ClientsProvider` necesitan integración y pruebas en la ruta real.
3. La tabla/lista sigue mostrando el texto histórico. Debe decidirse explícitamente si, tras integrar, continúa así o presenta identidad vinculada más historia sin romper filtros/reportes.
4. Los tests de preview no demuestran que AuthProvider, apertura desde menú, restauración de foco y estado global funcionen una vez ensamblados en `/clientes`.
5. Los smokes productivos de RPC por Administrador/Gerente/Vendedor no se documentaron como ejecutados en 7C.2.3E; deben preceder cualquier escritura UUID real.
6. Una respuesta inesperada de directorio debe mantener el formulario y la historia; no habilitar fallback al servicio legado para un alta UUID.

## 7. Criterios GO / NO-GO

### GO requiere todos

- integración productiva revisada que use el flag en un único punto de composición;
- con flag `false`, flujo legado idéntico y cero requests UUID;
- con flag `true`, alta y edición reales usan formulario/adaptador/servicios UUID;
- actor real proviene de AuthProvider y coincide con sesión/Profiles;
- `ClientsProvider` incorpora la fila devuelta sin recargas o duplicados;
- edición sin reasignación conserva `responsable`, `responsable_id` y usa `updated_at`;
- tests de `/clientes` cubren los tres roles, historial NULL, inactivo/incompleto, errores RPC y conflicto;
- ruta de preview continúa inaccesible fuera de loopback;
- lint, typecheck, build, unitarias y regresiones Playwright aprobadas después de la integración;
- smokes read-only productivos por roles y anon conformes;
- aprobación humana separada para cambiar el flag y desplegar.

### NO-GO inmediato

- el flag no controla el flujo productivo;
- cualquier fallback escribe texto como identidad o resuelve por nombre;
- alta UUID posible sin directorio autorizado;
- Vendedor puede reasignar;
- edición de contacto envía NULL o cambia responsable implícitamente;
- ruta/mocks de prueba accesibles con host o Supabase remotos;
- falla cualquier prueba o smoke sin explicación.

Estado actual: se cumple el primer NO-GO.

## 8. Procedimiento exacto de activación futura

Este procedimiento es una propuesta; requiere autorización de implementación separada.

1. Crear un único punto de composición productivo que lea `CLIENT_RESPONSIBLES_UUID_ENABLED` y seleccione formulario/adaptador UUID o legado.
2. Conectar el adaptador real a `getClientResponsibles`, `createAssignedCliente` y `updateAssignedCliente`.
3. Proveer `ClientActor` desde la sesión/Profile real ya cargada; no aceptar actor desde campos del navegador.
4. Integrar el resultado guardado en `ClientsProvider` conservando orden, referencias y estado de lista.
5. Mantener lectura dual y presentación histórica; no cambiar filtros/reportes sin alcance explícito.
6. Añadir pruebas E2E sobre `/clientes` con ambos valores del flag. El test UUID debe interceptar RPC/escrituras reales simuladas, no la preview.
7. Ejecutar nuevamente unitarias, lint, typecheck, build y las 80 regresiones de esta fase.
8. Ejecutar smokes productivos read-only de `client_responsibles(NULL)` con Administrador, Gerente, Vendedor, inactivo y anon; no escribir todavía.
9. Revisar artefacto, commit y ausencia de variables E2E en el despliegue.
10. Obtener aprobación humana explícita.
11. Cambiar únicamente `CLIENT_RESPONSIBLES_UUID_ENABLED` de `false` a `true` en un commit de activación identificable.
12. Construir y desplegar el frontend sin SQL, migraciones ni cambios Auth/RLS.
13. Ejecutar los smokes inmediatos de la sección siguiente.

Hasta completar 1–10, no cambiar el flag.

## 9. Smokes inmediatos después de activar

En una ventana controlada y con registros de prueba autorizados, no con Ana García:

1. **Carga:** `/clientes` lista filas existentes; texto histórico y UUID nullable no producen errores.
2. **Administrador:** abre alta, recibe directorio mínimo, distingue homónimos, crea con UUID autorizado y verifica texto derivado por backend.
3. **Gerente:** edita y reasigna un cliente de prueba autorizado; confirma UUID, texto y `updated_at` nuevos.
4. **Vendedor:** crea solo consigo mismo; intento de otro UUID es imposible en UI y rechazado por API directa.
5. **Edición sin responsable:** cambia solo contacto de un histórico NULL y comprueba que texto y NULL permanecen.
6. **Inactivo/incompleto:** referencias históricas visibles pero no seleccionables.
7. **Concurrencia:** dos ediciones con la misma versión; la segunda muestra conflicto sin sobrescribir.
8. **Errores:** sesión expirada, directorio 403/500 y save 403/409 conservan datos y permiten acción explícita.
9. **Bypass:** PATCH directo no autorizado sigue rechazado por PostgreSQL/RLS/trigger.
10. **Accesibilidad:** teclado completo, Escape en dos pasos, foco restaurado, 320 px y tema activo.
11. **Módulos:** Leads, Oportunidades, Ventas y Reportes siguen leyendo Clientes y relaciones sin error.
12. **Observación:** revisar SQLSTATE, errores PostgREST, latencia y métricas durante la ventana.

No usar el cliente histórico Ana García para un smoke de escritura ni vincularlo automáticamente.

## 10. Rollback exacto

El rollback es solo de frontend:

1. cambiar `CLIENT_RESPONSIBLES_UUID_ENABLED` de `true` a `false` en un commit de rollback;
2. reconstruir y redesplegar el frontend compatible;
3. verificar que `/clientes` vuelve al formulario legado y no llama RPC ni escribe `responsable_id`;
4. comprobar que lista, edición de contacto y módulos comerciales siguen operativos;
5. conservar backend, RPC, columna, FK, índice, triggers, texto histórico y UUID ya escritos;
6. no ejecutar SQL, no revocar objetos como reacción automática y no vaciar UUID;
7. investigar y corregir hacia adelante antes de una nueva activación.

No volver a una versión que ignore la existencia de UUID al mapear filas. El flujo legado actual es compatible porque `toClient()` conserva `ownerId`, y `updateCliente()` no sobrescribe ni texto ni UUID.

## 11. Confirmación del flag

```ts
export const CLIENT_RESPONSIBLES_UUID_ENABLED = false;
```

Confirmado por inspección, prueba unitaria y ausencia de diff en `src/features/clients/responsibles-activation.ts`. La Fase 7C.2.3F no activó el frontend UUID.

## 12. Delivery gate Anti Slop

- Core: PASS para los componentes aislados, respaldado por build y 21 escenarios específicos; el producto integrado queda NO-GO por funcionalidad incompleta, no se entrega como activado.
- UI: PASS en jerarquía, estados, desambiguación y temas de la preview; no se modificó diseño.
- Human: PASS en foco, teclado, mensajes, estados perceptibles y contraste medido.
- Layout mobile: PASS en 320/640/900/1280 px, texto 200%, objetivos táctiles y ausencia de overflow.
- Evidencia: no se afirma equivalencia productiva del flujo mientras `/clientes` continúe legado.
