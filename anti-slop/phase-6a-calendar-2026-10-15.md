# Fase 6A · Calendario comercial · 2026-10-15

## Resultado

Se habilitó `/calendario` como módulo protegido y funcional, alimentado por las tareas que el usuario actual ya puede consultar. No se creó una tabla de eventos, no se modificaron Supabase, RLS, SQL, roles, sesiones ni contratos de negocio.

## Funcionalidad implementada

- Vistas mensual, semanal y diaria con navegación anterior/siguiente, retorno a hoy y selector de fecha.
- Indicadores de hoy, selección y días adyacentes; semanas iniciadas en lunes.
- Tareas agrupadas por `fecha_vencimiento`, con hora real en Lima. No se inventaron eventos ni horarios diferentes al valor persistido.
- Agenda del día seleccionado con título, estado, condición vencida/próxima, prioridad, responsable y relación comercial.
- Acceso al detalle existente en `/tareas/[id]`.
- Alta con `TaskFormDialog` y `save_task`; la fecha elegida se precarga a las 09:00 de Lima como valor editable porque el contrato vigente exige fecha y hora.
- Filtros por texto, estado, prioridad y responsable; limpieza conjunta sin consultas nuevas.
- Loading, error con reintento, vacío global, día vacío, filtros sin resultados, títulos largos y límite visual para días con muchas tareas.
- Sidebar actualizado únicamente después de validar la ruta.

## Fuente de datos y permisos

`useTasks()` mantiene `getTasks()` y `getTasksDirectory()`. Supabase continúa aplicando el alcance autorizado; el calendario no amplía datos ni replica reglas en el navegador. La creación conserva `save_task`, validación, idempotencia y `canManageTasks` del módulo Tareas.

## Fechas

- Zona de presentación: `America/Lima`.
- Clave diaria: fecha Lima derivada del ISO guardado.
- Navegación civil calculada al mediodía de Lima para evitar desplazamientos de medianoche.
- Pruebas específicas: inicio de semana, cuadrícula 6×7, cambio diciembre/enero y 29 de febrero de 2028.
- Se conserva la semántica existente: `fecha_vencimiento` sigue siendo obligatoria y con hora. El proyecto no tiene un campo de “solo fecha”.

## Diseño, responsive y accesibilidad

Design Read: espacio operativo comercial con la cuadrícula como foco. ENERGY 3 / RHYTHM 2 / MOTION 2. El azul Nexo comunica selección y hoy; estados usan texto además de color. Las superficies permanecen planas salvo toolbar y agenda, con glass controlado por el shell existente.

Desktop muestra cuadrícula y agenda lateral; tablet desplaza la agenda arriba; móvil sustituye la cuadrícula mensual estrecha por selector de fecha y lista diaria, sin overflow horizontal. La vista diaria sigue disponible en móvil.

Controles nativos y botones tienen nombres accesibles, `aria-pressed`, regiones nombradas, foco global visible y targets táctiles heredados de 44 px. El período usa `aria-live`. Reduced motion elimina la entrada y transiciones del calendario; forced colors conserva hoy, selección y bordes de eventos.

## Archivos

- `src/app/(crm)/calendario/page.tsx`
- `src/app/(crm)/calendario/loading.tsx`
- `src/features/calendar/calendar-view.tsx`
- `src/features/calendar/calendar.module.css`
- `src/features/calendar/dates.ts`
- `src/features/tasks/task-form.tsx`
- `src/components/layout/sidebar.tsx`
- `tests/calendar-dates.spec.ts`

## Verificación ejecutada

- `npm run lint`: PASS, sin advertencias.
- `npm run typecheck`: PASS.
- `npm run build`: PASS; `/calendario` aparece como ruta dinámica protegida.
- `npx playwright test tests/calendar-dates.spec.ts`: PASS, 2/2.
- `npx playwright test tests/tasks.spec.ts`: PASS, 11/11.

No se ejecutó la suite E2E completa del repositorio ni una matriz visual automatizada específica de Calendario en navegadores/temas múltiples. No se declara PASS para esas verificaciones.

## Auditoría Anti Slop

- R-23: no se generaron assets.
- R-24/R-26: el enlace se habilitó con destino real; todos los controles tienen comportamiento.
- R-25/R-32: semántica, teclado, foco, texto de estado y forced colors presentes; no se depende solo del color.
- R-27: loading, error, reintento y vacíos presentes.
- R-34: solo se usan tokens de tema existentes; no se creó un sistema paralelo.
- R-35: lint, tipos, build y pruebas registradas arriba.
- R-37: dirección y diales declarados antes de implementar.
- R-38: no hay datos, métricas o claims ficticios en producción.
- UI: la cuadrícula responde a la tarea temporal, no a una plantilla de cards; iconos limitados a acciones semánticas.
- Human: navegación principal por teclado, etiquetas, estados legibles y alternativas de contraste.
- Layout mobile: agenda diaria reemplaza la cuadrícula mensual cuando deja de ser legible.

Delivery Gate: PASS para el alcance automatizado. La comprobación visual manual a 200 %, los tres temas y dispositivos físicos queda registrada como pendiente, no como aprobada.

## Límites y futuro

- No existe un campo de tarea “sin hora”; todas las tareas actuales tienen `fecha_vencimiento` con hora obligatoria. Una modalidad all-day requeriría autorización para cambiar contrato y persistencia.
- No se implementaron reuniones, videollamadas, sincronización externa, notificaciones ni drag-and-drop.
- La vista semanal organiza por día, no como rejilla horaria, porque el contrato no modela duración ni fin de evento.
- Si el volumen crece sustancialmente, una consulta por rango requerirá una evolución del servicio/backend respetando RLS; esta fase conserva la paginación completa vigente de Tareas.
