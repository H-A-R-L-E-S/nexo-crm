# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tasks.spec.ts >> Administrador: crear, editar, asignación, completar, reabrir y cancelar
- Location: tests\tasks.spec.ts:71:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('row').filter({ hasText: 'Enviar propuesta comercial' })
Expected substring: "Completada"
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" getByRole('row').filter({ hasText: 'Enviar propuesta comercial' }) with timeout 15000ms
  - waiting for getByRole('row').filter({ hasText: 'Enviar propuesta comercial' })

```

```yaml
- link "Saltar al contenido":
  - /url: "#contenido"
- complementary:
  - link "Nexo CRM, ir al resumen":
    - /url: /
    - text: nexoCRM
  - paragraph: Mi empresa
  - paragraph: Espacio de trabajo
  - navigation "Navegación principal":
    - link "Resumen":
      - /url: /
    - paragraph: Gestión comercial
    - link "Clientes":
      - /url: /clientes
    - link "Leads":
      - /url: /leads
    - link "Oportunidades":
      - /url: /oportunidades
    - link "Ventas":
      - /url: /ventas
    - link "Tareas":
      - /url: /tareas
    - paragraph: Herramientas
    - button "Calendario Pronto"
    - button "Reportes Pronto"
  - link "Configuración":
    - /url: /configuracion
  - link "Usuarios":
    - /url: /configuracion/usuarios
  - button "Ayuda"
  - button "Menú de Carlos Prueba": CP Carlos Prueba Administrador
- banner:
  - text: Mi empresa Tareas
  - search "Búsqueda de clientes":
    - textbox "Buscar en Nexo":
      - /placeholder: Buscar clientes...
    - button "Ejecutar búsqueda"
  - button "Cambiar tema" [disabled]
  - button "Notificaciones"
  - button "Menú de Carlos Prueba": CP
- main:
  - heading "Tareas" [level=1]
  - paragraph: Organiza tus actividades y no pierdas ningún seguimiento.
  - button "Nueva tarea" [disabled]
  - paragraph: Pendientes
  - paragraph: —
  - paragraph: Estado Pendiente
  - paragraph: Vencidas
  - paragraph: —
  - paragraph: Pendientes o en progreso · Antes de ahora
  - paragraph: Para hoy
  - paragraph: —
  - paragraph: Actividades abiertas · Día actual en Lima
  - paragraph: Completadas este mes
  - paragraph: —
  - paragraph: Por fecha de finalización · Lima
  - region "Listado de tareas":
    - textbox "Buscar tareas":
      - /placeholder: Buscar título, descripción o relación...
    - button "Cargando..." [disabled]
    - group "Vista de tareas":
      - button "Lista" [pressed]
      - button "Tablero"
    - text: Estado
    - combobox "Filtrar por estado":
      - option "Todos" [selected]
      - option "Pendiente"
      - option "En progreso"
      - option "Completada"
      - option "Cancelada"
    - text: Prioridad
    - combobox "Filtrar por prioridad":
      - option "Todos" [selected]
      - option "Alta"
      - option "Media"
      - option "Baja"
    - text: Tipo
    - combobox "Filtrar por tipo":
      - option "Todos" [selected]
      - option "Llamada"
      - option "Reunión"
      - option "Correo"
      - option "Seguimiento"
      - option "Demostración"
      - option "Propuesta"
      - option "Cobro"
      - option "Otro"
    - text: Responsable
    - combobox "Filtrar por responsable":
      - option "Todos los responsables" [selected]
    - text: Fecha desde
    - textbox "Fecha desde"
    - text: Fecha hasta
    - textbox "Fecha hasta"
    - text: Vencimiento
    - combobox "Filtrar por vencimiento":
      - option "Todos los vencimientos" [selected]
      - option "Vencidas"
      - option "Para hoy"
    - button "Limpiar filtros"
    - status: Cargando tareas...
  - paragraph: Datos guardados en Supabase · Fechas y horas de Lima · Indicadores globales independientes de los filtros.
  - text: Nexo CRM · Hecho para conectar
