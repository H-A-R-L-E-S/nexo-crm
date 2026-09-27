import { expect, test, type Page } from "@playwright/test";

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
  await page.route("https://example.supabase.co/rest/v1/clientes**", async (route) => {
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

  await row.getByRole("button", { name: "Editar a Sofía Prueba" }).click();
  await page.getByRole("textbox", { name: "Empresa" }).fill("Horizonte Actualizado");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(row).toContainText("Horizonte Actualizado");
  await page.reload();
  await expect(page.getByRole("row").filter({ hasText: "Sofía Prueba" })).toContainText("Horizonte Actualizado");

  await page.getByRole("row").filter({ hasText: "Sofía Prueba" }).getByRole("button", { name: "Eliminar a Sofía Prueba" }).click();
  const confirmation = page.getByRole("alertdialog");
  await confirmation.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "Sofía Prueba" })).toHaveCount(0);
  await expect(database.rows).toHaveLength(1);
});

test("muestra un error de carga y permite reintentar", async ({ page }) => {
  const database = await mockClientes(page);
  database.setUnavailable(true);
  await page.goto("/clientes");
  await expect(page.getByRole("alert").filter({ hasText: "Servicio no disponible" })).toBeVisible();
  database.setUnavailable(false);
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByRole("row").filter({ hasText: "Ana García" })).toBeVisible();
});
