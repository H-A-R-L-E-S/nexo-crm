import { expect, test, type Locator, type Page } from "@playwright/test";
import { login } from "./support/login";
import type { Lead, LeadResponsable } from "../src/features/leads/types";

const api = "http://127.0.0.1:54321/rest/v1";
const longName = "Alejandra".repeat(8);
const longCompany = "ConsultoríaComercialInternacional".repeat(3);
const longEmail = `${"contacto".repeat(26)}@example.test`;
const ownerId = "00000000-0000-4000-8000-000000000001";
const clientId = "11111111-1111-4111-8111-111111111111";
const leadId = "22222222-2222-4222-8222-222222222222";
const linkedClientId = "11111111-1111-4111-8111-111111111114";
const people: LeadResponsable[] = [
  { id: ownerId, nombres: "Carlos", apellidos: "Prueba", rol: "Administrador", activo: true },
  { id: "00000000-0000-4000-8000-000000000002", nombres: "Lucía", apellidos: "Prueba", rol: "Gerente", activo: true },
];
const clients = [
  { id: clientId, nombres: "Ana", apellidos: "García", empresa: "Empresa Uno", correo: "ana@example.test", telefono: "+51 987 654 321", cargo: "Gerente", estado: "Activo", direccion: "Lima", notas: "Información explícita de prueba", responsable: "Ana García", ultimo_contacto: null, created_at: "2026-09-01T12:00:00Z", updated_at: "2026-09-01T12:00:00Z" },
  { id: "11111111-1111-4111-8111-111111111112", nombres: "Lucía", apellidos: "Torres", empresa: "Empresa Dos", correo: "lucia@example.test", telefono: "999123456", cargo: "", estado: "Prospecto", direccion: "", notas: "", responsable: "Carlos Mendoza", ultimo_contacto: null, created_at: "2026-09-02T12:00:00Z", updated_at: "2026-09-02T12:00:00Z" },
  { id: "11111111-1111-4111-8111-111111111113", nombres: longName, apellidos: "Fernández".repeat(10), empresa: longCompany, correo: longEmail, telefono: "+51 999 123 456", cargo: "Dirección comercial", estado: "Inactivo", direccion: "Dirección extensa de prueba".repeat(5), notas: "Nota extensa de prueba\n".repeat(30), responsable: "Lucía Torres", ultimo_contacto: null, created_at: "2026-09-03T12:00:00Z", updated_at: "2026-09-03T12:00:00Z" },
];
const fixture: Lead = { id: leadId, nombres: "Elena", apellidos: "Ríos", empresa: "Norte", correo: "elena@example.test", telefono: "987654321", cargo: "Directora", fuente: "Web", estado: "Nuevo", prioridad: "Alta", responsable_id: ownerId, notas: "Información comercial de prueba", ultimo_contacto: null, proximo_seguimiento: "2020-01-01T15:00:00Z", convertido_cliente_id: null, created_at: "2026-09-01T12:00:00Z", updated_at: "2026-09-01T12:00:00Z" };
const leads: Lead[] = [
  fixture,
  { ...fixture, id: "22222222-2222-4222-8222-222222222223", nombres: "Diego", apellidos: "Torres", estado: "Calificado", prioridad: "Media", fuente: "Evento", responsable_id: people[1].id, proximo_seguimiento: null },
  { ...fixture, id: "22222222-2222-4222-8222-222222222224", nombres: longName, apellidos: "Fernández".repeat(10), empresa: longCompany, correo: longEmail, estado: "No interesado", prioridad: "Baja", responsable_id: null, notas: "Nota comercial extensa\n".repeat(30), proximo_seguimiento: null },
  { ...fixture, id: "22222222-2222-4222-8222-222222222225", nombres: "María", apellidos: "Vinculada", estado: "Convertido", convertido_cliente_id: linkedClientId, proximo_seguimiento: null },
];