- region "Notificaciones alt+T"
```

# Test source

```ts
  1   | import { expect, test, type Page } from "@playwright/test";
  2   | import { login } from "./support/login";
  3   | import { taskDateInput, taskStats, isOverdue, isToday } from "../src/features/tasks/dates";
  4   | import { toLimaInput } from "../src/features/leads/dates";
  5   | import { validateTask } from "../src/features/tasks/validation";
  6   | import type { CreateTask, Task, TaskStatus } from "../src/features/tasks/types";
  7   | const adminId = "00000000-0000-4000-8000-000000000001";
  8   | const managerId = "00000000-0000-4000-8000-000000000002";
  9   | const sellerId = "00000000-0000-4000-8000-000000000003";
  10  | const customerId = "11111111-1111-4111-8111-111111111111";
  11  | const leadId = "22222222-2222-4222-8222-222222222222";
  12  | const opportunityId = "33333333-3333-4333-8333-333333333333";
  13  | const saleId = "44444444-4444-4444-8444-444444444444";
  14  | const people = [{ id: adminId, nombres: "Carlos", apellidos: "Prueba", activo: true, rol: "Administrador" }, { id: managerId, nombres: "Lucía", apellidos: "Prueba", activo: true, rol: "Gerente" }, { id: sellerId, nombres: "Diego", apellidos: "Prueba", activo: true, rol: "Vendedor" }, { id: "00000000-0000-4000-8000-000000000004", nombres: "Inactivo", apellidos: "Prueba", activo: false, rol: "Vendedor" }];
  15  | const timestamp = "2026-10-01T12:00:00Z";
  16  | const customer = { id: customerId, nombres: "Ana", apellidos: "García", empresa: "Horizonte", correo: "ana@example.test", telefono: "999123456", cargo: "", estado: "Activo", direccion: "", notas: "", responsable: "Carlos Prueba", ultimo_contacto: null, created_at: timestamp, updated_at: timestamp };
  17  | const lead = { id: leadId, nombres: "Andrea", apellidos: "Torres", empresa: "", correo: "andrea@example.test", telefono: "999123456", cargo: "", fuente: "Web", estado: "Nuevo", prioridad: "Alta", responsable_id: sellerId, notas: "", ultimo_contacto: null, proximo_seguimiento: null, convertido_cliente_id: null, created_at: timestamp, updated_at: timestamp };
  18  | const opportunity = { id: opportunityId, titulo: "Implementación CRM", cliente_id: customerId, lead_id: null, responsable_id: sellerId, etapa: "Ganada", valor: "1000.00", probabilidad: 100, fecha_cierre_estimada: "2026-10-15", descripcion: "", origen: "Web", cerrada_at: timestamp, created_at: timestamp, updated_at: timestamp };
  19  | const sale = { id: saleId, numero: "V-2026-000001", cliente_id: customerId, oportunidad_id: opportunityId, responsable_id: sellerId, estado: "Borrador", moneda: "PEN", subtotal: "100.00", descuento: "0.00", impuesto: "18.00", total: "118.00", aplica_igv: true, fecha_venta: "2026-10-01", fecha_pago: null, metodo_pago: "", referencia_pago: "", observaciones: "", motivo_cancelacion: "", cancelada_at: null, cancelada_por: null, emitida_at: null, created_at: timestamp, updated_at: timestamp };
  20  | function fixture(overrides: Partial<Task> = {}): Task {
  21  |   return { id: crypto.randomUUID(), request_id: crypto.randomUUID(), titulo: "Llamar a Ana", descripcion: "Confirmar propuesta", tipo: "Llamada", estado: "Pendiente", prioridad: "Alta", responsable_id: adminId, cliente_id: null, lead_id: null, oportunidad_id: null, venta_id: null, fecha_inicio: null, fecha_vencimiento: new Date(Date.now() + 3600_000).toISOString(), recordatorio_at: null, completada_at: null, actividad_at: null, created_by: adminId, created_at: timestamp, updated_at: timestamp, ...overrides };
  22  | }
  23  | test.beforeEach(async ({ request }) => { await request.post("http://127.0.0.1:54321/__test/reset"); });
  24  | // Contrato de interfaz con transporte simulado. Permisos reales: supabase/tests/tasks.sql.
  25  | async function mockTasks(page: Page, initial: Task[] = []) {
  26  |   const rows = initial.map((task) => ({ ...task }));
  27  |   const requests = new Map<string, string>();
  28  |   let fail = false, stale = false, loseResponse = false, writes = 0;
  29  |   let actor = adminId;
  30  |   await page.route("http://127.0.0.1:54321/rest/v1/clientes**", (route) => route.fulfill({ json: [customer] }));
  31  |   await page.route("http://127.0.0.1:54321/rest/v1/leads**", (route) => route.fulfill({ json: [lead] }));
  32  |   await page.route("http://127.0.0.1:54321/rest/v1/oportunidades**", (route) => route.fulfill({ json: [opportunity] }));
  33  |   await page.route("http://127.0.0.1:54321/rest/v1/ventas**", (route) => route.fulfill({ json: [sale] }));
  34  |   await page.route(/\/rest\/v1\/rpc\/(task_responsibles|lead_responsibles|opportunity_responsibles|sale_responsibles)$/, (route) => route.fulfill({ json: people }));
  35  |   await page.route("http://127.0.0.1:54321/rest/v1/tareas**", (route) => {
  36  |     if (fail) return route.fulfill({ status: 503, json: { message: "Offline" } });
  37  |     const id = new URL(route.request().url()).searchParams.get("id")?.replace("eq.", "");
  38  |     return route.fulfill({ json: id ? rows.filter((row) => row.id === id) : rows });
  39  |   });
  40  |   await page.route("http://127.0.0.1:54321/rest/v1/rpc/save_task", async (route) => {
  41  |     const data = route.request().postDataJSON() as { p_id: string | null; p_request_id: string; p_data: CreateTask };
  42  |     if (stale) return route.fulfill({ status: 409, json: { code: "40001", message: "La tarea cambió. Actualiza antes de continuar." } });
  43  |     if (!data.p_id && requests.has(data.p_request_id)) return route.fulfill({ json: requests.get(data.p_request_id) });
  44  |     const previous = rows.find((row) => row.id === data.p_id);
  45  |     const task = { ...(previous ?? fixture({ created_by: actor, request_id: data.p_request_id })), ...data.p_data, completada_at: data.p_data.estado === "Completada" ? previous?.completada_at ?? new Date().toISOString() : null, actividad_at: previous?.actividad_at ?? (data.p_data.estado === "Pendiente" ? null : new Date().toISOString()), updated_at: new Date().toISOString() };
  46  |     if (previous) rows[rows.indexOf(previous)] = task; else { rows.unshift(task); requests.set(data.p_request_id, task.id); }
  47  |     writes++;
  48  |     if (loseResponse) { loseResponse = false; return route.abort("connectionreset"); }
  49  |     return route.fulfill({ json: task.id });
  50  |   });
  51  |   await page.route("http://127.0.0.1:54321/rest/v1/rpc/set_task_status", async (route) => {
  52  |     const data = route.request().postDataJSON() as { p_id: string; p_estado: TaskStatus };
  53  |     if (stale) return route.fulfill({ status: 409, json: { code: "40001", message: "La tarea cambió. Actualiza antes de continuar." } });
  54  |     const row = rows.find((task) => task.id === data.p_id)!;
  55  |     Object.assign(row, { estado: data.p_estado, completada_at: data.p_estado === "Completada" ? new Date().toISOString() : null, actividad_at: row.actividad_at ?? new Date().toISOString(), updated_at: new Date().toISOString() });
  56  |     writes++; return route.fulfill({ json: row.id });
  57  |   });
  58  |   await page.route("http://127.0.0.1:54321/rest/v1/rpc/delete_task", async (route) => {
  59  |     const data = route.request().postDataJSON() as { p_id: string };
  60  |     rows.splice(rows.findIndex((task) => task.id === data.p_id), 1); writes++; return route.fulfill({ json: true });
  61  |   });
  62  |   return { rows, writes: () => writes, setActor: (id: string) => { actor = id; }, fail: (value: boolean) => { fail = value; }, stale: (value: boolean) => { stale = value; }, loseResponse: () => { loseResponse = true; } };
  63  | }
  64  | async function fillTask(page: Page, title = "Enviar propuesta comercial") {
  65  |   const dialog = page.getByRole("dialog");
  66  |   await dialog.getByLabel("Título *", { exact: true }).fill(title);
  67  |   await dialog.getByLabel("Descripción", { exact: true }).fill("Seguimiento del acuerdo");
  68  |   await dialog.getByLabel("Fecha de vencimiento *", { exact: true }).fill("2026-10-02T10:00");
  69  | }
  70  | for (const [role, email, actor] of [["Administrador", "admin@example.test", adminId], ["Gerente", "gerente@example.test", managerId], ["Vendedor", "vendedor@example.test", sellerId]] as const) {
  71  |   test(`${role}: crear, editar, asignación, completar, reabrir y cancelar`, async ({ page }) => {
  72  |     const foreign = fixture({ titulo: "Tarea de otro usuario" });
  73  |     const db = await mockTasks(page, [foreign]); db.setActor(actor);
  74  |     await login(page, email); await page.getByRole("link", { name: "Tareas", exact: true }).click();
  75  |     await page.getByRole("button", { name: "Nueva tarea", exact: true }).click();
  76  |     const dialog = page.getByRole("dialog");
  77  |     await fillTask(page);
  78  |     await dialog.getByLabel("Título *", { exact: true }).fill("A");
  79  |     await dialog.getByRole("button", { name: "Crear tarea", exact: true }).click();
  80  |     await expect(dialog.getByRole("alert")).toContainText("título");
  81  |     await dialog.getByLabel("Título *", { exact: true }).fill("Enviar propuesta comercial");
  82  |     await expect(dialog.getByLabel("Responsable *", { exact: true }).locator("option").filter({ hasText: "Inactivo" })).toHaveCount(0);
  83  |     if (role === "Vendedor") await expect(dialog.getByLabel("Responsable *", { exact: true })).toBeDisabled();
  84  |     await dialog.getByLabel("Recordatorio", { exact: true }).fill("2026-10-02T09:30");
  85  |     await dialog.getByRole("button", { name: "Crear tarea", exact: true }).click(); await expect(dialog).toBeHidden();
  86  |     const row = page.getByRole("row").filter({ hasText: "Enviar propuesta comercial" });
  87  |     await expect(row).toContainText("Recordatorio");
  88  |     expect(db.rows[0].fecha_vencimiento).toBe("2026-10-02T15:00:00.000Z");
  89  |     await row.getByRole("button", { name: "Editar tarea:" }).click();
  90  |     await dialog.getByLabel("Descripción", { exact: true }).fill("Descripción editada");
  91  |     if (role !== "Vendedor") await dialog.getByLabel("Responsable *", { exact: true }).selectOption(sellerId);
  92  |     await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click(); await expect(dialog).toBeHidden();
  93  |     await expect(row).toContainText("Descripción editada");
  94  |     if (role !== "Vendedor") await expect(row).toContainText("Diego Prueba");
  95  |     else { const other = page.getByRole("row").filter({ hasText: foreign.titulo }); await expect(other.getByRole("button", { name: "Editar tarea:" })).toHaveCount(0); await expect(other.getByRole("button", { name: "Completar tarea:" })).toHaveCount(0); await expect(page.getByRole("button", { name: "Eliminar tarea:" })).toHaveCount(0); }
  96  |     await row.getByRole("button", { name: "Completar tarea:" }).click();
  97  |     await expect(row).toContainText("Completada"); expect(db.rows[0].completada_at).not.toBeNull();
> 98  |     await page.reload(); await expect(row).toContainText("Completada");
      |                                            ^ Error: expect(locator).toContainText(expected) failed
  99  |     await row.getByRole("button", { name: "Reabrir tarea:" }).click(); await expect(row).toContainText("Pendiente"); expect(db.rows[0].completada_at).toBeNull();
  100 |     await expect(row.getByRole("button", { name: "Eliminar tarea:" })).toHaveCount(0);
  101 |     await row.getByRole("button", { name: "Cancelar tarea:" }).click();
  102 |     await page.getByRole("alertdialog").getByRole("button", { name: "Volver", exact: true }).click(); await expect(row).toContainText("Pendiente");
  103 |     await row.getByRole("button", { name: "Cancelar tarea:" }).click(); await page.getByRole("button", { name: "Confirmar cancelación", exact: true }).click();
  104 |     await expect(row).toContainText("Cancelada"); await expect(row.getByRole("button", { name: "Reabrir tarea:" })).toHaveCount(0);
  105 |     await row.getByRole("link", { name: "Ver tarea:" }).click();
  106 |     await expect(page.getByRole("heading", { name: "Enviar propuesta comercial", exact: true })).toBeVisible();
  107 |     await expect(page.getByRole("main")).toContainText("Creado por"); await expect(page.getByRole("main")).toContainText("Descripción editada");
  108 |   });
  109 | }
  110 | test("Lista, tablero, filtros combinados, búsqueda, paginación y métricas reales", async ({ page }) => {
  111 |   const now = new Date();
  112 |   const today = new Date(now.getTime() + 60000).toISOString();
  113 |   const rows = Array.from({ length: 12 }, (_, index) => fixture({ titulo: `Actividad ${index}`, fecha_vencimiento: today }));
  114 |   rows[0] = fixture({ titulo: "Cobrar a Ana", cliente_id: customerId, tipo: "Cobro", prioridad: "Alta", fecha_vencimiento: new Date(now.getTime() - 3600_000).toISOString() });
  115 |   rows[1] = fixture({ titulo: "Reunión terminada", estado: "Completada", completada_at: now.toISOString(), actividad_at: now.toISOString(), fecha_vencimiento: "2020-01-01T15:00:00Z" });
  116 |   const db = await mockTasks(page, rows); await login(page);
  117 |   await expect(page.getByRole("region", { name: "Seguimiento comercial" })).toContainText("vencidas");
  118 |   await page.goto("/tareas"); await expect(page.getByRole("status").filter({ hasText: "12 tareas" })).toContainText("Página 1 de 2");
  119 |   await page.getByRole("button", { name: "Siguiente", exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: "12 tareas" })).toContainText("Página 2 de 2");
  120 |   await page.getByLabel("Buscar tareas", { exact: true }).fill("ana");
  121 |   await page.getByLabel("Filtrar por tipo", { exact: true }).selectOption("Cobro"); await page.getByLabel("Filtrar por prioridad", { exact: true }).selectOption("Alta");
  122 |   await expect(page.getByRole("row").filter({ hasText: "Cobrar a Ana" })).toContainText("Vencida");
  123 |   await page.getByLabel("Filtrar por vencimiento", { exact: true }).selectOption("overdue");
  124 |   await expect(page.getByRole("status").filter({ hasText: "1 tareas" })).toBeVisible();
  125 |   await page.getByRole("button", { name: "Tablero", exact: true }).click(); await expect(page.getByRole("region", { name: "Columna Pendiente", exact: true })).toContainText("Cobrar a Ana");
  126 |   await page.getByRole("button", { name: "Limpiar filtros", exact: true }).click();
  127 |   await page.getByLabel("Filtrar por vencimiento", { exact: true }).selectOption("today");
  128 |   await expect(page.getByRole("region", { name: "Columna Completada", exact: true })).toContainText("Sin tareas");
  129 |   await page.getByRole("button", { name: "Lista", exact: true }).click(); await page.getByRole("button", { name: "Limpiar filtros", exact: true }).click();
  130 |   await page.getByLabel("Buscar tareas", { exact: true }).fill("Actividad 2");
  131 |   const row = page.getByRole("row").filter({ hasText: "Actividad 2" }); await row.getByRole("button", { name: "Eliminar tarea:" }).click();
  132 |   await page.getByRole("button", { name: "Confirmar eliminación", exact: true }).click(); await expect(row).toHaveCount(0); expect(db.rows).toHaveLength(11);
  133 | });
  134 | for (const [type, path, label, id] of [["Cliente", "/clientes", "Ana García", customerId], ["Lead", "/leads", "Andrea Torres", leadId], ["Oportunidad", "/oportunidades", "Implementación CRM", opportunityId], ["Venta", "/ventas", "V-2026-000001", saleId]] as const) {
  135 |   test(`Nueva tarea desde ${type}, relación persistente y enlace al registro`, async ({ page }) => {
  136 |     const db = await mockTasks(page); await login(page); await page.goto(path);
  137 |     if (type === "Cliente" || type === "Lead") {
  138 |       await page.getByRole("button", { name: `Acciones de ${label}`, exact: true }).click();
  139 |       await page.getByRole("menuitem", { name: `Nueva tarea: ${label}`, exact: true }).click();
  140 |     } else {
  141 |       await page.getByRole("link", { name: `Nueva tarea: ${label}`, exact: true }).click();
  142 |     }
  143 |     const dialog = page.getByRole("dialog"); await expect(dialog.getByLabel("Relacionado con", { exact: true })).toHaveValue(type); await expect(dialog.getByLabel("Registro relacionado *", { exact: true })).toHaveValue(id);
  144 |     await fillTask(page, `Seguimiento ${type}`); await dialog.getByRole("button", { name: "Crear tarea", exact: true }).click(); await expect(dialog).toBeHidden(); await expect(page).toHaveURL("http://127.0.0.1:3100/tareas");
  145 |     const key = { Cliente: "cliente_id", Lead: "lead_id", Oportunidad: "oportunidad_id", Venta: "venta_id" }[type] as "cliente_id" | "lead_id" | "oportunidad_id" | "venta_id";
  146 |     expect(db.rows[0][key]).toBe(id);
  147 |     await page.reload(); const row = page.getByRole("row").filter({ hasText: `Seguimiento ${type}` }); await expect(row).toContainText(label);
  148 |     await row.getByRole("link", { name: "Ver tarea:" }).click(); await expect(page).toHaveURL(`http://127.0.0.1:3100/tareas/${db.rows[0].id}`); await expect(page.getByRole("heading", { name: `Seguimiento ${type}`, exact: true })).toBeVisible(); await expect(page.getByRole("main")).toContainText(`${label}`);
  149 |     await page.getByRole("main").getByRole("link").filter({ hasText: label }).click(); await expect(page).toHaveURL(new RegExp(type === "Venta" ? `/ventas/${id}` : `${path}\\?buscar=${id}`));
  150 |     if (type !== "Venta") await expect(page.getByRole("main")).toContainText(label);
  151 |   });
  152 | }
  153 | test("Carga vacía, error recuperable, conflicto y reintento de alta sin duplicar", async ({ page }) => {
  154 |   const db = await mockTasks(page); db.fail(true); await login(page); await page.goto("/tareas");
  155 |   await expect(page.getByRole("region", { name: "Listado de tareas" }).getByRole("alert")).toContainText("tasks.sql"); db.fail(false); await page.getByRole("button", { name: "Reintentar", exact: true }).click(); await expect(page.getByRole("heading", { name: "Todavía no hay tareas" })).toBeVisible();
  156 |   await page.getByRole("button", { name: "Nueva tarea", exact: true }).click(); await fillTask(page); db.loseResponse();
  157 |   const dialog = page.getByRole("dialog"); await dialog.getByRole("button", { name: "Crear tarea", exact: true }).click(); await expect(dialog.getByRole("alert")).toBeVisible();
  158 |   await dialog.getByRole("button", { name: "Crear tarea", exact: true }).click(); await expect(dialog).toBeHidden(); expect(db.rows).toHaveLength(1); expect(db.writes()).toBe(1);
  159 |   const row = page.getByRole("row").filter({ hasText: "Enviar propuesta comercial" }); db.stale(true); await row.getByRole("button", { name: "Completar tarea:" }).click(); await expect(row.getByRole("alert")).toContainText("cambió"); await expect(row).toContainText("Pendiente");
  160 | });
  161 | test("Móvil, teclado y formulario sin desbordamiento", async ({ page }, testInfo) => {
  162 |   await page.setViewportSize({ width: 390, height: 844 }); const db = await mockTasks(page); await login(page); await page.goto("/tareas");
  163 |   await page.getByRole("button", { name: "Nueva tarea", exact: true }).focus(); await page.keyboard.press("Enter"); await fillTask(page, "Seguimiento móvil");
  164 |   const dialog = page.getByRole("dialog"); await dialog.getByLabel("Relacionado con", { exact: true }).selectOption("Lead"); await dialog.getByLabel("Registro relacionado *", { exact: true }).selectOption(leadId);
  165 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  166 |   await dialog.getByRole("button", { name: "Crear tarea", exact: true }).focus(); await page.keyboard.press("Enter"); await expect(dialog).toBeHidden(); expect(db.rows).toHaveLength(1);
  167 |   const searchBox = await page.getByLabel("Buscar tareas", { exact: true }).boundingBox();
  168 |   const refreshBox = await page.getByRole("button", { name: "Actualizar", exact: true }).boundingBox();
  169 |   expect(searchBox).not.toBeNull(); expect(refreshBox).not.toBeNull();
  170 |   expect(searchBox!.y + searchBox!.height <= refreshBox!.y || searchBox!.x + searchBox!.width <= refreshBox!.x).toBeTruthy();
  171 |   await page.getByRole("button", { name: "Tablero", exact: true }).click(); await expect(page.getByRole("article")).toContainText("Seguimiento móvil");
  172 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy(); await page.screenshot({ path: testInfo.outputPath("tasks-mobile.png"), fullPage: true });
  173 | });
  174 | test("Fechas de Lima, límites de medianoche, finalización y validación", () => {
  175 |   const now = new Date("2026-10-02T04:59:59Z"); // Todavía 1 de octubre en Lima.
  176 |   const today = fixture({ fecha_vencimiento: "2026-10-02T04:00:00Z" });
  177 |   const tomorrow = fixture({ fecha_vencimiento: "2026-10-02T05:00:00Z" });
  178 |   const completed = fixture({ estado: "Completada", completada_at: "2026-10-01T05:00:00Z", fecha_vencimiento: "2020-01-01T00:00:00Z" });
  179 |   const cancelled = fixture({ estado: "Cancelada", fecha_vencimiento: "2020-01-01T00:00:00Z" });
  180 |   expect(isToday(today, now)).toBe(true); expect(isToday(tomorrow, now)).toBe(false); expect(isOverdue(today, now)).toBe(true); expect(isOverdue(completed, now)).toBe(false); expect(isOverdue(cancelled, now)).toBe(false);
  181 |   expect(taskStats([today, tomorrow, completed, cancelled], now)).toEqual({ pending: 2, overdue: 1, today: 1, completed: 1 });
  182 |   expect(taskDateInput("2026-10-02T10:00")).toBe("2026-10-02T15:00:00.000Z"); expect(toLimaInput("2026-10-02T15:00:00Z")).toBe("2026-10-02T10:00");
  183 |   expect(() => taskDateInput("2026-02-30T10:00")).toThrow();
  184 |   const input: CreateTask = { titulo: "Llamar", descripcion: "", tipo: "Llamada", prioridad: "Media", estado: "Pendiente", responsable_id: sellerId, cliente_id: null, lead_id: null, oportunidad_id: null, venta_id: null, fecha_inicio: null, fecha_vencimiento: "2026-10-02T15:00:00Z", recordatorio_at: null };
  185 |   expect(() => validateTask({ ...input, recordatorio_at: "2026-10-03T00:00:00Z" })).toThrow("recordatorio"); expect(() => validateTask({ ...input, cliente_id: customerId, lead_id: leadId })).toThrow("sola relación");
  186 | });
  187 | 
```