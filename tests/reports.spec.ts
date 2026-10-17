import { expect, test, type Page } from "@playwright/test";
import { login } from "./support/login";
import { calendarDateKey, reportMetrics, periodBounds } from "../src/features/reports/metrics";
import type { ReportData } from "../src/features/reports/metrics";

const created = "2026-10-10T16:00:00Z";
const client = { id: "c1", nombres: "Ana", apellidos: "García", empresa: "Nexo", correo: "ana@example.test", telefono: "999", cargo: "", estado: "Activo", direccion: "", notas: "", responsable: "Carlos", ultimo_contacto: null, created_at: created, updated_at: created };
const lead = { id: "l1", nombres: "Luis", apellidos: "Paz", empresa: "", correo: "luis@example.test", telefono: "", cargo: "", fuente: "Web", estado: "Convertido", prioridad: "Alta", responsable_id: null, notas: "", ultimo_contacto: null, proximo_seguimiento: null, convertido_cliente_id: "c1", created_at: created, updated_at: created };
const opportunity = { id: "o1", titulo: "Contrato", cliente_id: "c1", lead_id: null, responsable_id: null, etapa: "Negociación", valor: "1000.00", probabilidad: 75, fecha_cierre_estimada: "2026-10-30", descripcion: "", origen: "Web", cerrada_at: null, created_at: created, updated_at: created };
const paid = { id: "s1", numero: "V-1", cliente_id: "c1", oportunidad_id: "o1", responsable_id: null, estado: "Pagada", moneda: "PEN", subtotal: "100.00", descuento: "0.00", impuesto: "18.00", total: "118.00", aplica_igv: true, fecha_venta: "2026-10-10", fecha_pago: "2026-10-11", metodo_pago: "Yape", referencia_pago: "", observaciones: "", motivo_cancelacion: "", cancelada_at: null, cancelada_por: null, emitida_at: created, created_at: created, updated_at: created };
const task = { id: "t1", request_id: "r1", titulo: "Seguimiento", descripcion: "", tipo: "Seguimiento", estado: "Pendiente", prioridad: "Alta", responsable_id: "u1", cliente_id: "c1", lead_id: null, oportunidad_id: null, venta_id: null, fecha_inicio: null, fecha_vencimiento: "2026-10-14", recordatorio_at: null, completada_at: null, actividad_at: null, created_by: "u1", created_at: created, updated_at: created };

async function mockReports(page: Page) {
  await page.route("**/rest/v1/clientes**", (route) => route.fulfill({ json: [client] }));
  await page.route("**/rest/v1/leads**", (route) => route.fulfill({ json: [lead] }));
  await page.route("**/rest/v1/oportunidades**", (route) => route.fulfill({ json: [opportunity] }));
  await page.route("**/rest/v1/ventas**", (route) => route.fulfill({ json: [paid] }));
  await page.route("**/rest/v1/tareas**", (route) => route.fulfill({ json: [task] }));
}

test.beforeEach(async ({ request }) => { await request.post("http://127.0.0.1:54321/__test/reset"); });

test("reportes usa datos autorizados, distingue cobros y exporta CSV", async ({ page }) => {
  await mockReports(page); await login(page); await page.goto("/reportes");
  await expect(page.getByRole("heading", { name: "Reportes", exact: true })).toBeVisible();
  await expect(page.getByText("S/ 118.00", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("S/ 750.00", { exact: true })).toBeVisible();
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Exportar CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/^nexo-reporte-.*\.csv$/);
  await page.getByLabel("Período").selectOption("previous");
  await expect(page.getByText("Mes anterior:")).toBeVisible();
});

test("reportes responde en móvil, tema oscuro y teclado", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 }); await page.emulateMedia({ reducedMotion: "reduce" }); await mockReports(page); await login(page); await page.goto("/reportes");
  await page.getByRole("button", { name: /^Cambiar tema/ }).click(); await page.getByRole("menuitemradio", { name: "Oscuro" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const period = page.getByLabel("Período"); await period.focus(); await expect(period).toBeFocused();
});

