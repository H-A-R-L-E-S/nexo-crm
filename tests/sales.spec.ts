import { expect, test, type Page } from "@playwright/test";
import { login } from "./support/login";
import { saleAmounts, itemAmounts, quantityUnits } from "../src/features/sales/calculations";
import { salesStats } from "../src/features/sales/stats";
import { validateSale } from "../src/features/sales/validation";
import type { Sale, SaleItem, SaleItemInput, SaveSale } from "../src/features/sales/types";

const clientId = "11111111-1111-4111-8111-111111111111";
const opportunityId = "22222222-2222-4222-8222-222222222222";
const adminId = "00000000-0000-4000-8000-000000000001";
const sellerId = "00000000-0000-4000-8000-000000000003";
const fixture: Sale = { id: "33333333-3333-4333-8333-333333333333", numero: "V-2026-000001", cliente_id: clientId, oportunidad_id: null, responsable_id: adminId, estado: "Borrador", moneda: "PEN", subtotal: "100.00", descuento: "0.00", impuesto: "18.00", total: "118.00", aplica_igv: true, fecha_venta: "2026-10-01", fecha_pago: null, metodo_pago: "", referencia_pago: "", observaciones: "Venta inicial", motivo_cancelacion: "", cancelada_at: null, cancelada_por: null, emitida_at: null, created_at: "2026-10-01T12:00:00Z", updated_at: "2026-10-01T12:00:00Z" };
const fixtureItem: SaleItem = { id: "44444444-4444-4444-8444-444444444444", venta_id: fixture.id, descripcion: "Servicio inicial", cantidad: "1.000", precio_unitario: "100.00", descuento: "0.00", subtotal: "100.00", orden: 1, created_at: fixture.created_at };
const people = [
  { id: adminId, nombres: "Carlos", apellidos: "Prueba", activo: true, rol: "Administrador" },
  { id: "00000000-0000-4000-8000-000000000002", nombres: "Lucía", apellidos: "Prueba", activo: true, rol: "Gerente" },
  { id: sellerId, nombres: "Diego", apellidos: "Prueba", activo: true, rol: "Vendedor" },
  { id: "00000000-0000-4000-8000-000000000004", nombres: "Inactivo", apellidos: "Prueba", activo: false, rol: "Vendedor" },
];
const customer = { id: clientId, nombres: "Ana", apellidos: "García", empresa: "Horizonte", correo: "ana@example.test", telefono: "999123456", cargo: "", estado: "Activo", direccion: "", notas: "", responsable: "Carlos Prueba", ultimo_contacto: null, created_at: fixture.created_at, updated_at: fixture.updated_at };
const wonOpportunity = { id: opportunityId, titulo: "Contrato anual", cliente_id: clientId, lead_id: null, responsable_id: sellerId, etapa: "Ganada", valor: "1000.00", probabilidad: 100, fecha_cierre_estimada: "2026-10-15", descripcion: "", origen: "Web", cerrada_at: fixture.created_at, created_at: fixture.created_at, updated_at: fixture.updated_at };
const decimal = (cents: bigint) => `${cents / BigInt(100)}.${String(cents % BigInt(100)).padStart(2, "0")}`;

