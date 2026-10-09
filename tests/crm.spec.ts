import { expect, test, type Page } from "@playwright/test";
import { login } from "./support/login";

test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:54321/__test/reset");
});

type ClientRow = {
  id: string;
  nombres: string;
  apellidos: string;
  empresa: string;
  correo: string;
  telefono: string;
  cargo: string;
  estado: "Activo" | "Prospecto" | "Inactivo";
  direccion: string;
  notas: string;
  responsable: string;
  ultimo_contacto: string | null;
  created_at: string;
  updated_at: string;
};

const initialClient: ClientRow = {
  id: "11111111-1111-4111-8111-111111111111",
  nombres: "Ana",
  apellidos: "García",
  empresa: "Empresa Uno",
  correo: "ana@example.com",
  telefono: "+51 987 654 321",
  cargo: "Gerente",
  estado: "Activo",
  direccion: "Lima",
  notas: "Cliente inicial",
  responsable: "Ana García",
  ultimo_contacto: null,
  created_at: "2026-09-01T12:00:00Z",
  updated_at: "2026-09-01T12:00:00Z",
};

async function mockClientes(page: Page) {
  const rows = [initialClient];
  let unavailable = false;
  await page.route("http://127.0.0.1:54321/rest/v1/clientes**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const id = url.searchParams.get("id")?.replace("eq.", "");
    const respond = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (unavailable) return respond({ code: "MOCK_ERROR", message: "Servicio no disponible" }, 503);
    if (request.method() === "GET") return respond(id ? rows.filter((row) => row.id === id) : rows);
    if (request.method() === "POST") {
      const input = request.postDataJSON() as Partial<ClientRow>;
      const row: ClientRow = { ...initialClient, ...input, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      rows.unshift(row);
      return respond(row, 201);
    }
    if (request.method() === "PATCH") {
      const index = rows.findIndex((row) => row.id === id);
      if (index < 0) return respond([]);
      rows[index] = { ...rows[index], ...(request.postDataJSON() as Partial<ClientRow>), updated_at: new Date().toISOString() };
      return respond(rows[index]);
    }
    if (request.method() === "DELETE") {
      const index = rows.findIndex((row) => row.id === id);
      return respond(index < 0 ? [] : [rows.splice(index, 1)[0]]);
    }
    return respond({ message: "Método inesperado" }, 405);
  });
  return { rows, setUnavailable: (value: boolean) => { unavailable = value; } };
}

test("lista, filtra y conserva el CRUD de clientes al recargar", async ({ page }) => {
  await login(page);
  const database = await mockClientes(page);
  await page.goto("/clientes");
  await expect(page.getByRole("row").filter({ hasText: "Ana García" })).toBeVisible();
  await page.getByLabel("Buscar clientes").fill("empresa uno");
  await expect(page.getByRole("row").filter({ hasText: "Ana García" })).toBeVisible();
  await page.getByLabel("Filtrar por estado").selectOption("Prospecto");
  await expect(page.getByRole("heading", { name: "No encontramos clientes" })).toBeVisible();
  await page.getByRole("button", { name: "Ver todos los clientes" }).click();

  await page.getByRole("button", { name: "Nuevo cliente", exact: true }).click();
  const createDialog = page.getByRole("dialog");
  await page.getByRole("textbox", { name: "Nombres" }).fill("Sofía");
  await page.getByRole("textbox", { name: "Apellidos" }).fill("Prueba");
  await page.getByRole("textbox", { name: "Empresa" }).fill("Estudio Horizonte");
  await page.getByRole("textbox", { name: "Correo electrónico" }).fill("sofia@example.com");
  await page.getByRole("textbox", { name: "Teléfono" }).fill("+51 999 123 456");
  await page.getByRole("button", { name: "Guardar cliente" }).click();
  await expect(createDialog).toBeHidden();
  const row = page.getByRole("row").filter({ hasText: "Sofía Prueba" });
  await expect(row).toBeVisible();
  await expect(database.rows).toHaveLength(2);

  await row.getByRole("button", { name: "Acciones de Sofía Prueba", exact: true }).click();
  await page.getByRole("menuitem", { name: "Editar a Sofía Prueba", exact: true }).click();
  await page.getByRole("textbox", { name: "Empresa" }).fill("Horizonte Actualizado");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(row).toContainText("Horizonte Actualizado");
  await page.reload();
  await expect(page.getByRole("row").filter({ hasText: "Sofía Prueba" })).toContainText("Horizonte Actualizado");

  await row.getByRole("button", { name: "Acciones de Sofía Prueba", exact: true }).click();
  await page.getByRole("menuitem", { name: "Eliminar a Sofía Prueba", exact: true }).click();
  const confirmation = page.getByRole("alertdialog");
  await confirmation.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "Sofía Prueba" })).toHaveCount(0);
  await expect(database.rows).toHaveLength(1);
  await expect(page.getByRole("button", { name: "Nuevo cliente", exact: true })).toBeFocused();
});

