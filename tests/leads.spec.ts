import { expect, test, type Page } from "@playwright/test";
import { login } from "./support/login";
import type { Lead, LeadResponsable } from "../src/features/leads/types";

test.beforeEach(async ({ request }) => { await request.post("http://127.0.0.1:54321/__test/reset"); });

const people: LeadResponsable[] = [
  { id: "00000000-0000-4000-8000-000000000001", nombres: "Carlos", apellidos: "Prueba", rol: "Administrador", activo: true },
  { id: "00000000-0000-4000-8000-000000000002", nombres: "Lucía", apellidos: "Prueba", rol: "Gerente", activo: true },
  { id: "00000000-0000-4000-8000-000000000003", nombres: "Diego", apellidos: "Prueba", rol: "Vendedor", activo: true },
  { id: "00000000-0000-4000-8000-000000000004", nombres: "Inactivo", apellidos: "Prueba", rol: "Vendedor", activo: false },
];
const fixture: Lead = { id: "11111111-1111-4111-8111-111111111112", nombres: "Elena", apellidos: "Ríos", empresa: "Norte", correo: "elena@example.test", telefono: "987654321", cargo: "Directora", fuente: "Web", estado: "Nuevo", prioridad: "Alta", responsable_id: people[0].id, notas: "Contacto de feria", ultimo_contacto: null, proximo_seguimiento: "2020-01-01T15:00:00Z", convertido_cliente_id: null, created_at: "2026-09-01T12:00:00Z", updated_at: "2026-09-01T12:00:00Z" };

// Simula el contrato HTTP para probar la UI; la seguridad SQL se prueba aparte.
async function mockLeads(page: Page, initial: Lead[] = [fixture]) {
  const rows = initial.map((row) => ({ ...row }));
  let unavailable = false;
  let duplicate = false;
  let conversions = 0;
  await page.route("http://127.0.0.1:54321/rest/v1/rpc/lead_responsibles", (route) => route.fulfill({ json: people }));
  await page.route("http://127.0.0.1:54321/rest/v1/leads**", async (route) => {
    const request = route.request();
    const id = new URL(request.url()).searchParams.get("id")?.replace("eq.", "");
    if (unavailable) return route.fulfill({ status: 503, json: { message: "Offline" } });
    if (request.method() === "GET") return route.fulfill({ json: id ? rows.filter((row) => row.id === id) : rows });
    if (request.method() === "POST") {
      const row = { ...fixture, ...request.postDataJSON(), id: crypto.randomUUID(), updated_at: new Date().toISOString() } as Lead;
      rows.unshift(row); return route.fulfill({ status: 201, json: row });
    }
    const index = rows.findIndex((row) => row.id === id);
    if (request.method() === "PATCH") {
      rows[index] = { ...rows[index], ...request.postDataJSON(), updated_at: new Date().toISOString() } as Lead;
      return route.fulfill({ json: [rows[index]] });
    }
    if (request.method() === "DELETE") return route.fulfill({ json: index < 0 ? [] : rows.splice(index, 1) });
    return route.fulfill({ status: 405 });
  });
  await page.route("http://127.0.0.1:54321/rest/v1/rpc/convert_lead", async (route) => {
    const input = route.request().postDataJSON() as { p_lead_id: string; p_correo: string; p_apellidos: string; p_existing_client_id: string | null };
    const lead = rows.find((row) => row.id === input.p_lead_id)!;
    const id = "22222222-2222-4222-8222-222222222222";
    const result = lead.convertido_cliente_id ? "ya_convertido" : duplicate && !input.p_existing_client_id ? "requiere_vinculo" : duplicate ? "vinculado" : "creado";
    if (result !== "requiere_vinculo") { lead.estado = "Convertido"; lead.convertido_cliente_id = id; lead.apellidos = input.p_apellidos; lead.correo = input.p_correo; conversions++; }
    return route.fulfill({ json: { resultado: result, cliente_id: id, cliente_nombre: `${lead.nombres} ${input.p_apellidos}`, cliente_correo: input.p_correo } });
  });
  return { rows, fail: (value: boolean) => { unavailable = value; }, duplicate: () => { duplicate = true; }, conversions: () => conversions };
}