test.beforeEach(async ({ request }) => { await request.post("http://127.0.0.1:54321/__test/reset"); });
// Contrato local del navegador. Las garantías PostgreSQL se verifican con supabase/tests/sales.sql.
async function mockSales(page: Page, initial: Sale[] = [fixture]) {
  const rows = initial.map((row) => ({ ...row }));
  const items = initial.map((row) => ({ ...fixtureItem, id: crypto.randomUUID(), venta_id: row.id }));
  const requests = new Map<string, string>();
  let number = initial.length;
  let fail = false, stale = false, loseResponse = false;
  let writes = 0;
  await page.route("http://127.0.0.1:54321/rest/v1/clientes**", (route) => route.fulfill({ json: [customer] }));
  await page.route("http://127.0.0.1:54321/rest/v1/oportunidades**", (route) => route.fulfill({ json: [wonOpportunity, { ...wonOpportunity, id: "55555555-5555-4555-8555-555555555555", titulo: "En negociación", etapa: "Negociación" }] }));
  await page.route(/\/rest\/v1\/rpc\/(sale_responsibles|opportunity_responsibles)$/, (route) => route.fulfill({ json: people }));
  await page.route("http://127.0.0.1:54321/rest/v1/leads**", (route) => route.fulfill({ json: [] }));
  await page.route("http://127.0.0.1:54321/rest/v1/ventas**", async (route) => {
    if (fail) return route.fulfill({ status: 503, json: { message: "Offline" } });
    const id = new URL(route.request().url()).searchParams.get("id")?.replace("eq.", "");
    return route.fulfill({ json: id ? rows.filter((row) => row.id === id) : rows });
  });
  await page.route("http://127.0.0.1:54321/rest/v1/venta_items**", (route) => {
    const id = new URL(route.request().url()).searchParams.get("venta_id")?.replace("eq.", "");
    return route.fulfill({ json: items.filter((item) => item.venta_id === id) });
  });
  await page.route("http://127.0.0.1:54321/rest/v1/rpc/save_sale", async (route) => {
    const data = route.request().postDataJSON() as { p_id: string | null; p_request_id: string; p_data: SaveSale; p_items: SaleItemInput[] };
    if (!data.p_id && requests.has(data.p_request_id)) return route.fulfill({ json: requests.get(data.p_request_id) });
    const previous = rows.find((row) => row.id === data.p_id);
    if (stale) return route.fulfill({ status: 409, json: { code: "40001", message: "La venta cambió. Actualiza antes de editarla." } });
    if (previous && ["Pagada", "Cancelada"].includes(previous.estado)) return route.fulfill({ status: 403, json: { code: "42501", message: "Una venta pagada o cancelada no puede editarse." } });
    const sums = saleAmounts(data.p_items, data.p_data.aplica_igv);
    const sale: Sale = { ...(previous ?? { ...fixture, id: crypto.randomUUID(), numero: `V-2026-${String(++number).padStart(6, "0")}` }), ...data.p_data, subtotal: decimal(sums.subtotal), descuento: decimal(sums.discount), impuesto: decimal(sums.tax), total: decimal(sums.total), updated_at: new Date().toISOString(), emitida_at: data.p_data.estado === "Borrador" ? null : new Date().toISOString() };
    if (previous) rows[rows.indexOf(previous)] = sale; else { rows.unshift(sale); requests.set(data.p_request_id, sale.id); }
    for (let i = items.length - 1; i >= 0; i--) if (items[i].venta_id === sale.id) items.splice(i, 1);
    data.p_items.forEach((item, index) => items.push({ ...item, id: crypto.randomUUID(), venta_id: sale.id, subtotal: decimal(itemAmounts(item).subtotal), orden: index + 1, created_at: sale.updated_at }));
    writes++;
    if (loseResponse) { loseResponse = false; return route.abort("connectionreset"); }
    return route.fulfill({ json: sale.id });
  });
  await page.route("http://127.0.0.1:54321/rest/v1/rpc/set_sale_status", async (route) => {
    const data = route.request().postDataJSON() as { p_id: string; p_estado: Sale["estado"]; p_fecha_pago: string | null; p_metodo_pago: Sale["metodo_pago"]; p_referencia_pago: string; p_motivo: string };
    const row = rows.find((row) => row.id === data.p_id)!;
    Object.assign(row, { estado: data.p_estado, updated_at: new Date().toISOString(), emitida_at: row.emitida_at ?? new Date().toISOString() });
    if (data.p_estado === "Pagada") Object.assign(row, { fecha_pago: data.p_fecha_pago, metodo_pago: data.p_metodo_pago, referencia_pago: data.p_referencia_pago });
    else Object.assign(row, { motivo_cancelacion: data.p_motivo, cancelada_at: new Date().toISOString(), cancelada_por: adminId });
    writes++; return route.fulfill({ json: row.id });
  });
  await page.route("http://127.0.0.1:54321/rest/v1/rpc/delete_sale", async (route) => {
    const input = route.request().postDataJSON() as { p_id: string };
    const index = rows.findIndex((row) => row.id === input.p_id);
    rows.splice(index, 1); writes++; return route.fulfill({ json: true });
  });
  return { rows, items, writes: () => writes, fail: (value: boolean) => { fail = value; }, stale: () => { stale = true; }, loseResponse: () => { loseResponse = true; } };
}