test("muestra un error de carga y permite reintentar", async ({ page }) => {
  await login(page);
  const database = await mockClientes(page);
  database.setUnavailable(true);
  await page.goto("/clientes");
  await expect(page.getByRole("alert").filter({ hasText: "Servicio no disponible" })).toBeVisible();
  database.setUnavailable(false);
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByRole("row").filter({ hasText: "Ana García" })).toBeVisible();
});

test("paginación de clientes, tamaño de página y filtros conservan la selección", async ({ page }) => {
  await login(page);
  const database = await mockClientes(page);
  database.rows.splice(0, database.rows.length, ...Array.from({ length: 25 }, (_, index) => ({
    ...initialClient,
    id: crypto.randomUUID(),
    nombres: `Cliente ${String(index + 1).padStart(2, "0")}`,
    apellidos: "Prueba",
    correo: `cliente${index + 1}@example.test`,
  })));
  await page.goto("/clientes");
  const pagination = page.getByRole("navigation", { name: "Paginación de clientes" });
  const count = page.locator("main").getByRole("status");
  const pageSize = page.getByLabel("Por página", { exact: true });
  await expect(count).toHaveText("Mostrando 1–8 de 25 clientes");
  await expect(page.locator("main table tbody tr")).toHaveCount(8);
  await expect(pagination.getByRole("button", { name: "Página anterior", exact: true })).toBeDisabled();
  await pagination.getByRole("button", { name: "Página 2", exact: true }).click();
  await expect(count).toHaveText("Mostrando 9–16 de 25 clientes");
  await expect(pagination.getByRole("button", { name: "Página 2", exact: true })).toHaveAttribute("aria-current", "page");
  await pagination.getByRole("button", { name: "Página siguiente", exact: true }).click();
  await expect(count).toHaveText("Mostrando 17–24 de 25 clientes");
  await pagination.getByRole("button", { name: "Página anterior", exact: true }).click();
  await expect(count).toHaveText("Mostrando 9–16 de 25 clientes");
  await pagination.getByRole("button", { name: "Página 4", exact: true }).click();
  await expect(count).toHaveText("Mostrando 25–25 de 25 clientes");
  await expect(pagination.getByRole("button", { name: "Página siguiente", exact: true })).toBeDisabled();
  await pageSize.selectOption("16");
  await expect(count).toHaveText("Mostrando 1–16 de 25 clientes");
  await expect(page.locator("main table tbody tr")).toHaveCount(16);
  await pageSize.selectOption("24");
  await expect(count).toHaveText("Mostrando 1–24 de 25 clientes");
  await expect(page.locator("main table tbody tr")).toHaveCount(24);
  await pagination.getByRole("button", { name: "Página siguiente", exact: true }).click();
  await page.setViewportSize({ width: 320, height: 844 });
  const mobileList = page.getByRole("list", { name: "Lista de clientes", exact: true });
  await expect(mobileList.getByRole("listitem")).toHaveCount(1);
  await expect(mobileList).toContainText("Cliente 25 Prueba");
  await pagination.getByRole("button", { name: "Página 1", exact: true }).click();
  await expect(mobileList.getByRole("listitem")).toHaveCount(24);
  await pageSize.selectOption("8");
  await expect(mobileList.getByRole("listitem")).toHaveCount(8);
  await pagination.getByRole("button", { name: "Página siguiente", exact: true }).click();
  await page.getByLabel("Buscar clientes", { exact: true }).fill("Cliente 01");
  await expect(count).toHaveText("Mostrando 1–1 de 1 clientes");
  await expect(pagination.getByRole("button", { name: "Página 1", exact: true })).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Limpiar filtros", exact: true }).click();
  await expect(count).toHaveText("Mostrando 1–8 de 25 clientes");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const [email, canDelete] of [["admin@example.test", true], ["gerente@example.test", true], ["vendedor@example.test", false]] as const) {
  test(`permisos visuales de clientes para ${email}`, async ({ page }) => {
    await login(page, email);
    await mockClientes(page);
    await page.goto("/clientes");
    await expect(page.getByRole("button", { name: "Nuevo cliente", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Acciones de Ana García", exact: true }).click();
    await expect(page.getByRole("menuitem", { name: "Editar a Ana García", exact: true })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Eliminar a Ana García", exact: true })).toHaveCount(canDelete ? 1 : 0);
  });
}