async function mockDirectories(page: Page) {
  const data = { clients: clients.map((row) => ({ ...row })), leads: leads.map((row) => ({ ...row })) };
  const mutations: string[] = [];
  await page.route(`${api}/tareas**`, (route) => route.fulfill({ json: [] }));
  await page.route(`${api}/rpc/lead_responsibles`, (route) => route.fulfill({ json: people }));
  await page.route(`${api}/rpc/client_responsibles`, (route) => route.fulfill({ json: [] }));
  for (const [path, key] of [["clientes", "clients"], ["leads", "leads"]] as const) {
    await page.route(`${api}/${path}**`, (route) => {
      if (route.request().method() !== "GET") {
        mutations.push(`${route.request().method()} ${path}`);
        return route.fulfill({ status: 400, json: { message: "Mutación no prevista en una prueba de cancelación" } });
      }
      return route.fulfill({ json: data[key] });
    });
  }
  await page.route(`${api}/rpc/convert_lead`, (route) => {
    mutations.push("convert_lead");
    return route.fulfill({ status: 400, json: { message: "Conversión no prevista en una prueba de cancelación" } });
  });
  return { data, mutations };
}

async function noOverflow(page: Page) {
  const layout = await page.evaluate(() => ({
    viewport: innerWidth,
    width: document.documentElement.scrollWidth,
    offenders: Array.from(document.querySelectorAll("main *, [role=dialog] *, [role=menu] *"))
      .filter((element) => element.getBoundingClientRect().right > innerWidth + 1)
      .map((element) => ({ tag: element.tagName, label: element.getAttribute("aria-label"), width: element.getBoundingClientRect().width })).slice(0, 12),
  }));
  expect(layout.width, JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewport);
}

async function textContrast(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((elements) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    const rgba = (value: string): number[] => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const channels = context.getImageData(0, 0, 1, 1).data;
      return [channels[0], channels[1], channels[2], channels[3] / 255];
    };
    const blend = (front: number[], back: number[]) => [0, 1, 2].map((i) => front[i] * front[3] + back[i] * (1 - front[3])).concat(1);
    const background = (element: Element | null): number[] => {
      if (!element) return [255, 255, 255, 1];
      const color = rgba(getComputedStyle(element).backgroundColor);
      return color[3] === 1 ? color : blend(color, background(element.parentElement));
    };
    const luminance = (color: number[]) => color.slice(0, 3).map((channel) => {
      const c = channel / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    return elements.flatMap((element) => {
      const bounds = element.getBoundingClientRect();
      if (bounds.width <= 2 || bounds.height <= 2 || element.closest('nextjs-portal,[aria-hidden="true"],[disabled]')) return [];
      const text = Array.from(element.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent?.trim()).join("").trim();
      if (!text) return [];
      const style = getComputedStyle(element);
      if (style.visibility === "hidden" || style.display === "none") return [];
      const bg = background(element);
      const fg = blend(rgba(style.color), bg);
      const a = luminance(bg); const b = luminance(fg);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const size = parseFloat(style.fontSize);
      const minimum = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700) ? 3 : 4.5;
      return [{ text, ratio, minimum, foreground: style.color, background: bg.join(",") }];
    });
  });
}

async function assertContrast(page: Page, selector: string) {
  const measured = await textContrast(page, selector);
  expect(measured.length).toBeGreaterThan(0);
  expect(measured.filter((pair) => pair.ratio < pair.minimum), JSON.stringify(measured.filter((pair) => pair.ratio < pair.minimum))).toEqual([]);
  return measured;
}

