import { expect, test, type Page } from "@playwright/test";
import { login } from "./support/login";
import type { Opportunity, OpportunityStage } from "../src/features/opportunities/types";
import { decimalMoney, formatCents, toCents } from "../src/features/opportunities/money";
import { opportunityStats } from "../src/features/opportunities/stats";
import { validateOpportunity } from "../src/features/opportunities/validation";
import { opportunityInput } from "../src/features/opportunities/types";

const clientId = "11111111-1111-4111-8111-111111111111";
const leadId = "22222222-2222-4222-8222-222222222222";
const adminId = "00000000-0000-4000-8000-000000000001";
const sellerId = "00000000-0000-4000-8000-000000000003";
const fixture: Opportunity = { id: "33333333-3333-4333-8333-333333333333", titulo: "Renovación anual", cliente_id: clientId, lead_id: leadId, responsable_id: adminId, etapa: "Nueva", valor: "1200.10", probabilidad: 10, fecha_cierre_estimada: "2026-12-15", descripcion: "Servicio anual", origen: "Web", cerrada_at: null, created_at: "2026-09-01T12:00:00Z", updated_at: "2026-09-01T12:00:00Z" };
const customer = { id: clientId, nombres: "Ana", apellidos: "García", empresa: "Horizonte", correo: "ana@example.test", telefono: "999123456", cargo: "Gerente", estado: "Prospecto", direccion: "", notas: "", responsable: "Carlos Prueba", ultimo_contacto: null, created_at: fixture.created_at, updated_at: fixture.updated_at };
const convertedLead = { id: leadId, nombres: "Ana", apellidos: "García", empresa: "Horizonte", correo: customer.correo, telefono: customer.telefono, cargo: "Gerente", fuente: "Web", estado: "Convertido", prioridad: "Alta", responsable_id: adminId, notas: "", ultimo_contacto: null, proximo_seguimiento: null, convertido_cliente_id: clientId, created_at: fixture.created_at, updated_at: fixture.updated_at };
const people = [
  { id: adminId, nombres: "Carlos", apellidos: "Prueba", rol: "Administrador", activo: true },
  { id: "00000000-0000-4000-8000-000000000002", nombres: "Lucía", apellidos: "Prueba", rol: "Gerente", activo: true },
  { id: sellerId, nombres: "Diego", apellidos: "Prueba", rol: "Vendedor", activo: true },
  { id: "00000000-0000-4000-8000-000000000004", nombres: "Inactivo", apellidos: "Prueba", rol: "Vendedor", activo: false },
];
test.beforeEach(async ({ request }) => { await request.post("http://127.0.0.1:54321/__test/reset"); });

async function mockOpportunities(page: Page, initial = [fixture]) {
  const rows = initial.map((item) => ({ ...item }));
  let fail = false;
  let stale = false;
  let writes = 0;
  await page.route("http://127.0.0.1:54321/rest/v1/clientes**", (route) => route.fulfill({ json: [customer] }));
  await page.route("http://127.0.0.1:54321/rest/v1/leads**", (route) => route.fulfill({ json: [convertedLead] }));
  await page.route(/\/rest\/v1\/rpc\/(opportunity_responsibles|lead_responsibles)$/, (route) => route.fulfill({ json: people }));
  await page.route("http://127.0.0.1:54321/rest/v1/oportunidades**", async (route) => {
    const request = route.request();
    if (fail) return route.fulfill({ status: 503, json: { message: "Offline" } });
    const id = new URL(request.url()).searchParams.get("id")?.replace("eq.", "");
    if (request.method() === "GET") return route.fulfill({ json: id ? rows.filter((item) => item.id === id) : rows });
    const index = rows.findIndex((item) => item.id === id);
    if (request.method() === "DELETE") { writes++; return route.fulfill({ json: rows.splice(index, 1) }); }
    if (stale && request.method() === "PATCH") return route.fulfill({ json: [] });
    const input = request.postDataJSON() as Partial<Opportunity>;
    const item: Opportunity = { ...(request.method() === "POST" ? { ...fixture, id: crypto.randomUUID() } : rows[index]), ...input, updated_at: new Date().toISOString() };
    if (item.etapa === "Ganada" || item.etapa === "Perdida") item.cerrada_at = new Date().toISOString(); else item.cerrada_at = null;
    writes++;
    if (request.method() === "POST") rows.unshift(item); else rows[index] = item;
    return route.fulfill({ json: request.method() === "POST" ? item : [item] });
  });
  return { rows, fail: (value: boolean) => { fail = value; }, stale: () => { stale = true; }, writes: () => writes };
}