test("cálculos monetarios, porcentajes implícitos y límites Lima", () => {
  const data = { clients: [{ id: "c1", name: "Ana", firstName: "Ana", lastName: "", company: "", email: "", phone: "", status: "Activo", owner: "Carlos", position: "", address: "", notes: "", lastContact: null, createdAt: created, updatedAt: created }], leads: [lead], opportunities: [opportunity], sales: [paid, { ...paid, id: "s2", estado: "Pendiente", total: "50.01", fecha_pago: null }], tasks: [task] } as unknown as ReportData;
  const result = reportMetrics(data, "month", new Date("2026-10-15T04:30:00Z"));
  expect(result.sales.paid).toBe(BigInt(11800)); expect(result.sales.pending).toBe(BigInt(5001)); expect(result.opportunities.weighted).toBe(BigInt(75000));
  expect(periodBounds("previous", new Date("2026-01-15T12:00:00-05:00"))).toMatchObject({ start: "2025-12-01", end: "2025-12-31" });
});

test("fechas date conservan el calendario y timestamptz respeta Lima", () => {
  expect(calendarDateKey("2026-10-01")).toBe("2026-10-01");
  expect(calendarDateKey("2024-02-29")).toBe("2024-02-29");
  expect(calendarDateKey("2025-02-29")).toBeNull();
  expect(periodBounds("month", new Date("2026-10-01T05:00:00Z"))).toMatchObject({ start: "2026-10-01", end: "2026-10-31" });
  expect(periodBounds("month", new Date("2026-10-01T00:00:00Z"))).toMatchObject({ start: "2026-09-01", end: "2026-09-30" });
  expect(periodBounds("year", new Date("2027-01-01T05:00:00Z"))).toMatchObject({ start: "2027-01-01", end: "2027-01-31" });

  const octoberDateSale = { ...paid, fecha_venta: "2026-10-01", fecha_pago: "2026-10-31" };
  const decemberDateSale = { ...paid, id: "s-dec", fecha_venta: "2026-12-31", fecha_pago: "2027-01-01" };
  const timestampClient = { id: "c-ts", name: "UTC", firstName: "UTC", lastName: "", company: "", email: "", phone: "", status: "Activo", owner: "", position: "", address: "", notes: "", lastContact: null, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" };
  const data = { clients: [timestampClient], leads: [], opportunities: [], sales: [octoberDateSale, decemberDateSale], tasks: [] } as unknown as ReportData;
  const october = reportMetrics(data, "month", new Date("2026-10-15T17:00:00Z"));
  expect(october.sales.total).toBe(1);
  expect(october.sales.paid).toBe(BigInt(11800));
  expect(october.clients.new).toBe(0);
  const january = reportMetrics(data, "month", new Date("2027-01-15T17:00:00Z"));
  expect(january.sales.total).toBe(0);
  expect(january.sales.paid).toBe(BigInt(11800));
});

test("CSV refleja exactamente el período seleccionado", async ({ page }) => {
  await mockReports(page); await login(page); await page.goto("/reportes");
  await page.getByLabel("Período").selectOption("previous");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^nexo-reporte-\d{4}-\d{2}-01-\d{4}-\d{2}-\d{2}\.csv$/);
});

