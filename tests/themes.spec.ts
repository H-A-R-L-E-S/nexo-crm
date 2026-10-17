import { expect, test, type Page } from "@playwright/test";
import { login } from "./support/login";

const client = {
  id: "11111111-1111-4111-8111-111111111111", nombres: "Contacto", apellidos: "Prueba",
  empresa: "Empresa de prueba", correo: "contacto@example.test", telefono: "999123456", cargo: "",
  estado: "Activo", direccion: "", notas: "", responsable: "Responsable de prueba", ultimo_contacto: null,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};

async function mockData(page: Page) {
  await page.route("http://127.0.0.1:54321/rest/v1/clientes**", (route) => route.fulfill({ json: [client] }));
  await page.route("http://127.0.0.1:54321/rest/v1/tareas**", (route) => route.fulfill({ json: [] }));
}

async function chooseTheme(page: Page, name: string) {
  await page.getByRole("button", { name: /^Cambiar tema/ }).click();
  await page.getByRole("menuitemradio", { name, exact: true }).click();
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
    const blend = (front: number[], back: number[]): number[] => [0, 1, 2].map((i) => front[i] * front[3] + back[i] * (1 - front[3])).concat(1);
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
      return [{ text, ratio, minimum, fg: style.color, bg: bg.join(",") }];
    });
  });
}

test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:54321/__test/reset");
});

test("tema por teclado, persistencia al recargar, navegar y abrir otro contexto", async ({ page, context, browser }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (/hydrat|hasn't mounted/i.test(message.text())) errors.push(message.text());
  });
  await mockData(page);
  await login(page);
  const switcher = page.getByRole("button", { name: /^Cambiar tema/ });
  await expect(switcher).toBeEnabled();
  await switcher.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("menuitemradio", { name: "Oscuro", exact: true }).focus();
  expect(await page.getByRole("menuitemradio", { name: "Oscuro", exact: true }).evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(switcher).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem("nexo-theme"))).toBe("dark");
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("link", { name: "Clientes", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("link", { name: "Resumen", exact: true }).click();
  const reopened = await browser.newContext({ storageState: await context.storageState(), colorScheme: "light" });
  try {
    const nextPage = await reopened.newPage();
    await mockData(nextPage);
    await nextPage.goto("http://127.0.0.1:3100/");
    await expect(nextPage.getByRole("heading", { name: "Resumen", exact: true })).toBeVisible();
    await expect(nextPage.locator("html")).toHaveClass(/dark/);
    await expect(nextPage.getByRole("button", { name: "Cambiar tema: Oscuro" })).toBeVisible();
  } finally { await reopened.close(); }
  await chooseTheme(page, "Claro");
  await expect(page.locator("html")).toHaveClass(/light/);
  expect(errors).toEqual([]);
});