for (const [role, email] of [["Administrador", "admin@example.test"], ["Gerente", "gerente@example.test"], ["Vendedor", "vendedor@example.test"]]) {
  test(`${role}: alta, edición, conversión y permiso visual de eliminación`, async ({ page }) => {
    const db = await mockLeads(page);
    await login(page, email);
    await page.getByRole("link", { name: "Leads", exact: true }).click();
    await expect(page.getByRole("row").filter({ hasText: "Elena Ríos" })).toContainText("Vencido");
    await page.getByRole("button", { name: "Nuevo lead", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Crear lead", exact: true }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await dialog.getByLabel("Nombres *", { exact: true }).fill("María");
    await dialog.getByLabel("Teléfono *", { exact: true }).fill("999123456");
    if (role === "Vendedor") await expect(dialog.getByLabel("Responsable", { exact: true })).toBeDisabled();
    else await dialog.getByLabel("Responsable", { exact: true }).selectOption(people[1].id);
    await expect(dialog.getByLabel("Responsable", { exact: true }).locator("option").filter({ hasText: "Inactivo" })).toHaveCount(0);
    await dialog.getByRole("button", { name: "Crear lead", exact: true }).click();
    await expect(dialog).toBeHidden();
    const row = page.getByRole("row").filter({ hasText: "María" });
    await row.getByRole("button", { name: "Editar lead:" }).click();
    await dialog.getByLabel("Empresa", { exact: true }).fill("Horizonte");
    await dialog.getByLabel("Estado *", { exact: true }).selectOption("Calificado");
    await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click();
    await expect(row).toContainText("Horizonte");
    await expect(row).toContainText("Calificado");
    await row.getByRole("button", { name: "Convertir a cliente:" }).click();
    await dialog.getByRole("button", { name: "Convertir a cliente", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("Completa los apellidos");
    await dialog.getByLabel("Apellidos", { exact: true }).fill("Torres");
    await dialog.getByLabel("Correo del cliente", { exact: true }).fill("maria@example.test");
    await dialog.getByRole("button", { name: "Convertir a cliente", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(row).toContainText("Convertido");
    await expect(row.getByRole("button", { name: "Convertir a cliente:" })).toHaveCount(0);
    expect(db.conversions()).toBe(1);
    await row.getByRole("button", { name: "Ver detalle:" }).click();
    await expect(dialog.getByRole("link", { name: "Ver cliente vinculado" })).toHaveAttribute("href", /\/clientes\?buscar=/);
    await page.keyboard.press("Escape");
    if (role === "Vendedor") await expect(page.getByRole("button", { name: "Eliminar lead:" })).toHaveCount(0);
    else {
      await row.getByRole("button", { name: "Eliminar lead:" }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Cancelar" }).click();
      await expect(row).toBeVisible();
      await row.getByRole("button", { name: "Eliminar lead:" }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Eliminar lead", exact: true }).click();
      await expect(row).toHaveCount(0);
    }
    await page.reload();
    await expect(page.getByRole("row").filter({ hasText: "Elena Ríos" })).toBeVisible();
  });
}

test("búsqueda, cuatro filtros, paginación, error y reintento", async ({ page }) => {
  const db = await mockLeads(page, [fixture, ...Array.from({ length: 11 }, (_, i) => ({ ...fixture, id: crypto.randomUUID(), nombres: `Contacto ${i}`, estado: "Contactado" as const, prioridad: "Baja" as const, fuente: "Evento" as const, responsable_id: people[1].id }))]);
  await login(page); await page.goto("/leads");
  await expect(page.getByText("12 leads · Página 1 de 2")).toBeVisible();
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.getByText("12 leads · Página 2 de 2")).toBeVisible();
  await page.getByLabel("Buscar leads", { exact: true }).fill("rios");
  await page.getByLabel("Filtrar por estado", { exact: true }).selectOption("Nuevo");
  await page.getByLabel("Filtrar por prioridad", { exact: true }).selectOption("Alta");
  await page.getByLabel("Filtrar por fuente", { exact: true }).selectOption("Web");
  await page.getByLabel("Filtrar por responsable", { exact: true }).selectOption(people[0].id);
  await expect(page.getByText("1 leads · Página 1 de 1")).toBeVisible();
  await page.getByLabel("Buscar leads", { exact: true }).fill("no existe");
  await expect(page.getByRole("heading", { name: "Sin resultados" })).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  db.fail(true); await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await expect(page.getByRole("region", { name: "Listado de leads" }).getByRole("alert")).toContainText("No se pudo completar");
  db.fail(false); await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByText("12 leads · Página 1 de 2")).toBeVisible();
});

test("correo existente exige confirmación antes de vincular", async ({ page }) => {
  const db = await mockLeads(page); db.duplicate();
  await login(page); await page.goto("/leads");
  await page.getByRole("button", { name: "Convertir a cliente: Elena" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Convertir a cliente", exact: true }).click();
  await expect(dialog.getByText("Ya existe un cliente con este correo")).toBeVisible();
  expect(db.conversions()).toBe(0); expect(db.rows[0].estado).toBe("Nuevo");
  await dialog.getByRole("button", { name: "Vincular al cliente existente" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("row").filter({ hasText: "Elena" })).toContainText("Convertido");
  expect(db.conversions()).toBe(1);
});

test("móvil: estado vacío y formulario accesible por teclado", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockLeads(page, []); await login(page); await page.goto("/leads");
  await expect(page.getByRole("heading", { name: "Todavía no hay leads" })).toBeVisible();
  await page.getByRole("button", { name: "Nuevo lead", exact: true }).focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toBeHidden();
});

test("Leads requiere sesión", async ({ page }) => { await page.goto("/leads"); await expect(page).toHaveURL(/\/login/); });