for (const theme of ["Claro", "Oscuro", "Sistema"] as const) {
  test(`Reportes: ${theme}, semántica, contraste, reflow, zoom y teclado`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await mockReports(page);
    await login(page);
    await page.goto("/reportes");
    await page.getByRole("button", { name: /^Cambiar tema/ }).click();
    await page.getByRole("menuitemradio", { name: theme, exact: true }).click();
    await expect(page.locator("html")).toHaveClass(theme === "Oscuro" ? /dark/ : /light/);
    for (const name of ["Leads por estado", "Oportunidades por etapa"]) {
      const region = page.getByRole("region", { name, exact: true });
      await expect(region).toBeVisible();
      await expect(region.getByRole("table", { name, exact: true })).toBeAttached();
    }
    const contrast = await page.locator("main").evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      const luminance = (token: string) => {
        const color = style.getPropertyValue(token).trim();
        const channels = color.slice(1).match(/.{2}/g)!.map((hex) => {
          const value = parseInt(hex, 16) / 255;
          return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
        });
        return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
      };
      const pairs: { pair: string; ratio: number; minimum: number }[] = [];
      for (const background of ["--card", "--secondary", "--background", "--muted"]) {
        for (const [foreground, minimum] of [["--foreground", 4.5], ["--muted-foreground", 4.5], ["--chart-blue", 3], ["--input", 3], ["--focus", 3]] as const) {
          const a = luminance(foreground), b = luminance(background);
          pairs.push({ pair: `${foreground}/${background}`, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), minimum });
        }
      }
      return pairs;
    });
    expect(contrast.filter((pair) => pair.ratio < pair.minimum), JSON.stringify(contrast)).toEqual([]);
    await testInfo.attach(`reports-${theme}-contrast.json`, { body: JSON.stringify(contrast, null, 2), contentType: "application/json" });
    const filter = page.getByLabel("Período");
    await filter.focus();
    await expect(filter).toBeFocused();
    expect(await filter.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Exportar CSV" })).toBeFocused();
    for (const width of [320, 390, 640, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 390) {
        const controls = await page.locator("main select, main button").evaluateAll((elements) => elements.map((element) => ({ label: element.textContent?.trim(), width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })));
        expect(controls.filter((control) => control.width < 44 || control.height < 44)).toEqual([]);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addStyleTag({ content: "html { font-size: 200%; }" });
    await expect.poll(async () => {
      const layout = await page.evaluate(() => ({
        viewport: innerWidth,
        width: document.documentElement.scrollWidth,
        offenders: Array.from(document.querySelectorAll("main *")).filter((element) => element.checkVisibility() && element.getBoundingClientRect().right > innerWidth + 1).map((element) => ({
          tag: element.tagName, text: element.textContent?.slice(0, 60), classes: element.className,
          right: element.getBoundingClientRect().right, width: element.getBoundingClientRect().width,
          minWidth: getComputedStyle(element).minWidth, columns: getComputedStyle(element).gridTemplateColumns,
        })).slice(0, 20),
      }));
      return layout.width <= layout.viewport ? "ok" : JSON.stringify(layout);
    }).toBe("ok");
    const clipped = await page.locator("main span, main strong, main small, main h1, main h2, main p").evaluateAll((elements) => elements.filter((element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.width > 2 && bounds.height > 2 && !element.closest('.sr-only,[aria-hidden="true"]') && element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 1;
    }).map((element) => ({ text: element.textContent, width: element.clientWidth, scrollWidth: element.scrollWidth })));
    expect(clipped).toEqual([]);
    await expect(filter).toBeVisible();
    await page.addStyleTag({ content: "html { font-size: 100%; }" });
    const motion = await page.locator("main").evaluate((element) => Array.from(element.querySelectorAll("*")).filter((child) => {
      const style = getComputedStyle(child);
      return style.animationDuration.split(",").some((duration) => parseFloat(duration) > .001) || style.transitionDuration.split(",").some((duration) => parseFloat(duration) > .001);
    }).map((child) => child.tagName));
    expect(motion).toEqual([]);
    if (theme === "Sistema") {
      await page.emulateMedia({ colorScheme: "dark" });
      await expect(page.locator("html")).toHaveClass(/dark/);
      await expect(page.getByRole("button", { name: "Cambiar tema: Sistema" })).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}

test("Reportes anuncia carga, vacío y error recuperable", async ({ page }) => {
  await mockReports(page);
  await login(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let fail = true;
  await page.route("**/rest/v1/ventas**", async (route) => {
    await pending;
    return fail ? route.fulfill({ status: 503, json: { message: "Servicio de prueba no disponible" } }) : route.fulfill({ json: [paid] });
  });
  await page.goto("/reportes");
  await expect(page.getByRole("status").filter({ hasText: "Cargando datos" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Resumen ejecutivo" })).toHaveCount(0);
  release();
  await expect(page.locator("main").getByRole("alert")).toContainText("No se pudo cargar ventas");
  fail = false;
  const retry = page.getByRole("button", { name: "Reintentar", exact: true });
  await retry.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Resumen ejecutivo" })).toBeVisible();
  for (const name of ["clientes", "leads", "oportunidades", "ventas", "tareas"]) await page.route(`**/rest/v1/${name}**`, (route) => route.fulfill({ json: [] }));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sin datos disponibles" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Exportar CSV" })).toBeDisabled();
});