test("Sistema sigue los cambios del dispositivo y el tema guardado se aplica antes del contenido", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await mockData(page);
  await login(page);
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByRole("button", { name: "Cambiar tema: Sistema" })).toBeVisible();
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveClass(/light/);
  await chooseTheme(page, "Oscuro");
  await page.addInitScript(() => {
    const paints: string[] = [];
    Object.assign(window, { themePaints: paints });
    const sample = () => {
      if (document.querySelector(".crm-shell")) paints.push(document.documentElement.className);
      if (paints.length < 5) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.reload();
  await expect(page.getByRole("button", { name: "Cambiar tema: Oscuro" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as { themePaints: string[] }).themePaints.length)).toBeGreaterThanOrEqual(5);
  expect(await page.evaluate(() => (window as unknown as { themePaints: string[] }).themePaints.every((paint) => paint.includes("dark")))).toBe(true);
  await chooseTheme(page, "Sistema");
  await expect(page.locator("html")).toHaveClass(/light/);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(await page.evaluate(() => localStorage.getItem("nexo-theme"))).toBe("system");
});

test("ambos temas: reflow, contraste de tokens, controles y portales", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await mockData(page);
  await login(page);
  for (const theme of ["Claro", "Oscuro"]) {
    await chooseTheme(page, theme);
    const colors = await textContrast(page, ".crm-shell *");
    expect(colors.filter((pair) => pair.ratio < pair.minimum), JSON.stringify(colors)).toEqual([]);
    await testInfo.attach(`contrast-${theme}.json`, { body: JSON.stringify(colors, null, 2), contentType: "application/json" });
    for (const width of [320, 390, 640, 768, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${theme} ${width}`).toBe(true);
      if ([390, 768, 1440].includes(width)) await page.screenshot({ path: testInfo.outputPath(`overview-${theme}-${width}.png`), fullPage: true, animations: "disabled" });
    }
    const contrast = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      const luminance = (hex: string) => {
        const rgb = hex.trim().replace("#", "").match(/.{2}/g)!.map((value) => {
          const channel = parseInt(value, 16) / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      const ratio = (fg: string, bg: string) => {
        const a = luminance(fg); const b = luminance(bg);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      };
      const color = (token: string) => style.getPropertyValue(token);
      const results: { pair: string; ratio: number; minimum: number }[] = [];
      for (const bg of ["--background", "--sidebar", "--secondary", "--popover", "--muted"]) {
        for (const fg of ["--foreground", "--muted-foreground", "--link"]) results.push({ pair: `${fg}/${bg}`, ratio: ratio(color(fg), color(bg)), minimum: 4.5 });
        for (const fg of ["--input", "--focus"]) results.push({ pair: `${fg}/${bg}`, ratio: ratio(color(fg), color(bg)), minimum: 3 });
      }
      results.push({ pair: "primary", ratio: ratio("#ffffff", color("--primary")), minimum: 4.5 });
      results.push({ pair: "active status", ratio: ratio(color("--status-active"), color("--background")), minimum: 4.5 });
      results.push({ pair: "prospect status", ratio: ratio(color("--status-prospect"), color("--background")), minimum: 4.5 });
      for (const fg of ["--chart-blue", "--chart-neutral", "--chart-dark"]) results.push({ pair: `${fg}/canvas`, ratio: ratio(color(fg), color("--background")), minimum: 3 });
      return results;
    });
    expect(contrast.filter((pair) => pair.ratio < pair.minimum), JSON.stringify(contrast)).toEqual([]);
    await page.getByRole("button", { name: "Nuevo cliente", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Nuevo cliente" })).toBeVisible();
    await page.getByRole("button", { name: "Guardar cliente", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Revisa los campos");
    const dialogColors = await textContrast(page, '[data-slot="dialog-content"] *');
    expect(dialogColors.filter((pair) => pair.ratio < pair.minimum), JSON.stringify(dialogColors)).toEqual([]);
    if (theme === "Oscuro") {
      for (const select of await page.getByRole("dialog").getByRole("combobox").all()) {
        expect(await select.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe("rgb(255, 255, 255)");
      }
    }
    await page.screenshot({ path: testInfo.outputPath(`dialog-${theme}.png`), animations: "disabled" });
    await page.setViewportSize({ width: 390, height: 400 });
    const shortDialog = page.getByRole("dialog", { name: "Nuevo cliente" });
    await expect(shortDialog).toBeInViewport({ ratio: 1 });
    const dialogBounds = await shortDialog.boundingBox();
    expect(dialogBounds).not.toBeNull();
    expect(dialogBounds!.y).toBeGreaterThanOrEqual(0);
    expect(dialogBounds!.y + dialogBounds!.height).toBeLessThanOrEqual(400);
    await page.getByLabel("Notas", { exact: true }).focus();
    await expect(page.getByLabel("Notas", { exact: true })).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`form-short-viewport-${theme}.png`), animations: "disabled" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Notificaciones", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Notificaciones" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 390, height: 844 });
    const controls = await page.locator(".crm-header button, .crm-header input").evaluateAll((elements) => elements.map((element) => ({ label: element.getAttribute("aria-label"), width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })));
    expect(controls.filter((control) => control.width < 44 || control.height < 44)).toEqual([]);
    await page.getByRole("button", { name: "Abrir navegación" }).click();
    await expect(page.getByRole("dialog", { name: "Navegación de Nexo CRM" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`navigation-${theme}.png`), animations: "disabled" });
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-slot="sheet-content"]')).toHaveCount(0);
    await page.addStyleTag({ content: "html { font-size: 200%; }" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`text-200-${theme}.png`), fullPage: true, animations: "disabled" });
    await page.addStyleTag({ content: "html { font-size: 100%; }" });
  }
});

test("oscuro: primitivas heredadas, menú, estados y enlaces del resumen", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await mockData(page);
  for (const resource of ["leads", "oportunidades", "ventas"]) {
    await page.route(`http://127.0.0.1:54321/rest/v1/${resource}**`, (route) => route.fulfill({ json: [] }));
  }
  await login(page);
  await chooseTheme(page, "Oscuro");
  const fonts = await page.locator("h1,h2,body").evaluateAll((elements) => elements.map((element) => ({ element: element.tagName, font: getComputedStyle(element).fontFamily })));
  expect(new Set(fonts.map((font) => font.font)).size).toBe(1);
  await testInfo.attach("fonts.json", { body: JSON.stringify(fonts), contentType: "application/json" });

  for (const path of ["/clientes", "/leads", "/oportunidades", "/ventas", "/tareas", "/calendario", "/reportes", "/configuracion/usuarios", "/configuracion", "/perfil"]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    const whiteSurfaces = await page.locator("main .bg-white").evaluateAll((elements) => elements.filter((element) => getComputedStyle(element).backgroundColor === "rgb(255, 255, 255)").length);
    expect(whiteSurfaces, path).toBe(0);
    await page.screenshot({ path: testInfo.outputPath(`module-${path.replaceAll("/", "-")}.png`), fullPage: true, animations: "disabled" });
  }

  await page.goto("/");
  for (const [label, path] of [["Calendario", "/calendario"], ["Reportes", "/reportes"]]) {
    const link = page.getByRole("link", { name: label, exact: true });
    await expect(link).toHaveAttribute("href", path);
    await link.click();
    await expect(page).toHaveURL(`http://127.0.0.1:3100${path}`);
    await expect(page.getByRole("heading", { name: label, exact: true, level: 1 })).toBeVisible();
    await expect(link).toHaveAttribute("aria-current", "page");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("link", { name: "Resumen", exact: true }).click();
    await expect(page).toHaveURL("http://127.0.0.1:3100/");
    await expect(page.getByRole("heading", { name: "Resumen", exact: true, level: 1 })).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/dark/);
  }
  const help = page.getByRole("button", { name: "Ayuda", exact: true });
  await help.click();
  await expect(page.getByRole("dialog", { name: "Te damos la bienvenida a Nexo" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gestiona tus relaciones comerciales" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-slot="dialog-content"]')).toHaveCount(0);
  for (const label of [/Clientes totales/, /Clientes activos/, /Prospectos/, /Nuevos este mes/]) {
    await page.getByRole("region", { name: "Indicadores de clientes" }).getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(/\/clientes(?:\?.*)?$/);
    await page.goto("/");
  }
  for (const [label, state] of [["Activos", "Activo"], ["Prospectos", "Prospecto"], ["Inactivos", "Inactivo"]]) {
    await page.getByRole("region", { name: "Clientes por estado" }).getByRole("link", { name: new RegExp(label) }).click();
    await expect(page).toHaveURL(new RegExp(`estado=${state}$`));
    await page.goto("/");
  }
  for (const name of [/para hoy/, /vencidas/, "Ver tareas"]) {
    await page.getByRole("region", { name: "Seguimiento comercial" }).getByRole("link", { name }).click();
    await expect(page).toHaveURL(/\/tareas(?:\?.*)?$/);
    await page.goto("/");
  }
  await page.getByRole("link", { name: "Ver todos", exact: true }).click();
  await expect(page).toHaveURL(/\/clientes$/);
  await page.goto("/");
  await page.locator("header").getByRole("button", { name: /^Menú de/ }).click();
  await page.screenshot({ path: testInfo.outputPath("user-menu-dark.png"), animations: "disabled" });
  await page.keyboard.press("Escape");

  await page.unroute("http://127.0.0.1:54321/rest/v1/tareas**");
  await page.route("http://127.0.0.1:54321/rest/v1/tareas**", (route) => route.fulfill({ json: [{
    id: "22222222-2222-4222-8222-222222222222", request_id: "33333333-3333-4333-8333-333333333333", titulo: "Seguimiento de prueba",
    descripcion: "", tipo: "Llamada", estado: "Pendiente", prioridad: "Alta", responsable_id: "00000000-0000-4000-8000-000000000001",
    cliente_id: client.id, lead_id: null, oportunidad_id: null, venta_id: null, fecha_inicio: null, recordatorio_at: null,
    fecha_vencimiento: new Date(Date.now() - 86400000).toISOString(), completada_at: null, actividad_at: null,
    created_by: "00000000-0000-4000-8000-000000000001", created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }] }));
  await page.reload();
  await expect(page.getByRole("region", { name: "Seguimiento comercial" })).toContainText("Seguimiento de prueba");
  await page.screenshot({ path: testInfo.outputPath("followup-data-dark.png"), fullPage: true, animations: "disabled" });
  await page.getByRole("link", { name: "Seguimiento de prueba", exact: true }).click();
  await expect(page).toHaveURL(/\/tareas\/22222222/);

  await page.unroute("http://127.0.0.1:54321/rest/v1/clientes**");
  await page.route("http://127.0.0.1:54321/rest/v1/clientes**", (route) => route.fulfill({ json: [] }));
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Cartera vacía" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("empty-dark.png"), fullPage: true, animations: "disabled" });
  await page.unroute("http://127.0.0.1:54321/rest/v1/clientes**");
  await page.route("http://127.0.0.1:54321/rest/v1/clientes**", (route) => route.fulfill({ status: 503, json: { message: "Servicio de prueba no disponible" } }));
  await page.reload();
  await expect(page.locator("main").getByRole("alert")).toContainText("No se pudo cargar tu cartera");
  await page.screenshot({ path: testInfo.outputPath("error-dark.png"), fullPage: true, animations: "disabled" });
});