async function menuAction(page: Page, name: string, action: string) {
  const trigger = page.getByRole("button", { name: `Acciones de ${name}`, exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  const item = page.getByRole("menuitem", { name: action, exact: true });
  await page.keyboard.press("Home");
  const itemCount = await page.getByRole("menuitem").count();
  for (let step = 0; step < itemCount; step++) {
    if (await item.evaluate((element) => element === document.activeElement)) break;
    await page.keyboard.press("ArrowDown");
  }
  await expect(item).toBeFocused();
  expect(await item.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
  await assertContrast(page, '[role="menu"] *');
  await page.keyboard.press("Enter");
  return trigger;
}

async function focusStaysInDialog(page: Page, dialog: Locator) {
  for (const key of ["Shift+Tab", ...Array.from({ length: 18 }, () => "Tab")]) {
    await page.keyboard.press(key);
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
}

test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:54321/__test/reset");
});

for (const directory of [
  { title: "Clientes", path: "/clientes", create: "Nuevo cliente", save: "Guardar cliente", list: "Lista de clientes", table: "Directorio de clientes", columns: 5 },
  { title: "Leads", path: "/leads", create: "Nuevo lead", save: "Crear lead", list: "Leads", table: "Listado de leads", columns: 7 },
] as const) {
  for (const theme of ["Claro", "Oscuro", "Sistema"] as const) {
    test(`${directory.title}: ${theme}, reflow, contenido extenso, contraste y formulario por teclado`, async ({ page }, testInfo) => {
      test.setTimeout(180_000);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (/hydrat|hasn't mounted/i.test(message.text())) errors.push(message.text());
      });
      await mockDirectories(page);
      await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
      await login(page);
      await page.getByRole("button", { name: /^Cambiar tema/ }).click();
      await page.getByRole("menuitemradio", { name: theme, exact: true }).click();
      await page.goto(directory.path);
      await expect(page.getByRole("heading", { name: directory.title, exact: true })).toBeVisible();
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await noOverflow(page);
        if (width < 768) {
          await expect(page.getByRole("list", { name: directory.list, exact: true })).toBeVisible();
          await expect(page.locator("main").getByRole("table")).toHaveCount(0);
        } else {
          const table = page.locator("main").getByRole("table");
          await expect(table).toBeVisible();
          await expect(table.getByRole("columnheader")).toHaveCount(directory.columns);
          await expect(table.locator("th[scope=col]")).toHaveCount(directory.columns);
          await expect(page.getByRole("list", { name: directory.list, exact: true })).toHaveCount(0);
        }
        if (width === 390 || width === 1440) {
          const measured = await assertContrast(page, "main *");
          await testInfo.attach(`contrast-${directory.title}-${theme}-${width}.json`, { body: JSON.stringify(measured, null, 2), contentType: "application/json" });
        }
        await page.screenshot({ path: testInfo.outputPath(`${directory.title}-${theme}-${width}.png`), fullPage: true, animations: "disabled" });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      const targets = await page.locator("main button, main input, main select, main a").evaluateAll((elements) => elements.map((element) => ({
        label: element.getAttribute("aria-label") ?? element.textContent?.trim(),
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
      })).filter((element) => element.width > 0 && element.height > 0));
      expect(targets.filter((element) => element.width < 44 || element.height < 44), JSON.stringify(targets)).toEqual([]);
      const create = page.getByRole("button", { name: directory.create, exact: true });
      await create.focus();
      expect(await create.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog", { name: directory.create, exact: true });
      await expect(dialog).toBeVisible();
      await focusStaysInDialog(page, dialog);
      await dialog.getByRole("button", { name: directory.save, exact: true }).click();
      if (directory.title === "Clientes") {
        await expect(dialog.getByRole("alert").filter({ hasText: "Revisa los campos indicados antes de guardar." })).toBeVisible();
      } else {
        await expect(dialog.getByRole("alert")).toBeVisible();
      }
      const dialogContrast = await assertContrast(page, '[role="dialog"] *');
      await testInfo.attach(`contrast-${directory.title}-${theme}-dialog.json`, { body: JSON.stringify(dialogContrast, null, 2), contentType: "application/json" });
      await noOverflow(page);
      await page.screenshot({ path: testInfo.outputPath(`${directory.title}-${theme}-validation.png`), animations: "disabled" });
      await page.setViewportSize({ width: 390, height: 400 });
      await expect(dialog).toBeInViewport({ ratio: 1 });
      const bounds = await dialog.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(400);
      await dialog.getByLabel("Notas", { exact: true }).focus();
      await expect(dialog.getByLabel("Notas", { exact: true })).toBeInViewport({ ratio: 1 });
      await dialog.getByRole("button", { name: directory.save, exact: true }).focus();
      await expect(dialog.getByRole("button", { name: directory.save, exact: true })).toBeInViewport({ ratio: 1 });
      await noOverflow(page);
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(create).toBeFocused();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.addStyleTag({ content: "html { font-size: 200%; }" });
      await noOverflow(page);
      await expect(page.getByRole("list", { name: directory.list, exact: true })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`${directory.title}-${theme}-text-200.png`), fullPage: true, animations: "disabled" });
      await create.click();
      await expect(dialog).toBeVisible();
      await noOverflow(page);
      await dialog.getByRole("button", { name: directory.save, exact: true }).focus();
      await expect(dialog.getByRole("button", { name: directory.save, exact: true })).toBeInViewport({ ratio: 1 });
      await page.screenshot({ path: testInfo.outputPath(`${directory.title}-${theme}-form-text-200.png`), animations: "disabled" });
      await page.keyboard.press("Escape");
      await expect(create).toBeFocused();
      await page.addStyleTag({ content: "html { font-size: 100%; }" });
      if (theme === "Sistema") {
        await page.emulateMedia({ colorScheme: "dark" });
        await expect(page.locator("html")).toHaveClass(/dark/);
        await expect(page.getByRole("button", { name: "Cambiar tema: Sistema" })).toBeVisible();
        const systemDarkContrast = await assertContrast(page, "main *");
        await testInfo.attach(`contrast-${directory.title}-Sistema-dark.json`, { body: JSON.stringify(systemDarkContrast, null, 2), contentType: "application/json" });
        await noOverflow(page);
        await page.screenshot({ path: testInfo.outputPath(`${directory.title}-Sistema-dark.png`), fullPage: true, animations: "disabled" });
        await page.emulateMedia({ colorScheme: "light" });
        await expect(page.locator("html")).toHaveClass(/light/);
      }
      expect(errors).toEqual([]);
    });
  }
}

