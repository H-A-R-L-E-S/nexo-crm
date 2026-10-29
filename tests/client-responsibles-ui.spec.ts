import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { login } from "./support/login";
import { CLIENT_RESPONSIBLE_IDS as ids, RESPONSIBLE_FIXTURES, clientFixture } from "./support/client-responsibles-fixtures";
import { mockClientResponsibles, type ResponsibleScenario } from "./support/client-responsibles-mock";
import { expectNoHorizontalOverflow, expectResponsibleControlContrast, expectResponsibleTextContrast, expectTouchTargets, expectVisibleFocus } from "./support/client-responsibles-a11y";
import type { UserRole } from "../src/features/auth/roles";

async function openPreview(page: Page, scenario: ResponsibleScenario = "create", role: UserRole = "Administrador") {
  await page.goto(`/prueba-responsables-clientes?scenario=${scenario}&role=${encodeURIComponent(role)}`);
  await expect(page.getByText("Vista de pruebas local", { exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test.beforeEach(async ({ page, request }) => {
  await request.post("http://127.0.0.1:54321/__test/reset");
  await login(page);
});

test("la ruta de pruebas rechaza un host público aunque el servidor local tenga mocks habilitados", async ({ page }) => {
  const response = await page.request.get("http://127.0.0.1:3100/prueba-responsables-clientes", { headers: { host: "crm.example.test" } });
  expect(response.status()).toBe(404);
  expect(await response.text()).not.toContain("Vista de pruebas local");
});

test("vista local: reintenta contexto, cierra y reabre el diálogo y cambia los tres temas", async ({ page }) => {
  const memory = await mockClientResponsibles(page);
  let contextCalls = 0;
  await page.route("**/__test/client-responsibles/context**", (route) => {
    contextCalls++;
    return contextCalls === 1 ? route.fulfill({ status: 503, json: { message: "Contexto de prueba no disponible." } }) : route.fallback();
  });
  await page.goto("/prueba-responsables-clientes");
  await expect(page.getByRole("alert").filter({ hasText: "Contexto de prueba no disponible." })).toBeVisible();
  await page.getByRole("button", { name: "Reintentar contexto", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("button", { name: "Nuevo cliente", exact: true })).toBeFocused();
  for (const [label, theme] of [["Claro", "light"], ["Oscuro", "dark"], ["Sistema", "system"]]) {
    await page.getByRole("button", { name: /Cambiar tema/ }).click();
    await page.getByRole("menuitemradio", { name: label, exact: true }).click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem("nexo-theme"))).toBe(theme);
  }
  await page.getByRole("button", { name: "Nuevo cliente", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(memory.saves).toHaveLength(0);
});

async function fillContact(page: Page) {
  await page.getByRole("textbox", { name: "Nombres", exact: true }).fill("Contacto");
  await page.getByRole("textbox", { name: "Apellidos", exact: true }).fill("Prueba local");
  await page.getByRole("textbox", { name: "Correo electrónico", exact: true }).fill("contacto-local@example.test");
  await page.getByRole("textbox", { name: "Teléfono", exact: true }).fill("999123456");
}

async function chooseResponsible(page: Page, id: string) {
  const search = page.getByRole("combobox", { name: "Responsable", exact: true });
  await search.fill(id);
  const option = responsibleOptions(page).filter({ hasText: id });
  await expect(option).toBeVisible();
  await expect(option).not.toHaveAttribute("aria-disabled", "true");
  await option.click();
}

function responsibleOptions(page: Page) {
  return page.getByRole("listbox", { name: "Responsables reales", exact: true }).getByRole("option");
}

type WiredClientRow = {
  id: string; nombres: string; apellidos: string; empresa: string; correo: string; telefono: string;
  cargo: string; estado: string; direccion: string; notas: string; responsable: string;
  responsable_id: string | null; ultimo_contacto: string | null; created_at: string; updated_at: string;
};

function wiredRow(overrides: Partial<WiredClientRow> = {}): WiredClientRow {
  const client = clientFixture();
  return {
    id: client.id, nombres: client.firstName, apellidos: client.lastName, empresa: client.company,
    correo: client.email, telefono: client.phone, cargo: client.position, estado: client.status,
    direccion: client.address, notas: client.notes, responsable: client.owner,
    responsable_id: client.ownerId, ultimo_contacto: client.lastContact,
    created_at: client.createdAt, updated_at: client.updatedAt, ...overrides,
  };
}

async function mockWiredClients(page: Page, initial: WiredClientRow[] = [], rpcError?: string) {
  const rows = initial.map((row) => ({ ...row }));
  const writes: { method: string; body: Record<string, unknown>; url: string }[] = [];
  await page.route("http://127.0.0.1:54321/rest/v1/rpc/client_responsibles", (route) => rpcError
    ? route.fulfill({ status: 403, json: { code: "42501", message: rpcError } })
    : route.fulfill({ json: RESPONSIBLE_FIXTURES }));
  await page.route("http://127.0.0.1:54321/rest/v1/clientes**", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const id = url.searchParams.get("id")?.replace("eq.", "");
    const single = request.headers().accept?.includes("vnd.pgrst.object");
    const respond = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (request.method() === "GET") {
      const selected = id ? rows.filter((row) => row.id === id) : rows;
      if (url.searchParams.get("select") === "responsable_id") {
        const body = selected[0] ? { responsable_id: selected[0].responsable_id } : null;
        return respond(single ? body : body ? [body] : []);
      }
      return respond(single ? selected[0] ?? null : selected);
    }
    const body = request.postDataJSON() as Record<string, unknown>;
    writes.push({ method: request.method(), body, url: request.url() });
    if (request.method() === "POST") {
      const ownerId = body.responsable_id as string;
      const owner = RESPONSIBLE_FIXTURES.find((person) => person.id === ownerId);
      const now = new Date().toISOString();
      const row = wiredRow({ ...body, id: crypto.randomUUID(), responsable_id: ownerId, responsable: `${owner?.nombres} ${owner?.apellidos}`.trim(), created_at: now, updated_at: now } as Partial<WiredClientRow>);
      rows.unshift(row);
      return respond(single ? row : [row], 201);
    }
    if (request.method() === "PATCH") {
      const index = rows.findIndex((row) => row.id === id);
      if (index < 0) return respond(single ? null : []);
      const ownerId = Object.hasOwn(body, "responsable_id") ? body.responsable_id as string : rows[index].responsable_id;
      const owner = RESPONSIBLE_FIXTURES.find((person) => person.id === ownerId);
      rows[index] = { ...rows[index], ...body, ...(Object.hasOwn(body, "responsable_id") ? { responsable: `${owner?.nombres} ${owner?.apellidos}`.trim() } : {}), updated_at: new Date().toISOString() };
      return respond(single ? rows[index] : [rows[index]]);
    }
    return respond({ message: "Método inesperado" }, 405);
  });
  return { rows, writes };
}

test("alta: valida contacto y exige UUID explícito sin elegir un homónimo por nombre", async ({ page }) => {
  const memory = await mockClientResponsibles(page);
  await openPreview(page);
  await expect(page.locator('input[name="ownerId"]')).toHaveValue("");
  await page.getByRole("button", { name: "Guardar cliente", exact: true }).click();
  await expect(page.getByRole("alert").first()).toBeVisible();
  expect(memory.saves).toHaveLength(0);
  await fillContact(page);
  await page.getByRole("button", { name: "Guardar cliente", exact: true }).click();
  expect(memory.saves).toHaveLength(0);
  const search = page.getByRole("combobox", { name: "Responsable", exact: true });
  await search.fill("homonimo");
  await expect(responsibleOptions(page)).toHaveCount(2);
  await expect(responsibleOptions(page).nth(0)).toContainText(ids.duplicateA);
  await expect(responsibleOptions(page).nth(1)).toContainText(ids.duplicateB);
  await search.press("ArrowDown");
  await search.press("End");
  await search.press("Enter");
  await expect(page.getByText("Responsable seleccionado", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Guardar cliente", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(memory.successfulSaves).toHaveLength(1);
  expect(memory.successfulSaves[0]).toMatchObject({ kind: "create", input: { ownerId: ids.duplicateB, firstName: "Contacto", lastName: "Prueba local" } });
  expect(memory.successfulSaves[0].kind === "create" && Object.hasOwn(memory.successfulSaves[0].input, "owner")).toBe(false);
  expect(memory.client?.ownerId).toBe(ids.duplicateB);
  await expect(page.getByTestId("client-responsibles-save")).toContainText(ids.duplicateB);
});

for (const role of ["Administrador", "Gerente"] as const) {
  test(`${role}: cambia UUID y envía la versión original sin reescribir texto histórico`, async ({ page }) => {
    const memory = await mockClientResponsibles(page, { scenario: "linked", role });
    await openPreview(page, "linked", role);
    await chooseResponsible(page, ids.seller);
    await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(memory.successfulSaves).toHaveLength(1);
    expect(memory.successfulSaves[0]).toMatchObject({ kind: "update", request: { responsableId: ids.seller, expectedUpdatedAt: "2026-10-22T12:00:00.123456+00:00" } });
    expect(memory.client?.ownerId).toBe(ids.seller);
    expect(memory.client?.owner).toBe("Homónimo Prueba");
  });
}

test("histórico Ana García: editar otro campo conserva texto exacto y UUID NULL", async ({ page }) => {
  const memory = await mockClientResponsibles(page, { scenario: "historical" });
  await openPreview(page, "historical");
  await expect(page.getByText("Ana García", { exact: true })).toBeVisible();
  await expect(page.getByText("Pendiente de vincular", { exact: true })).toBeVisible();
  await expect(page.locator('input[name="ownerId"]')).toHaveValue("");
  await page.getByRole("textbox", { name: "Empresa", exact: true }).fill("Empresa actualizada local");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(memory.client?.owner).toBe("Ana García");
  expect(memory.client?.ownerId).toBeNull();
  expect(memory.client?.company).toBe("Empresa actualizada local");
  const saved = memory.successfulSaves[0];
  expect(saved.kind).toBe("update");
  if (saved.kind === "update") {
    expect(Object.hasOwn(saved.request, "responsableId")).toBe(false);
    expect(Object.hasOwn(saved.request.contact, "owner")).toBe(false);
  }
});

test("histórico: cancelar un cambio explícito vuelve a conservar NULL sin asignación automática", async ({ page }) => {
  const memory = await mockClientResponsibles(page, { scenario: "historical" });
  await openPreview(page, "historical");
  await chooseResponsible(page, ids.seller);
  await page.getByRole("button", { name: "Conservar asignación actual", exact: true }).click();
  await page.getByRole("textbox", { name: "Notas", exact: true }).fill("Nota local sin reasignar");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(memory.client?.ownerId).toBeNull();
  expect(memory.client?.owner).toBe("Ana García");
});

for (const [scenario, state, expectedId] of [
  ["inactive", "Inactivo", ids.inactive],
  ["incomplete", "Perfil incompleto", ids.incomplete],
] as const) {
  test(`${scenario}: conserva referencia histórica y muestra su estado sin habilitar nuevas asignaciones`, async ({ page }) => {
    const memory = await mockClientResponsibles(page, { scenario });
    await openPreview(page, scenario);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(state);
    await expect(dialog).toContainText(expectedId);
    await page.getByRole("combobox", { name: "Responsable", exact: true }).fill(expectedId);
    await expect(responsibleOptions(page).filter({ hasText: expectedId })).toHaveAttribute("aria-disabled", "true");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Responsable", exact: true })).toHaveAttribute("aria-expanded", "false");
    await page.getByRole("textbox", { name: "Empresa", exact: true }).fill("Contacto histórico conservado");
    await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(memory.client?.ownerId).toBe(expectedId);
    expect(memory.client?.owner).toBe(scenario === "inactive" ? "Inactivo Prueba" : "Nombre histórico incompleto");
  });
}

test("perfil sin nombres: diagnóstico visible por UUID, sin nombre inventado ni opción elegible", async ({ page }) => {
  const memory = await mockClientResponsibles(page);
  await openPreview(page);
  await page.getByRole("combobox", { name: "Responsable", exact: true }).fill(ids.incomplete);
  const option = responsibleOptions(page).filter({ hasText: ids.incomplete });
  await expect(option).toContainText("Perfil incompleto");
  await expect(option).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  expect(memory.saves).toHaveLength(0);
  await expect(page.getByText("Responsable seleccionado", { exact: true })).toHaveCount(0);
});

test("Vendedor: alta exige elección de su propio UUID y no ofrece otros candidatos", async ({ page }) => {
  const memory = await mockClientResponsibles(page, { role: "Vendedor" });
  await openPreview(page, "create", "Vendedor");
  await fillContact(page);
  await page.getByRole("button", { name: "Guardar cliente", exact: true }).click();
  expect(memory.saves).toHaveLength(0);
  await page.getByRole("combobox", { name: "Responsable", exact: true }).fill("prueba");
  await expect(responsibleOptions(page)).toHaveCount(1);
  await expect(responsibleOptions(page)).toContainText(ids.seller);
  await responsibleOptions(page).click();
  await page.getByRole("button", { name: "Guardar cliente", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(memory.client?.ownerId).toBe(ids.seller);
});

test("Vendedor: edita contacto histórico sin apropiárselo ni mostrar reasignación habilitada", async ({ page }) => {
  const memory = await mockClientResponsibles(page, { scenario: "historical", role: "Vendedor" });
  await openPreview(page, "historical", "Vendedor");
  await expect(page.getByText("Pendiente de vincular", { exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Responsable", exact: true })).toBeDisabled();
  await page.getByRole("textbox", { name: "Empresa", exact: true }).fill("Actualización por vendedor local");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(memory.client?.ownerId).toBeNull();
  expect(memory.client?.owner).toBe("Ana García");
});

test("directorio: carga perceptible, error con reintento y búsqueda sin resultados", async ({ page }) => {
  const memory = await mockClientResponsibles(page, { holdDirectory: true, directoryError: "No se pudo cargar el directorio local." });
  await openPreview(page);
  await expect(page.getByRole("dialog")).toContainText(/Cargando responsables/);
  memory.releaseDirectory();
  await expect(page.getByRole("alert").filter({ hasText: "No se pudo cargar el directorio local." })).toBeVisible();
  await page.getByRole("textbox", { name: "Empresa", exact: true }).fill("Valor conservado tras reintento");
  memory.directoryError = null;
  await page.getByRole("button", { name: /Reintentar/ }).click();
  await expect.poll(() => memory.directoryCalls).toBe(2);
  await expect(page.getByRole("textbox", { name: "Empresa", exact: true })).toHaveValue("Valor conservado tras reintento");
  await page.getByRole("combobox", { name: "Responsable", exact: true }).fill("sin coincidencias locales");
  await expect(page.getByRole("dialog")).toContainText(/No (hay|encontramos).*responsables|No hay coincidencias|Sin coincidencias/i);
  await expect(responsibleOptions(page)).toHaveCount(0);
});

test("directorio vacío no ofrece demo ni asigna un responsable por defecto", async ({ page }) => {
  const memory = await mockClientResponsibles(page, { empty: true });
  await openPreview(page);
  await expect(page.getByRole("dialog")).toContainText(/No hay responsables|Sin responsables/i);
  await fillContact(page);
  await page.getByRole("button", { name: "Guardar cliente", exact: true }).click();
  expect(memory.saves).toHaveLength(0);
  await expect(page.getByRole("dialog")).not.toContainText("Carlos Mendoza");
});

test("conflicto de versión conserva formulario y selección sin reintento automático", async ({ page }) => {
  const memory = await mockClientResponsibles(page, { scenario: "linked", saveError: "El cliente cambió. Recarga antes de volver a guardar.", saveStatus: 409 });
  await openPreview(page, "linked");
  await chooseResponsible(page, ids.seller);
  await page.getByRole("textbox", { name: "Empresa", exact: true }).fill("Cambio aún sin guardar");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "El cliente cambió." })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Empresa", exact: true })).toHaveValue("Cambio aún sin guardar");
  expect(memory.saves).toHaveLength(1);
  expect(memory.successfulSaves).toHaveLength(0);
  expect(memory.client?.ownerId).toBe(ids.duplicateA);
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("rechazo de autorización del servidor mantiene los datos hasta una nueva acción explícita", async ({ page }) => {
  const memory = await mockClientResponsibles(page, { saveError: "No tienes permisos para asignar ese responsable.", saveStatus: 403 });
  await openPreview(page);
  await fillContact(page);
  await chooseResponsible(page, ids.seller);
  await page.getByRole("button", { name: "Guardar cliente", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "No tienes permisos para asignar ese responsable." })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Nombres", exact: true })).toHaveValue("Contacto");
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(memory.saves).toHaveLength(1);
  expect(memory.successfulSaves).toHaveLength(0);
  memory.saveError = null;
  await page.getByRole("button", { name: "Guardar cliente", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(memory.saves).toHaveLength(2);
  expect(memory.successfulSaves).toHaveLength(1);
});

test("directorio no disponible: permite guardar otro campo sin perder el responsable histórico", async ({ page }) => {
  const memory = await mockClientResponsibles(page, { scenario: "historical", directoryError: "Directorio local no disponible." });
  await openPreview(page, "historical");
  await expect(page.getByRole("alert").filter({ hasText: "Directorio local no disponible." })).toBeVisible();
  await page.getByRole("textbox", { name: "Empresa", exact: true }).fill("Contacto conservado sin directorio");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(memory.client?.owner).toBe("Ana García");
  expect(memory.client?.ownerId).toBeNull();
});

for (const theme of ["light", "dark", "system"] as const) {
  test(`${theme}: 320 px, estados intermedios, contraste, texto ampliado y teclado`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.addInitScript((value) => localStorage.setItem("nexo-theme", value), theme);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await mockClientResponsibles(page, { scenario: "historical" });
    await page.setViewportSize({ width: 320, height: 844 });
    await openPreview(page, "historical");
    await expect(page.locator("html")).toHaveClass(theme === "light" ? /light/ : /dark/);
    const dialog = page.getByRole("dialog");
    const search = page.getByRole("combobox", { name: "Responsable", exact: true });
    await search.fill("prueba");
    await search.press("ArrowDown");
    await expectVisibleFocus(search);
    await expect(search).toHaveAttribute("aria-activedescendant", /.+/);
    const contrasts = await expectResponsibleTextContrast(dialog);
    const contrastPath = testInfo.outputPath(`responsible-contrast-${theme}.json`);
    await writeFile(contrastPath, JSON.stringify(contrasts, null, 2));
    await testInfo.attach(`responsible-contrast-${theme}.json`, { path: contrastPath, contentType: "application/json" });
    const borders = await expectResponsibleControlContrast(dialog);
    const borderPath = testInfo.outputPath(`responsible-control-contrast-${theme}.json`);
    await writeFile(borderPath, JSON.stringify(borders, null, 2));
    await testInfo.attach(`responsible-control-contrast-${theme}.json`, { path: borderPath, contentType: "application/json" });
    await expectTouchTargets(dialog);
    await page.screenshot({ path: testInfo.outputPath(`responsibles-${theme}-320.png`), fullPage: true, animations: "disabled" });
    await search.press("Escape");
    await expect(search).toHaveAttribute("aria-expanded", "false");
    await expect(dialog).toBeVisible();
    for (const width of [320, 640, 900, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await expectNoHorizontalOverflow(page);
    }
    await search.fill("homonimo");
    await page.screenshot({ path: testInfo.outputPath(`responsibles-${theme}-1280.png`), fullPage: true, animations: "disabled" });
    await search.press("Escape");
    await page.setViewportSize({ width: 320, height: 844 });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await expectNoHorizontalOverflow(page);
    await page.getByRole("textbox", { name: "Notas", exact: true }).focus();
    await expect(page.getByRole("textbox", { name: "Notas", exact: true })).toBeFocused();
    await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
    if (theme === "system") {
      await page.emulateMedia({ colorScheme: "light" });
      await expect(page.locator("html")).toHaveClass(/light/);
      await expectResponsibleTextContrast(dialog);
    }
    for (let step = 0; step < 20; step++) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "Editar cliente", exact: true })).toBeFocused();
    expect(errors).toEqual([]);
  });
}

test("flujo operativo previo: no llama directorio UUID ni envía columnas nuevas y conserva Ana García", async ({ page }) => {
  const current = clientFixture();
  const row = { id: current.id, nombres: current.firstName, apellidos: current.lastName, empresa: current.company, correo: current.email, telefono: current.phone, cargo: current.position, estado: current.status, direccion: current.address, notas: current.notes, responsable: current.owner, ultimo_contacto: current.lastContact, created_at: current.createdAt, updated_at: current.updatedAt };
  const writes: Record<string, unknown>[] = [];
  const uuidRequests: string[] = [];
  page.on("request", (item) => { if (item.url().includes("/rpc/client_responsibles") || new URL(item.url()).searchParams.get("select")?.includes("responsable_id")) uuidRequests.push(item.url()); });
  await page.route("http://127.0.0.1:54321/rest/v1/tareas**", (route) => route.fulfill({ json: [] }));
  await page.route("http://127.0.0.1:54321/rest/v1/clientes**", (route) => {
    if (route.request().method() === "PATCH") {
      const input = route.request().postDataJSON() as Record<string, unknown>;
      writes.push(input);
      Object.assign(row, input);
      return route.fulfill({ json: row });
    }
    return route.fulfill({ json: [row] });
  });
  await page.goto("/clientes");
  await page.getByRole("button", { name: "Acciones de Cliente Prueba", exact: true }).click();
  await page.getByRole("menuitem", { name: "Editar a Cliente Prueba", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Responsable histórico", exact: true })).toHaveValue("Ana García");
  await page.getByRole("textbox", { name: "Empresa", exact: true }).fill("Edición heredada local");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(writes).toHaveLength(1);
  expect(Object.hasOwn(writes[0], "responsable_id")).toBe(false);
  expect(Object.hasOwn(writes[0], "responsable")).toBe(false);
  expect(row.responsable).toBe("Ana García");
  expect(uuidRequests).toEqual([]);
});

test("/clientes UUID: crea con RPC real simulada y responsable_id sin resolver por nombre", async ({ page }) => {
  const database = await mockWiredClients(page);
  await page.goto("/clientes?responsables_uuid=enabled");
  await page.getByRole("button", { name: "Registrar primer cliente", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Responsable", exact: true })).toBeVisible();
  await fillContact(page);
  await chooseResponsible(page, ids.duplicateB);
  await page.getByRole("button", { name: "Guardar cliente", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(database.writes).toHaveLength(1);
  expect(database.writes[0]).toMatchObject({ method: "POST", body: { responsable_id: ids.duplicateB } });
  expect(Object.hasOwn(database.writes[0].body, "responsable")).toBe(false);
  await expect(page.getByRole("row").filter({ hasText: "Homónimo Prueba" })).toBeVisible();
});

test("/clientes UUID: edita contacto con responsable NULL sin tocar texto histórico", async ({ page }) => {
  const database = await mockWiredClients(page, [wiredRow()]);
  await page.goto("/clientes?responsables_uuid=enabled");
  await page.getByRole("button", { name: "Acciones de Cliente Prueba", exact: true }).click();
  await page.getByRole("menuitem", { name: "Editar a Cliente Prueba", exact: true }).click();
  await expect(page.getByText("Pendiente de vincular", { exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Empresa", exact: true }).fill("Historia conservada por wiring");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(database.writes).toHaveLength(1);
  expect(database.writes[0].method).toBe("PATCH");
  expect(Object.hasOwn(database.writes[0].body, "responsable_id")).toBe(false);
  expect(Object.hasOwn(database.writes[0].body, "responsable")).toBe(false);
  expect(database.rows[0].responsable).toBe("Ana García");
  expect(database.rows[0].responsable_id).toBeNull();
});

test("/clientes UUID: Administrador reasigna por UUID con concurrencia optimista", async ({ page }) => {
  const database = await mockWiredClients(page, [wiredRow({ responsable: "Carlos Prueba", responsable_id: ids.admin })]);
  await page.goto("/clientes?responsables_uuid=enabled");
  await page.getByRole("button", { name: "Acciones de Cliente Prueba", exact: true }).click();
  await page.getByRole("menuitem", { name: "Editar a Cliente Prueba", exact: true }).click();
  await chooseResponsible(page, ids.seller);
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  const patch = database.writes.find((write) => write.method === "PATCH");
  expect(patch?.body).toMatchObject({ responsable_id: ids.seller });
  expect(patch?.url).toContain("updated_at=eq.");
  expect(database.rows[0].responsable_id).toBe(ids.seller);
  expect(database.rows[0].responsable).toBe("Diego Prueba");
});

test("/clientes UUID: error RPC mantiene el alta bloqueada con reintento visible", async ({ page }) => {
  const database = await mockWiredClients(page, [], "No tienes permisos para consultar responsables.");
  await page.goto("/clientes?responsables_uuid=enabled");
  await page.getByRole("button", { name: "Registrar primer cliente", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "No tienes permisos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reintentar", exact: true })).toBeVisible();
  await fillContact(page);
  await page.getByRole("button", { name: "Guardar cliente", exact: true }).click();
  expect(database.writes).toHaveLength(0);
  await expect(page.getByRole("dialog")).toBeVisible();
});