for (const [role, email] of [["Administrador", "admin@example.test"], ["Gerente", "gerente@example.test"], ["Vendedor", "vendedor@example.test"]]) {
  test(`${role}: crear, editar, cambiar etapa, persistir y eliminar según permiso`, async ({ page }) => {
    const db = await mockOpportunities(page);
    await login(page, email);
    await page.getByRole("link", { name: "Oportunidades", exact: true }).click();
    await expect(page.getByRole("region", { name: "Pipeline comercial" })).toBeVisible();
    await page.getByRole("button", { name: "Nueva oportunidad", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Crear oportunidad", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("Título");
    await dialog.getByLabel("Título *", { exact: true }).fill("Implementación CRM");
    await dialog.getByLabel("Cliente *", { exact: true }).selectOption(clientId);
    await dialog.getByLabel("Lead relacionado", { exact: true }).selectOption(leadId);
    await dialog.getByLabel("Valor estimado (S/) *", { exact: true }).fill("2345,67");
    await dialog.getByLabel("Etapa *", { exact: true }).selectOption("Propuesta");
    await expect(dialog.getByLabel("Probabilidad (%) *", { exact: true })).toHaveValue("50");
    await dialog.getByLabel("Probabilidad (%) *", { exact: true }).fill("60");
    await dialog.getByLabel("Fecha de cierre estimada", { exact: true }).fill("2026-12-25");
    if (role === "Vendedor") await expect(dialog.getByLabel("Responsable *", { exact: true })).toBeDisabled();
    else await dialog.getByLabel("Responsable *", { exact: true }).selectOption(sellerId);
    await expect(dialog.getByLabel("Responsable *", { exact: true }).locator("option").filter({ hasText: "Inactivo" })).toHaveCount(0);
    await dialog.getByRole("button", { name: "Crear oportunidad", exact: true }).click();
    await expect(dialog).toBeHidden();
    const card = page.getByRole("article", { name: "Implementación CRM", exact: true });
    await expect(card).toContainText("S/ 2,345.67");
    await expect(card).toContainText("60%");
    expect(db.rows[0].valor).toBe("2345.67");
    expect(db.rows[0].lead_id).toBe(leadId);
    await card.getByRole("button", { name: "Editar oportunidad:" }).click();
    await dialog.getByLabel("Valor estimado (S/) *", { exact: true }).fill("3000.01");
    await dialog.getByLabel("Descripción", { exact: true }).fill("Incluye capacitación");
    await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click();
    await expect(card).toContainText("S/ 3,000.01");
    await card.getByLabel("Cambiar etapa:").selectOption("Ganada");
    await expect(page.getByRole("region", { name: "Etapa Ganada", exact: true }).getByRole("article", { name: "Implementación CRM" })).toBeVisible();
    await expect(card).toContainText("100%");
    await expect(card.getByLabel("Cambiar etapa:")).toBeFocused();
    expect(db.rows[0].cerrada_at).not.toBeNull();
    await page.reload();
    await expect(card).toContainText("S/ 3,000.01");
    await page.getByRole("button", { name: "Lista", exact: true }).click();
    const row = page.getByRole("row").filter({ hasText: "Implementación CRM" });
    await expect(row).toContainText("Ganada");
    await row.getByRole("button", { name: "Ver oportunidad:" }).click();
    await expect(dialog).toContainText("Incluye capacitación");
    await expect(dialog).toContainText("Ana García");
    await page.keyboard.press("Escape");
    if (role === "Vendedor") await expect(page.getByRole("button", { name: "Eliminar oportunidad:" })).toHaveCount(0);
    else {
      await row.getByRole("button", { name: "Eliminar oportunidad:" }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Cancelar" }).click();
      await expect(row).toBeVisible();
      await row.getByRole("button", { name: "Eliminar oportunidad:" }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Eliminar oportunidad", exact: true }).click();
      await expect(row).toHaveCount(0);
    }
  });
}

test("filtros combinados, estadísticas y lista paginada", async ({ page }) => {
  await mockOpportunities(page, [fixture, ...Array.from({ length: 11 }, (_, i) => ({ ...fixture, id: crypto.randomUUID(), titulo: `Cerrada ${i}`, etapa: "Perdida" as OpportunityStage, probabilidad: 0, responsable_id: sellerId, cerrada_at: "2026-09-01T12:00:00Z" }))]);
  await login(page); await page.goto("/oportunidades");
  await expect(page.getByText("12 oportunidades visibles · Indicadores globales")).toBeVisible();
  await expect(page.getByText("Ponderado: S/ 120.01", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.getByText("Página 2 de 2", { exact: true })).toBeVisible();
  await page.getByLabel("Buscar oportunidades", { exact: true }).fill("renovacion");
  await page.getByLabel("Filtrar por etapa", { exact: true }).selectOption("Nueva");
  await page.getByLabel("Filtrar por responsable", { exact: true }).selectOption(adminId);
  await page.getByLabel("Filtrar por cliente", { exact: true }).selectOption(clientId);
  await page.getByLabel("Filtrar por estado", { exact: true }).selectOption("open");
  await page.getByLabel("Cierre estimado desde", { exact: true }).fill("2026-12-01");
  await page.getByLabel("Cierre estimado hasta", { exact: true }).fill("2026-12-31");
  await expect(page.getByText("1 oportunidades visibles · Indicadores globales")).toBeVisible();
  await page.getByLabel("Cierre estimado hasta", { exact: true }).fill("2026-12-10");
  await expect(page.getByRole("heading", { name: "Sin oportunidades para estos filtros" })).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(page.getByText("12 oportunidades visibles · Indicadores globales")).toBeVisible();
});

test("crear desde Cliente y desde Lead convertido preselecciona relaciones", async ({ page }) => {
  await mockOpportunities(page); await login(page); await page.goto("/clientes");
  await page.getByRole("link", { name: "Nueva oportunidad para Ana García" }).click();
  const dialog = page.getByRole("dialog", { name: "Nueva oportunidad", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Cliente *", { exact: true })).toHaveValue(clientId);
  await page.keyboard.press("Escape");
  await page.goto("/leads");
  await page.getByRole("button", { name: "Ver detalle: Ana García" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Nueva oportunidad", exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Cliente *", { exact: true })).toHaveValue(clientId);
  await expect(dialog.getByLabel("Lead relacionado", { exact: true })).toHaveValue(leadId);
});

test("error recuperable y conflicto al cambiar etapa conserva estado", async ({ page }) => {
  const db = await mockOpportunities(page); db.fail(true);
  await login(page); await page.goto("/oportunidades");
  await expect(page.getByRole("alert").filter({ hasText: "No se pudo completar" })).toBeVisible();
  db.fail(false); await page.getByRole("button", { name: "Reintentar" }).click();
  const card = page.getByRole("article", { name: fixture.titulo });
  await expect(card).toBeVisible(); db.stale();
  await card.getByLabel("Cambiar etapa:").selectOption("Ganada");
  await expect(card.getByRole("alert")).toContainText("La oportunidad cambió");
  await expect(card.getByLabel("Cambiar etapa:")).toHaveValue("Nueva");
  expect(db.writes()).toBe(0);
});

test("pipeline y formulario móvil sin desbordamiento de página", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockOpportunities(page); await login(page); await page.goto("/oportunidades");
  await expect(page.getByRole("article", { name: fixture.titulo })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("pipeline-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Nueva oportunidad", exact: true }).focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Nueva oportunidad", exact: true })).toBeFocused();
});

test("oportunidades requiere autenticación", async ({ page }) => { await page.goto("/oportunidades"); await expect(page).toHaveURL(/\/login/); });

test("importes exactos, límites, cierre mensual de Lima y ponderación", () => {
  expect(decimalMoney("1234,56")).toBe("1234.56");
  expect(formatCents(toCents("0.10") + toCents("0.20"))).toBe("S/ 0.30");
  expect(formatCents(toCents("999999999999.99") * BigInt(100000))).toBe("S/ 99,999,999,999,999,000.00");
  for (const invalid of ["-1", "1.001", "1e3", "NaN", "1000000000000", ""]) expect(() => toCents(invalid)).toThrow();
  for (const invalid of [-1, 101, 1.5]) expect(() => validateOpportunity({ ...opportunityInput(fixture), probabilidad: invalid })).toThrow();
  expect(() => validateOpportunity({ ...opportunityInput(fixture), fecha_cierre_estimada: "2026-02-30" })).toThrow();
  const stats = opportunityStats([fixture, { ...fixture, etapa: "Ganada", cerrada_at: "2026-10-01T04:30:00Z" }, { ...fixture, etapa: "Perdida", cerrada_at: "2026-09-01T12:00:00Z" }], new Date("2026-09-30T23:00:00-05:00"));
  expect(stats).toMatchObject({ open: 1, pipeline: BigInt(120010), weighted: BigInt(12001), wonMonth: 1, closeRate: 50 });
  expect(opportunityStats([], new Date()).closeRate).toBe(0);
});
