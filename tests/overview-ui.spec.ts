import { expect, test, type Page } from "@playwright/test";
import { login } from "./support/login";

const clients = Array.from({ length: 8 }, (_, index) => {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - index % 6);
  return {
    id: `11111111-1111-4111-8111-${String(index + 1).padStart(12, "0")}`,
    nombres: `Contacto ${index + 1}`, apellidos: "Prueba", empresa: "Empresa de prueba",
    correo: `contacto${index}@example.test`, telefono: "999123456", cargo: "",
    estado: ["Activo", "Prospecto", "Inactivo"][index % 3], direccion: "", notas: "",
    responsable: "Responsable de prueba", ultimo_contacto: null,
    created_at: date.toISOString(), updated_at: date.toISOString(),
  };
});

async function mockTasks(page: Page) {
  await page.route("http://127.0.0.1:54321/rest/v1/tareas**", (route) => route.fulfill({ json: [] }));
}

async function noOverflow(page: Page) {
  const layout = await page.evaluate(() => ({
    viewport: innerWidth, width: document.documentElement.scrollWidth,
    offenders: Array.from(document.querySelectorAll("body *")).filter((element) => element.getBoundingClientRect().right > innerWidth + 1).map((element) => `${element.tagName}.${element.className}`).slice(0, 10),
  }));
  expect(layout.width, JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewport);
}

test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:54321/__test/reset");
});

test("resumen con datos, filtros, edición y navegación por teclado", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockTasks(page);
  await page.route("http://127.0.0.1:54321/rest/v1/clientes**", (route) => route.fulfill({ json: clients }));
  await login(page);
  const metrics = page.getByRole("region", { name: "Indicadores de clientes" });
  await expect(metrics.getByRole("link", { name: /Clientes totales/ })).toContainText("8");
  await expect(page.getByText("Responsable de prueba", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("overview-desktop.png"), fullPage: true });
  await noOverflow(page);
  await page.getByRole("button", { name: "Editar a Contacto 1 Prueba" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Editar a Contacto 1 Prueba" })).toBeFocused();
  const create = page.getByRole("button", { name: "Nuevo cliente", exact: true });
  await create.focus();
  expect(await create.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Nuevo cliente" })).toBeVisible();
  await page.keyboard.press("Escape");
  for (const label of ["Calendario", "Reportes"]) {
    await page.getByRole("button", { name: `${label} Pronto` }).click();
    await expect(page.getByRole("dialog", { name: label })).toBeVisible();
    await page.keyboard.press("Escape");
  }
  await page.getByRole("button", { name: "Ayuda", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gestiona tus relaciones comerciales" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Notificaciones", exact: true }).click();
  await page.getByRole("button", { name: "Marcar como leída" }).click();
  await expect(page.getByRole("button", { name: "Todas leídas" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await metrics.getByRole("link", { name: /Clientes activos/ }).click();
  await expect(page).toHaveURL(/\/clientes\?estado=Activo$/);
  await page.getByRole("link", { name: "Resumen", exact: true }).click();
  await page.getByLabel("Buscar en Nexo").fill("Empresa de prueba");
  await page.getByRole("button", { name: "Ejecutar búsqueda" }).click();
  await expect(page).toHaveURL(/\/clientes\?buscar=Empresa%20de%20prueba$/);
  for (const [label, path] of [["Leads", "/leads"], ["Oportunidades", "/oportunidades"], ["Ventas", "/ventas"], ["Tareas", "/tareas"], ["Usuarios", "/configuracion/usuarios"], ["Configuración", "/configuracion"]]) {
    await page.getByRole("link", { name: label, exact: true }).first().click();
    await expect(page).toHaveURL(`http://127.0.0.1:3100${path}`, { timeout: 45_000 });
    await expect(page.getByRole("link", { name: label, exact: true }).first()).toHaveAttribute("aria-current", "page");
  }
  expect(errors).toEqual([]);
});

test("reflow de móvil a escritorio y texto al 200%", async ({ page }, testInfo) => {
  await mockTasks(page);
  await page.route("http://127.0.0.1:54321/rest/v1/clientes**", (route) => route.fulfill({ json: clients }));
  await login(page);
  await expect(page.getByRole("heading", { name: "Crecimiento de tu cartera" })).toBeVisible();
  for (const width of [320, 390, 640, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await noOverflow(page);
    if ([390, 768, 1440].includes(width)) await page.screenshot({ path: testInfo.outputPath(`overview-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Abrir navegación" }).click();
  const drawer = page.getByRole("dialog", { name: "Navegación de Nexo CRM" });
  await drawer.getByRole("link", { name: "Clientes", exact: true }).click();
  await expect(drawer).toBeHidden();
  await page.getByRole("button", { name: "Abrir navegación" }).click();
  await drawer.getByRole("link", { name: "Resumen", exact: true }).click();
  await page.getByRole("button", { name: "Nuevo cliente", exact: true }).click();
  await noOverflow(page);
  await page.getByLabel("Notas", { exact: true }).focus();
  await expect(page.getByLabel("Notas", { exact: true })).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  await noOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("overview-text-200.png"), fullPage: true });
});

test("carga y error no muestran cifras ni vacío; reintento recupera datos", async ({ page }) => {
  await mockTasks(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let unavailable = true;
  await page.route("http://127.0.0.1:54321/rest/v1/clientes**", async (route) => {
    await pending;
    await route.fulfill(unavailable ? { status: 503, json: { message: "Servicio no disponible" } } : { json: clients });
  });
  await login(page);
  await expect(page.getByRole("status").filter({ hasText: "Cargando clientes..." })).toBeVisible();
  await expect(page.getByRole("region", { name: "Indicadores de clientes" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Cartera vacía" })).toHaveCount(0);
  release();
  await expect(page.locator("main").getByRole("alert")).toContainText("No se pudo cargar tu cartera");
  await expect(page.getByRole("region", { name: "Indicadores de clientes" })).toHaveCount(0);
  unavailable = false;
  await page.getByRole("button", { name: "Reintentar clientes" }).click();
  await expect(page.getByRole("region", { name: "Indicadores de clientes" })).toBeVisible();
});

test("cartera vacía con acción y recuperación del seguimiento", async ({ page }, testInfo) => {
  let unavailable = true;
  await page.route("http://127.0.0.1:54321/rest/v1/tareas**", (route) => route.fulfill(unavailable ? { status: 503, json: { message: "Offline" } } : { json: [] }));
  await login(page);
  await expect(page.getByRole("region", { name: "Cartera vacía" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Clientes por responsable" })).toHaveCount(0);
  await page.getByRole("button", { name: "Registrar primer cliente" }).click();
  await expect(page.getByRole("dialog", { name: "Nuevo cliente" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "Seguimiento comercial" }).getByRole("alert")).toBeVisible();
  unavailable = false;
  await page.getByRole("button", { name: "Reintentar tareas" }).click();
  await expect(page.getByText(/No hay seguimientos abiertos/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("overview-empty.png"), fullPage: true });
});
