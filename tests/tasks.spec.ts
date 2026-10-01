import { expect, test, type Page } from "@playwright/test";
import { login } from "./support/login";
import { taskDateInput, taskStats, isOverdue, isToday } from "../src/features/tasks/dates";
import { toLimaInput } from "../src/features/leads/dates";
import { validateTask } from "../src/features/tasks/validation";
import type { CreateTask, Task, TaskStatus } from "../src/features/tasks/types";
const adminId = "00000000-0000-4000-8000-000000000001";
const managerId = "00000000-0000-4000-8000-000000000002";
const sellerId = "00000000-0000-4000-8000-000000000003";
const customerId = "11111111-1111-4111-8111-111111111111";
const leadId = "22222222-2222-4222-8222-222222222222";
const opportunityId = "33333333-3333-4333-8333-333333333333";
const saleId = "44444444-4444-4444-8444-444444444444";
const people = [{ id: adminId, nombres: "Carlos", apellidos: "Prueba", activo: true, rol: "Administrador" }, { id: managerId, nombres: "Lucía", apellidos: "Prueba", activo: true, rol: "Gerente" }, { id: sellerId, nombres: "Diego", apellidos: "Prueba", activo: true, rol: "Vendedor" }, { id: "00000000-0000-4000-8000-000000000004", nombres: "Inactivo", apellidos: "Prueba", activo: false, rol: "Vendedor" }];
const timestamp = "2026-10-01T12:00:00Z";
const customer = { id: customerId, nombres: "Ana", apellidos: "García", empresa: "Horizonte", correo: "ana@example.test", telefono: "999123456", cargo: "", estado: "Activo", direccion: "", notas: "", responsable: "Carlos Prueba", ultimo_contacto: null, created_at: timestamp, updated_at: timestamp };
const lead = { id: leadId, nombres: "Andrea", apellidos: "Torres", empresa: "", correo: "andrea@example.test", telefono: "999123456", cargo: "", fuente: "Web", estado: "Nuevo", prioridad: "Alta", responsable_id: sellerId, notas: "", ultimo_contacto: null, proximo_seguimiento: null, convertido_cliente_id: null, created_at: timestamp, updated_at: timestamp };
const opportunity = { id: opportunityId, titulo: "Implementación CRM", cliente_id: customerId, lead_id: null, responsable_id: sellerId, etapa: "Ganada", valor: "1000.00", probabilidad: 100, fecha_cierre_estimada: "2026-10-15", descripcion: "", origen: "Web", cerrada_at: timestamp, created_at: timestamp, updated_at: timestamp };
const sale = { id: saleId, numero: "V-2026-000001", cliente_id: customerId, oportunidad_id: opportunityId, responsable_id: sellerId, estado: "Borrador", moneda: "PEN", subtotal: "100.00", descuento: "0.00", impuesto: "18.00", total: "118.00", aplica_igv: true, fecha_venta: "2026-10-01", fecha_pago: null, metodo_pago: "", referencia_pago: "", observaciones: "", motivo_cancelacion: "", cancelada_at: null, cancelada_por: null, emitida_at: null, created_at: timestamp, updated_at: timestamp };
function fixture(overrides: Partial<Task> = {}): Task {
  return { id: crypto.randomUUID(), request_id: crypto.randomUUID(), titulo: "Llamar a Ana", descripcion: "Confirmar propuesta", tipo: "Llamada", estado: "Pendiente", prioridad: "Alta", responsable_id: adminId, cliente_id: null, lead_id: null, oportunidad_id: null, venta_id: null, fecha_inicio: null, fecha_vencimiento: new Date(Date.now() + 3600_000).toISOString(), recordatorio_at: null, completada_at: null, actividad_at: null, created_by: adminId, created_at: timestamp, updated_at: timestamp, ...overrides };
}
test.beforeEach(async ({ request }) => { await request.post("http://127.0.0.1:54321/__test/reset"); });
// Contrato de interfaz con transporte simulado. Permisos reales: supabase/tests/tasks.sql.
async function mockTasks(page: Page, initial: Task[] = []) {
  const rows = initial.map((task) => ({ ...task }));
  const requests = new Map<string, string>();
  let fail = false, stale = false, loseResponse = false, writes = 0;
  let actor = adminId;
  await page.route("http://127.0.0.1:54321/rest/v1/clientes**", (route) => route.fulfill({ json: [customer] }));
  await page.route("http://127.0.0.1:54321/rest/v1/leads**", (route) => route.fulfill({ json: [lead] }));
  await page.route("http://127.0.0.1:54321/rest/v1/oportunidades**", (route) => route.fulfill({ json: [opportunity] }));
  await page.route("http://127.0.0.1:54321/rest/v1/ventas**", (route) => route.fulfill({ json: [sale] }));
  await page.route(/\/rest\/v1\/rpc\/(task_responsibles|lead_responsibles|opportunity_responsibles|sale_responsibles)$/, (route) => route.fulfill({ json: people }));
  await page.route("http://127.0.0.1:54321/rest/v1/tareas**", (route) => {
    if (fail) return route.fulfill({ status: 503, json: { message: "Offline" } });
    const id = new URL(route.request().url()).searchParams.get("id")?.replace("eq.", "");
    return route.fulfill({ json: id ? rows.filter((row) => row.id === id) : rows });
  });
  await page.route("http://127.0.0.1:54321/rest/v1/rpc/save_task", async (route) => {
    const data = route.request().postDataJSON() as { p_id: string | null; p_request_id: string; p_data: CreateTask };
    if (stale) return route.fulfill({ status: 409, json: { code: "40001", message: "La tarea cambió. Actualiza antes de continuar." } });
    if (!data.p_id && requests.has(data.p_request_id)) return route.fulfill({ json: requests.get(data.p_request_id) });
    const previous = rows.find((row) => row.id === data.p_id);
    const task = { ...(previous ?? fixture({ created_by: actor, request_id: data.p_request_id })), ...data.p_data, completada_at: data.p_data.estado === "Completada" ? previous?.completada_at ?? new Date().toISOString() : null, actividad_at: previous?.actividad_at ?? (data.p_data.estado === "Pendiente" ? null : new Date().toISOString()), updated_at: new Date().toISOString() };
    if (previous) rows[rows.indexOf(previous)] = task; else { rows.unshift(task); requests.set(data.p_request_id, task.id); }
    writes++;
    if (loseResponse) { loseResponse = false; return route.abort("connectionreset"); }
    return route.fulfill({ json: task.id });
  });
  await page.route("http://127.0.0.1:54321/rest/v1/rpc/set_task_status", async (route) => {
    const data = route.request().postDataJSON() as { p_id: string; p_estado: TaskStatus };
    if (stale) return route.fulfill({ status: 409, json: { code: "40001", message: "La tarea cambió. Actualiza antes de continuar." } });
    const row = rows.find((task) => task.id === data.p_id)!;
    Object.assign(row, { estado: data.p_estado, completada_at: data.p_estado === "Completada" ? new Date().toISOString() : null, actividad_at: row.actividad_at ?? new Date().toISOString(), updated_at: new Date().toISOString() });
    writes++; return route.fulfill({ json: row.id });
  });
  await page.route("http://127.0.0.1:54321/rest/v1/rpc/delete_task", async (route) => {
    const data = route.request().postDataJSON() as { p_id: string };
    rows.splice(rows.findIndex((task) => task.id === data.p_id), 1); writes++; return route.fulfill({ json: true });
  });
  return { rows, writes: () => writes, setActor: (id: string) => { actor = id; }, fail: (value: boolean) => { fail = value; }, stale: (value: boolean) => { stale = value; }, loseResponse: () => { loseResponse = true; } };
}
async function fillTask(page: Page, title = "Enviar propuesta comercial") {
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Título *", { exact: true }).fill(title);
  await dialog.getByLabel("Descripción", { exact: true }).fill("Seguimiento del acuerdo");
  await dialog.getByLabel("Fecha de vencimiento *", { exact: true }).fill("2026-10-02T10:00");
}
for (const [role, email, actor] of [["Administrador", "admin@example.test", adminId], ["Gerente", "gerente@example.test", managerId], ["Vendedor", "vendedor@example.test", sellerId]] as const) {
  test(`${role}: crear, editar, asignación, completar, reabrir y cancelar`, async ({ page }) => {
    const foreign = fixture({ titulo: "Tarea de otro usuario" });
    const db = await mockTasks(page, [foreign]); db.setActor(actor);
    await login(page, email); await page.getByRole("link", { name: "Tareas", exact: true }).click();
    await page.getByRole("button", { name: "Nueva tarea", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await fillTask(page);
    await dialog.getByLabel("Título *", { exact: true }).fill("A");
    await dialog.getByRole("button", { name: "Crear tarea", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("título");
    await dialog.getByLabel("Título *", { exact: true }).fill("Enviar propuesta comercial");
    await expect(dialog.getByLabel("Responsable *", { exact: true }).locator("option").filter({ hasText: "Inactivo" })).toHaveCount(0);
    if (role === "Vendedor") await expect(dialog.getByLabel("Responsable *", { exact: true })).toBeDisabled();
    await dialog.getByLabel("Recordatorio", { exact: true }).fill("2026-10-02T09:30");
    await dialog.getByRole("button", { name: "Crear tarea", exact: true }).click(); await expect(dialog).toBeHidden();
    const row = page.getByRole("row").filter({ hasText: "Enviar propuesta comercial" });
    await expect(row).toContainText("Recordatorio");
    expect(db.rows[0].fecha_vencimiento).toBe("2026-10-02T15:00:00.000Z");
    await row.getByRole("button", { name: "Editar tarea:" }).click();
    await dialog.getByLabel("Descripción", { exact: true }).fill("Descripción editada");
    if (role !== "Vendedor") await dialog.getByLabel("Responsable *", { exact: true }).selectOption(sellerId);
    await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click(); await expect(dialog).toBeHidden();
    await expect(row).toContainText("Descripción editada");
    if (role !== "Vendedor") await expect(row).toContainText("Diego Prueba");
    else { const other = page.getByRole("row").filter({ hasText: foreign.titulo }); await expect(other.getByRole("button", { name: "Editar tarea:" })).toHaveCount(0); await expect(other.getByRole("button", { name: "Completar tarea:" })).toHaveCount(0); await expect(page.getByRole("button", { name: "Eliminar tarea:" })).toHaveCount(0); }
    await row.getByRole("button", { name: "Completar tarea:" }).click();
    await expect(row).toContainText("Completada"); expect(db.rows[0].completada_at).not.toBeNull();
    await page.reload(); await expect(row).toContainText("Completada");
    await row.getByRole("button", { name: "Reabrir tarea:" }).click(); await expect(row).toContainText("Pendiente"); expect(db.rows[0].completada_at).toBeNull();
    await expect(row.getByRole("button", { name: "Eliminar tarea:" })).toHaveCount(0);
    await row.getByRole("button", { name: "Cancelar tarea:" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Volver", exact: true }).click(); await expect(row).toContainText("Pendiente");
    await row.getByRole("button", { name: "Cancelar tarea:" }).click(); await page.getByRole("button", { name: "Confirmar cancelación", exact: true }).click();
    await expect(row).toContainText("Cancelada"); await expect(row.getByRole("button", { name: "Reabrir tarea:" })).toHaveCount(0);
    await row.getByRole("link", { name: "Ver tarea:" }).click();
    await expect(page.getByRole("heading", { name: "Enviar propuesta comercial", exact: true })).toBeVisible();
    await expect(page.getByRole("main")).toContainText("Creado por"); await expect(page.getByRole("main")).toContainText("Descripción editada");
  });
}
test("Lista, tablero, filtros combinados, búsqueda, paginación y métricas reales", async ({ page }) => {
  const now = new Date();
  const today = new Date(now.getTime() + 60000).toISOString();
  const rows = Array.from({ length: 12 }, (_, index) => fixture({ titulo: `Actividad ${index}`, fecha_vencimiento: today }));
  rows[0] = fixture({ titulo: "Cobrar a Ana", cliente_id: customerId, tipo: "Cobro", prioridad: "Alta", fecha_vencimiento: new Date(now.getTime() - 3600_000).toISOString() });
  rows[1] = fixture({ titulo: "Reunión terminada", estado: "Completada", completada_at: now.toISOString(), actividad_at: now.toISOString(), fecha_vencimiento: "2020-01-01T15:00:00Z" });
  const db = await mockTasks(page, rows); await login(page);
  await expect(page.getByRole("region", { name: "Seguimiento comercial" })).toContainText("vencidas");
  await page.goto("/tareas"); await expect(page.getByRole("status").filter({ hasText: "12 tareas" })).toContainText("Página 1 de 2");
  await page.getByRole("button", { name: "Siguiente", exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: "12 tareas" })).toContainText("Página 2 de 2");
  await page.getByLabel("Buscar tareas", { exact: true }).fill("ana");
  await page.getByLabel("Filtrar por tipo", { exact: true }).selectOption("Cobro"); await page.getByLabel("Filtrar por prioridad", { exact: true }).selectOption("Alta");
  await expect(page.getByRole("row").filter({ hasText: "Cobrar a Ana" })).toContainText("Vencida");
  await page.getByLabel("Filtrar por vencimiento", { exact: true }).selectOption("overdue");
  await expect(page.getByRole("status").filter({ hasText: "1 tareas" })).toBeVisible();
  await page.getByRole("button", { name: "Tablero", exact: true }).click(); await expect(page.getByRole("region", { name: "Columna Pendiente", exact: true })).toContainText("Cobrar a Ana");
  await page.getByRole("button", { name: "Limpiar filtros", exact: true }).click();
  await page.getByLabel("Filtrar por vencimiento", { exact: true }).selectOption("today");
  await expect(page.getByRole("region", { name: "Columna Completada", exact: true })).toContainText("Sin tareas");
  await page.getByRole("button", { name: "Lista", exact: true }).click(); await page.getByRole("button", { name: "Limpiar filtros", exact: true }).click();
  await page.getByLabel("Buscar tareas", { exact: true }).fill("Actividad 2");
  const row = page.getByRole("row").filter({ hasText: "Actividad 2" }); await row.getByRole("button", { name: "Eliminar tarea:" }).click();
  await page.getByRole("button", { name: "Confirmar eliminación", exact: true }).click(); await expect(row).toHaveCount(0); expect(db.rows).toHaveLength(11);
});
for (const [type, path, label, id] of [["Cliente", "/clientes", "Ana García", customerId], ["Lead", "/leads", "Andrea Torres", leadId], ["Oportunidad", "/oportunidades", "Implementación CRM", opportunityId], ["Venta", "/ventas", "V-2026-000001", saleId]] as const) {
  test(`Nueva tarea desde ${type}, relación persistente y enlace al registro`, async ({ page }) => {
    const db = await mockTasks(page); await login(page); await page.goto(path);
    await page.getByRole("link", { name: `Nueva tarea: ${label}`, exact: true }).click();
    const dialog = page.getByRole("dialog"); await expect(dialog.getByLabel("Relacionado con", { exact: true })).toHaveValue(type); await expect(dialog.getByLabel("Registro relacionado *", { exact: true })).toHaveValue(id);
    await fillTask(page, `Seguimiento ${type}`); await dialog.getByRole("button", { name: "Crear tarea", exact: true }).click(); await expect(dialog).toBeHidden(); await expect(page).toHaveURL("http://127.0.0.1:3100/tareas");
    const key = { Cliente: "cliente_id", Lead: "lead_id", Oportunidad: "oportunidad_id", Venta: "venta_id" }[type] as "cliente_id" | "lead_id" | "oportunidad_id" | "venta_id";
    expect(db.rows[0][key]).toBe(id);
    await page.reload(); const row = page.getByRole("row").filter({ hasText: `Seguimiento ${type}` }); await expect(row).toContainText(label);
    await row.getByRole("link", { name: "Ver tarea:" }).click(); await expect(page).toHaveURL(`http://127.0.0.1:3100/tareas/${db.rows[0].id}`); await expect(page.getByRole("heading", { name: `Seguimiento ${type}`, exact: true })).toBeVisible(); await expect(page.getByRole("main")).toContainText(`${label}`);
    await page.getByRole("main").getByRole("link").filter({ hasText: label }).click(); await expect(page).toHaveURL(new RegExp(type === "Venta" ? `/ventas/${id}` : `${path}\\?buscar=${id}`));
    if (type !== "Venta") await expect(page.getByRole("main")).toContainText(label);
  });
}
test("Carga vacía, error recuperable, conflicto y reintento de alta sin duplicar", async ({ page }) => {
  const db = await mockTasks(page); db.fail(true); await login(page); await page.goto("/tareas");
  await expect(page.getByRole("region", { name: "Listado de tareas" }).getByRole("alert")).toContainText("tasks.sql"); db.fail(false); await page.getByRole("button", { name: "Reintentar", exact: true }).click(); await expect(page.getByRole("heading", { name: "Todavía no hay tareas" })).toBeVisible();
  await page.getByRole("button", { name: "Nueva tarea", exact: true }).click(); await fillTask(page); db.loseResponse();
  const dialog = page.getByRole("dialog"); await dialog.getByRole("button", { name: "Crear tarea", exact: true }).click(); await expect(dialog.getByRole("alert")).toBeVisible();
  await dialog.getByRole("button", { name: "Crear tarea", exact: true }).click(); await expect(dialog).toBeHidden(); expect(db.rows).toHaveLength(1); expect(db.writes()).toBe(1);
  const row = page.getByRole("row").filter({ hasText: "Enviar propuesta comercial" }); db.stale(true); await row.getByRole("button", { name: "Completar tarea:" }).click(); await expect(row.getByRole("alert")).toContainText("cambió"); await expect(row).toContainText("Pendiente");
});
test("Móvil, teclado y formulario sin desbordamiento", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 }); const db = await mockTasks(page); await login(page); await page.goto("/tareas");
  await page.getByRole("button", { name: "Nueva tarea", exact: true }).focus(); await page.keyboard.press("Enter"); await fillTask(page, "Seguimiento móvil");
  const dialog = page.getByRole("dialog"); await dialog.getByLabel("Relacionado con", { exact: true }).selectOption("Lead"); await dialog.getByLabel("Registro relacionado *", { exact: true }).selectOption(leadId);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await dialog.getByRole("button", { name: "Crear tarea", exact: true }).focus(); await page.keyboard.press("Enter"); await expect(dialog).toBeHidden(); expect(db.rows).toHaveLength(1);
  const searchBox = await page.getByLabel("Buscar tareas", { exact: true }).boundingBox();
  const refreshBox = await page.getByRole("button", { name: "Actualizar", exact: true }).boundingBox();
  expect(searchBox).not.toBeNull(); expect(refreshBox).not.toBeNull();
  expect(searchBox!.y + searchBox!.height <= refreshBox!.y || searchBox!.x + searchBox!.width <= refreshBox!.x).toBeTruthy();
  await page.getByRole("button", { name: "Tablero", exact: true }).click(); await expect(page.getByRole("article")).toContainText("Seguimiento móvil");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy(); await page.screenshot({ path: testInfo.outputPath("tasks-mobile.png"), fullPage: true });
});
test("Fechas de Lima, límites de medianoche, finalización y validación", () => {
  const now = new Date("2026-10-02T04:59:59Z"); // Todavía 1 de octubre en Lima.
  const today = fixture({ fecha_vencimiento: "2026-10-02T04:00:00Z" });
  const tomorrow = fixture({ fecha_vencimiento: "2026-10-02T05:00:00Z" });
  const completed = fixture({ estado: "Completada", completada_at: "2026-10-01T05:00:00Z", fecha_vencimiento: "2020-01-01T00:00:00Z" });
  const cancelled = fixture({ estado: "Cancelada", fecha_vencimiento: "2020-01-01T00:00:00Z" });
  expect(isToday(today, now)).toBe(true); expect(isToday(tomorrow, now)).toBe(false); expect(isOverdue(today, now)).toBe(true); expect(isOverdue(completed, now)).toBe(false); expect(isOverdue(cancelled, now)).toBe(false);
  expect(taskStats([today, tomorrow, completed, cancelled], now)).toEqual({ pending: 2, overdue: 1, today: 1, completed: 1 });
  expect(taskDateInput("2026-10-02T10:00")).toBe("2026-10-02T15:00:00.000Z"); expect(toLimaInput("2026-10-02T15:00:00Z")).toBe("2026-10-02T10:00");
  expect(() => taskDateInput("2026-02-30T10:00")).toThrow();
  const input: CreateTask = { titulo: "Llamar", descripcion: "", tipo: "Llamada", prioridad: "Media", estado: "Pendiente", responsable_id: sellerId, cliente_id: null, lead_id: null, oportunidad_id: null, venta_id: null, fecha_inicio: null, fecha_vencimiento: "2026-10-02T15:00:00Z", recordatorio_at: null };
  expect(() => validateTask({ ...input, recordatorio_at: "2026-10-03T00:00:00Z" })).toThrow("recordatorio"); expect(() => validateTask({ ...input, cliente_id: customerId, lead_id: leadId })).toThrow("sola relación");
});