test("clientes: filtros independientes, menú, cancelación y enlaces existentes", async ({ page }) => {
  const db = await mockDirectories(page);
  await login(page);
  await page.goto("/clientes");
  await page.getByLabel("Buscar clientes", { exact: true }).fill("empresa uno");
  await page.getByLabel("Filtrar por estado", { exact: true }).selectOption("Activo");
  await page.getByLabel("Filtrar por responsable", { exact: true }).selectOption("Ana García");
  await page.getByRole("button", { name: "Quitar filtro: Estado: Activo", exact: true }).click();
  await expect(page.getByLabel("Filtrar por estado", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Buscar clientes", { exact: true })).toHaveValue("empresa uno");
  await expect(page.getByLabel("Filtrar por responsable", { exact: true })).toHaveValue("Ana García");
  await page.getByLabel("Filtrar por estado", { exact: true }).selectOption("Activo");
  await page.getByRole("button", { name: "Quitar filtro: Responsable: Ana García", exact: true }).click();
  await expect(page.getByLabel("Filtrar por responsable", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Filtrar por estado", { exact: true })).toHaveValue("Activo");
  await expect(page.getByLabel("Buscar clientes", { exact: true })).toHaveValue("empresa uno");
  await page.getByLabel("Filtrar por responsable", { exact: true }).selectOption("Ana García");
  await page.getByRole("button", { name: "Quitar filtro: Búsqueda: empresa uno", exact: true }).click();
  await expect(page.getByLabel("Buscar clientes", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Filtrar por estado", { exact: true })).toHaveValue("Activo");
  await expect(page.getByLabel("Filtrar por responsable", { exact: true })).toHaveValue("Ana García");
  await page.getByRole("button", { name: "Limpiar filtros", exact: true }).click();
  await expect(page.getByLabel("Buscar clientes", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Filtrar por estado", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Filtrar por responsable", { exact: true })).toHaveValue("");
  const trigger = await menuAction(page, "Ana García", "Editar a Ana García");
  await expect(page.getByRole("dialog", { name: "Editar cliente", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await menuAction(page, "Ana García", "Eliminar a Ana García");
  await expect(page.getByRole("alertdialog", { name: "Eliminar cliente", exact: true })).toBeVisible();
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("row").filter({ hasText: "Ana García" })).toBeVisible();
  await trigger.click();
  await expect(page.getByRole("menuitem", { name: "Nueva oportunidad para Ana García", exact: true })).toHaveAttribute("href", `/oportunidades?nueva=1&cliente=${clientId}`);
  await expect(page.getByRole("menuitem", { name: "Nueva tarea: Ana García", exact: true })).toHaveAttribute("href", `/tareas?nueva=1&relacion=Cliente&registro=${clientId}`);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  const longClient = clients[2];
  const longTrigger = await menuAction(page, `${longClient.nombres} ${longClient.apellidos}`, `Editar a ${longClient.nombres} ${longClient.apellidos}`);
  const longDialog = page.getByRole("dialog", { name: "Editar cliente", exact: true });
  await expect(longDialog.getByRole("textbox", { name: "Nombres", exact: true })).toHaveValue(longClient.nombres);
  await expect(longDialog.getByRole("textbox", { name: "Apellidos", exact: true })).toHaveValue(longClient.apellidos);
  await expect(longDialog.getByRole("textbox", { name: "Correo electrónico", exact: true })).toHaveValue(longEmail);
  await expect(longDialog.getByLabel("Notas", { exact: true })).toHaveValue(longClient.notas);
  await noOverflow(page);
  await page.keyboard.press("Escape");
  await expect(longTrigger).toBeFocused();
  expect(db.mutations).toEqual([]);
});

test("leads: filtros independientes, detalle, conversión segura y acciones móviles", async ({ page }) => {
  const db = await mockDirectories(page);
  await login(page);
  await page.goto("/leads");
  await page.getByLabel("Buscar leads", { exact: true }).fill("elena");
  await page.getByLabel("Filtrar por estado", { exact: true }).selectOption("Nuevo");
  await page.getByLabel("Filtrar por prioridad", { exact: true }).selectOption("Alta");
  await page.getByLabel("Filtrar por fuente", { exact: true }).selectOption("Web");
  await page.getByLabel("Filtrar por responsable", { exact: true }).selectOption(ownerId);
  await page.getByRole("button", { name: "Quitar filtro: Prioridad: Alta", exact: true }).click();
  await expect(page.getByLabel("Filtrar por prioridad", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Filtrar por estado", { exact: true })).toHaveValue("Nuevo");
  await expect(page.getByLabel("Filtrar por fuente", { exact: true })).toHaveValue("Web");
  await expect(page.getByLabel("Filtrar por responsable", { exact: true })).toHaveValue(ownerId);
  await page.getByLabel("Filtrar por prioridad", { exact: true }).selectOption("Alta");
  for (const filter of [
    { label: "Estado", value: "Nuevo" },
    { label: "Fuente", value: "Web" },
    { label: "Responsable", value: ownerId, display: "Carlos Prueba" },
  ]) {
    await page.getByRole("button", { name: `Quitar filtro: ${filter.label}: ${"display" in filter ? filter.display : filter.value}`, exact: true }).click();
    await expect(page.getByLabel(`Filtrar por ${filter.label.toLowerCase()}`, { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Buscar leads", { exact: true })).toHaveValue("elena");
    await expect(page.getByLabel("Filtrar por prioridad", { exact: true })).toHaveValue("Alta");
    for (const untouched of ["estado", "fuente", "responsable"].filter((label) => label !== filter.label.toLowerCase())) {
      await expect(page.getByLabel(`Filtrar por ${untouched}`, { exact: true })).toHaveValue(untouched === "estado" ? "Nuevo" : untouched === "fuente" ? "Web" : ownerId);
    }
    await page.getByLabel(`Filtrar por ${filter.label.toLowerCase()}`, { exact: true }).selectOption(filter.value);
  }
  await page.getByRole("button", { name: "Quitar filtro: Búsqueda: elena", exact: true }).click();
  await expect(page.getByLabel("Buscar leads", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Filtrar por prioridad", { exact: true })).toHaveValue("Alta");
  await page.getByRole("button", { name: "Limpiar filtros", exact: true }).click();
  for (const filter of ["estado", "prioridad", "fuente", "responsable"]) await expect(page.getByLabel(`Filtrar por ${filter}`, { exact: true })).toHaveValue("");
  await page.setViewportSize({ width: 390, height: 844 });
  const trigger = await menuAction(page, "Elena Ríos", "Ver detalle: Elena Ríos");
  await expect(page.getByRole("dialog", { name: "Elena Ríos", exact: true })).toContainText("Información comercial de prueba");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await menuAction(page, "Elena Ríos", "Editar lead: Elena Ríos");
  await expect(page.getByRole("dialog", { name: "Editar lead", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await menuAction(page, "Elena Ríos", "Convertir a cliente: Elena Ríos");
  await expect(page.getByRole("dialog", { name: "Convertir a cliente", exact: true })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(trigger).toBeFocused();
  await menuAction(page, "Elena Ríos", "Eliminar lead: Elena Ríos");
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(page.getByRole("menuitem", { name: "Nueva tarea: Elena Ríos", exact: true })).toHaveAttribute("href", `/tareas?nueva=1&relacion=Lead&registro=${leadId}`);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Acciones de María Vinculada", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "Convertir a cliente: María Vinculada", exact: true })).toHaveCount(0);
  await page.getByRole("menuitem", { name: "Ver detalle: María Vinculada", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Ver cliente vinculado", exact: true })).toHaveAttribute("href", `/clientes?buscar=${linkedClientId}`);
  await expect(page.getByRole("dialog").getByRole("link", { name: "Nueva oportunidad", exact: true })).toHaveAttribute("href", `/oportunidades?nueva=1&cliente=${linkedClientId}&lead=${leads[3].id}`);
  await page.keyboard.press("Escape");
  const longLead = leads[2];
  const longLeadName = `${longLead.nombres} ${longLead.apellidos}`;
  const longTrigger = await menuAction(page, longLeadName, `Ver detalle: ${longLeadName}`);
  const detail = page.getByRole("dialog", { name: longLeadName, exact: true });
  await expect(detail).toContainText(longEmail);
  await expect(detail).toContainText(longCompany);
  await noOverflow(page);
  await page.keyboard.press("Escape");
  await expect(longTrigger).toBeFocused();
  await menuAction(page, longLeadName, `Editar lead: ${longLeadName}`);
  const longDialog = page.getByRole("dialog", { name: "Editar lead", exact: true });
  await expect(longDialog.getByLabel("Nombres *", { exact: true })).toHaveValue(longName);
  await expect(longDialog.getByLabel("Notas", { exact: true })).toHaveValue(longLead.notas!);
  await noOverflow(page);
  await page.keyboard.press("Escape");
  await expect(longTrigger).toBeFocused();
  expect(db.mutations).toEqual([]);
});

for (const directory of [
  { path: "/clientes", data: "clients", loading: "Cargando clientes...", empty: "Tu cartera todavía está vacía", create: "Nuevo cliente" },
  { path: "/leads", data: "leads", loading: "Cargando leads...", empty: "Todavía no hay leads", create: "Nuevo lead" },
] as const) {
  for (const theme of ["Claro", "Oscuro", "Sistema"] as const) {
  test(`${directory.data}: ${theme}, carga, error, reintento y vacío sin datos provisionales`, async ({ page }, testInfo) => {
    const db = await mockDirectories(page);
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let unavailable = true;
    await page.route(`${api}/${directory.data === "clients" ? "clientes" : "leads"}**`, async (route) => {
      await pending;
      await route.fulfill(unavailable ? { status: 503, json: { message: "Servicio no disponible" } } : { json: db.data[directory.data] });
    });
    await login(page);
    await page.getByRole("button", { name: /^Cambiar tema/ }).click();
    await page.getByRole("menuitemradio", { name: theme, exact: true }).click();
    await page.goto(directory.path);
    await expect(page.locator("main").getByRole("status").filter({ hasText: directory.loading })).toBeVisible();
    await expect(page.getByRole("heading", { name: directory.empty, exact: true })).toHaveCount(0);
    await expect(page.locator("main").getByRole("table")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`${directory.data}-${theme}-loading.png`), fullPage: true, animations: "disabled" });
    await page.setViewportSize({ width: 320, height: 844 });
    await noOverflow(page);
    const loadingContrast = await assertContrast(page, "main *");
    await testInfo.attach(`contrast-${directory.data}-${theme}-loading.json`, { body: JSON.stringify(loadingContrast, null, 2), contentType: "application/json" });
    release();
    await expect(page.locator("main").getByRole("alert")).toBeVisible();
    await noOverflow(page);
    const errorContrast = await assertContrast(page, "main *");
    await testInfo.attach(`contrast-${directory.data}-${theme}-error.json`, { body: JSON.stringify(errorContrast, null, 2), contentType: "application/json" });
    await page.screenshot({ path: testInfo.outputPath(`${directory.data}-${theme}-error.png`), fullPage: true, animations: "disabled" });
    unavailable = false;
    await page.getByRole("button", { name: "Reintentar", exact: true }).click();
    await expect(page.locator("main").getByRole("list", { name: directory.data === "clients" ? "Lista de clientes" : "Leads", exact: true })).toBeVisible();
    await noOverflow(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator("main").getByRole("table")).toBeVisible();
    db.data[directory.data] = [];
    await page.reload();
    await expect(page.getByRole("heading", { name: directory.empty, exact: true })).toBeVisible();
    await page.setViewportSize({ width: 320, height: 844 });
    await noOverflow(page);
    const emptyContrast = await assertContrast(page, "main *");
    await testInfo.attach(`contrast-${directory.data}-${theme}-empty.json`, { body: JSON.stringify(emptyContrast, null, 2), contentType: "application/json" });
    await page.screenshot({ path: testInfo.outputPath(`${directory.data}-${theme}-empty.png`), fullPage: true, animations: "disabled" });
    await page.getByRole("button", { name: directory.create, exact: true }).first().click();
    await expect(page.getByRole("dialog", { name: directory.create, exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
  });
  }
}