async function fillItems(page: Page) {
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Cliente *", { exact: true }).selectOption(clientId);
  const first = dialog.getByRole("region", { name: "Ítem 1", exact: true });
  await first.getByLabel("Descripción *", { exact: true }).fill("Consultoría");
  await first.getByLabel("Cantidad *", { exact: true }).fill("2");
  await first.getByLabel("Precio unitario (S/) *", { exact: true }).fill("100");
  await first.getByLabel("Descuento del ítem (S/)", { exact: true }).fill("10");
  await dialog.getByRole("button", { name: "Agregar producto/servicio" }).click();
  const second = dialog.getByRole("region", { name: "Ítem 2", exact: true });
  await second.getByLabel("Descripción *", { exact: true }).fill("Soporte");
  await second.getByLabel("Cantidad *", { exact: true }).fill("1.5");
  await second.getByLabel("Precio unitario (S/) *", { exact: true }).fill("20");
}

for (const [role, email] of [["Administrador", "admin@example.test"], ["Gerente", "gerente@example.test"], ["Vendedor", "vendedor@example.test"]]) {
  test(`${role}: alta con ítems, edición, pago y restricciones`, async ({ page }) => {
    const db = await mockSales(page); await login(page, email);
    await page.getByRole("link", { name: "Ventas", exact: true }).click();
    await page.getByRole("button", { name: "Nueva venta", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Crear venta", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("Selecciona un cliente");
    await fillItems(page);
    await expect(dialog).toContainText("S/ 259.60");
    if (role === "Vendedor") await expect(dialog.getByLabel("Responsable *", { exact: true })).toBeDisabled();
    else await dialog.getByLabel("Responsable *", { exact: true }).selectOption(sellerId);
    await expect(dialog.getByLabel("Responsable *", { exact: true }).locator("option").filter({ hasText: "Inactivo" })).toHaveCount(0);
    await dialog.getByRole("button", { name: "Crear venta", exact: true }).click(); await expect(dialog).toBeHidden();
    const row = page.getByRole("row").filter({ hasText: "V-2026-000002" });
    await expect(row).toContainText("S/ 259.60");
    expect(db.items.filter((item) => item.venta_id === db.rows[0].id)).toHaveLength(2);
    await row.getByRole("button", { name: "Editar venta" }).click();
    await dialog.getByRole("region", { name: "Ítem 1", exact: true }).getByLabel("Precio unitario (S/) *", { exact: true }).fill("120");
    await dialog.getByLabel("Estado *", { exact: true }).selectOption("Pendiente");
    await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click(); await expect(dialog).toBeHidden();
    await expect(row).toContainText("S/ 306.80"); await expect(row).toContainText("Pendiente");
    await expect(row.getByRole("button", { name: "Eliminar borrador" })).toHaveCount(0);
    await row.getByRole("button", { name: "Marcar pagada" }).click();
    await dialog.getByRole("button", { name: "Marcar Pagada", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("método de pago");
    await dialog.getByLabel("Método de pago *", { exact: true }).selectOption("Yape");
    await dialog.getByLabel("Referencia de pago", { exact: true }).fill("YAPE-PRUEBA-123");
    await dialog.getByRole("button", { name: "Marcar Pagada", exact: true }).click(); await expect(dialog).toBeHidden();
    await expect(row).toContainText("Pagada");
    await expect(row.getByRole("button", { name: "Editar venta" })).toHaveCount(0);
    await expect(row.getByRole("button", { name: "Eliminar borrador" })).toHaveCount(0);
    await page.reload(); await expect(row).toContainText("Yape");
    if (role === "Vendedor") {
      await expect(page.getByRole("button", { name: "Eliminar borrador" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Cancelar venta" })).toHaveCount(0);
    } else {
      await row.getByRole("button", { name: "Cancelar venta" }).click();
      await dialog.getByRole("button", { name: "Confirmar cancelación" }).click();
      await expect(dialog.getByRole("alert")).toContainText("motivo");
      await dialog.getByLabel("Motivo de cancelación *", { exact: true }).fill("Operación revertida por acuerdo comercial");
      await dialog.getByRole("button", { name: "Confirmar cancelación" }).click(); await expect(dialog).toBeHidden();
      await expect(row).toContainText("Cancelada");
      expect(db.rows[0].fecha_pago).not.toBeNull(); expect(db.rows[0].total).toBe("306.80");
      const draft = page.getByRole("row").filter({ hasText: fixture.numero });
      await draft.getByRole("button", { name: "Eliminar borrador" }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Volver" }).click();
      await expect(draft).toBeVisible();
      await draft.getByRole("button", { name: "Eliminar borrador" }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Eliminar borrador", exact: true }).click();
      await expect(draft).toHaveCount(0);
    }
    await row.getByRole("link", { name: "Ver venta" }).click();
    await expect(page.getByRole("heading", { name: "V-2026-000002", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Ítems de la venta" })).toContainText("Consultoría");
    await expect(page.getByRole("region", { name: "Ítems de la venta" })).toContainText("Soporte");
    await expect(page.getByRole("region", { name: "Datos de la venta" })).toContainText("YAPE-PRUEBA-123");
  });
}

test("crear desde oportunidad Ganada preselecciona cliente, oportunidad y responsable", async ({ page }) => {
  await mockSales(page); await login(page); await page.goto("/oportunidades");
  await expect(page.getByRole("link", { name: "Nueva venta: En negociación" })).toHaveCount(0);
  await page.getByRole("link", { name: "Nueva venta: Contrato anual", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Nueva venta", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Cliente *", { exact: true })).toHaveValue(clientId);
  await expect(dialog.getByLabel("Oportunidad", { exact: true })).toHaveValue(opportunityId);
  await expect(dialog.getByLabel("Responsable *", { exact: true })).toHaveValue(sellerId);
  await expect(dialog.getByRole("region", { name: "Ítem 1" }).getByLabel("Descripción *", { exact: true })).toHaveValue("Contrato anual");
});

test("búsqueda, cinco filtros, rango, paginación y reintento", async ({ page }) => {
  const db = await mockSales(page, [fixture, ...Array.from({ length: 11 }, (_, i) => ({ ...fixture, id: crypto.randomUUID(), numero: `V-2026-${String(i + 2).padStart(6, "0")}`, estado: "Pendiente" as const, metodo_pago: "Transferencia" as const, responsable_id: sellerId, referencia_pago: "BANCO-123", fecha_venta: "2026-09-01", emitida_at: fixture.created_at }))]);
  await login(page); await page.goto("/ventas");
  await expect(page.getByText("12 ventas · Página 1 de 2")).toBeVisible();
  await page.getByRole("button", { name: "Siguiente", exact: true }).click(); await expect(page.getByText("12 ventas · Página 2 de 2")).toBeVisible();
  await page.getByLabel("Buscar ventas", { exact: true }).fill("BANCO-123");
  await page.getByLabel("Filtrar por estado", { exact: true }).selectOption("Pendiente");
  await page.getByLabel("Filtrar por responsable", { exact: true }).selectOption(sellerId);
  await page.getByLabel("Filtrar por cliente", { exact: true }).selectOption(clientId);
  await page.getByLabel("Filtrar por método de pago", { exact: true }).selectOption("Transferencia");
  await page.getByLabel("Fecha desde", { exact: true }).fill("2026-09-01");
  await page.getByLabel("Fecha hasta", { exact: true }).fill("2026-09-30");
  await expect(page.getByText("11 ventas · Página 1 de 2")).toBeVisible();
  await page.getByLabel("Fecha desde", { exact: true }).fill("2026-09-02"); await expect(page.getByRole("heading", { name: "Sin ventas para estos filtros" })).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  db.fail(true); await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await expect(page.getByRole("region", { name: "Listado de ventas" }).getByRole("alert")).toContainText("No se pudo completar");
  db.fail(false); await page.getByRole("button", { name: "Reintentar" }).click(); await expect(page.getByText("12 ventas · Página 1 de 2")).toBeVisible();
});

test("reintentar un alta con respuesta perdida no duplica venta ni numeración", async ({ page }) => {
  const db = await mockSales(page, []); await login(page); await page.goto("/ventas");
  await expect(page.getByRole("heading", { name: "Todavía no hay ventas" })).toBeVisible();
  await page.getByRole("button", { name: "Nueva venta", exact: true }).click(); await fillItems(page); db.loseResponse();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Crear venta", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("No se pudo completar");
  await dialog.getByRole("button", { name: "Crear venta", exact: true }).click(); await expect(dialog).toBeHidden();
  expect(db.rows).toHaveLength(1); expect(db.writes()).toBe(1);
  await expect(page.getByRole("row").filter({ hasText: "V-2026-000001" })).toBeVisible();
});

test("editar una venta obsoleta conserva los importes y muestra conflicto", async ({ page }) => {
  const db = await mockSales(page); await login(page); await page.goto("/ventas");
  await page.getByRole("button", { name: `Editar venta ${fixture.numero}`, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("region", { name: "Ítem 1" }).getByLabel("Precio unitario (S/) *", { exact: true }).fill("250"); db.stale();
  await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("La venta cambió"); expect(db.rows[0].total).toBe("118.00");
});

test("móvil: ítems dinámicos y teclado sin desbordamiento", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 }); await mockSales(page); await login(page); await page.goto("/ventas");
  await expect(page.getByRole("row").filter({ hasText: fixture.numero })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("sales-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Nueva venta", exact: true }).focus(); await page.keyboard.press("Enter"); await fillItems(page);
  await page.getByRole("dialog").getByRole("button", { name: "Quitar ítem 2" }).click();
  await expect(page.getByRole("dialog").getByRole("region", { name: "Ítem 2", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press("Escape"); await expect(page.getByRole("button", { name: "Nueva venta", exact: true })).toBeFocused();
});

test("Ventas y detalle exigen sesión", async ({ page }) => { for (const path of ["/ventas", `/ventas/${fixture.id}`]) { await page.goto(path); await expect(page).toHaveURL(/\/login/); } });

test("cálculos exactos, redondeo, descuentos, IGV y canceladas sin ingreso", () => {
  const items = [{ descripcion: "A", cantidad: "2", precio_unitario: "100.00", descuento: "10.00" }, { descripcion: "B", cantidad: "1.5", precio_unitario: "20.00", descuento: "0.00" }];
  expect(saleAmounts(items, true)).toEqual({ subtotal: BigInt(23000), discount: BigInt(1000), tax: BigInt(3960), total: BigInt(25960) });
  expect(saleAmounts(items, false).total).toBe(BigInt(22000));
  expect(itemAmounts({ ...items[0], cantidad: "0.005", precio_unitario: "1", descuento: "0" }).subtotal).toBe(BigInt(1));
  for (const bad of ["0", "-1", "1.0001", "NaN", "1e3", "1000000000"]) expect(() => quantityUnits(bad)).toThrow();
  expect(() => saleAmounts([{ ...items[0], descuento: "200.01" }], true)).toThrow();
  expect(() => saleAmounts([{ ...items[0], cantidad: "999999999.999", precio_unitario: "999999999999.99" }], true)).toThrow();
  const input: SaveSale = { cliente_id: clientId, oportunidad_id: null, responsable_id: adminId, estado: "Pagada", aplica_igv: true, fecha_venta: "2026-10-01", fecha_pago: null, metodo_pago: "", referencia_pago: "", observaciones: "" };
  expect(() => validateSale(input, items)).toThrow("fecha y el método");
  const stats = salesStats([fixture, { ...fixture, estado: "Pagada" }, { ...fixture, estado: "Cancelada", total: "9999.99" }, { ...fixture, estado: "Pendiente" }], new Date("2026-10-01T12:00:00-05:00"));
  expect(stats).toMatchObject({ total: 3, paid: BigInt(11800), pending: BigInt(11800), pendingCount: 1, month: 3 });
});
