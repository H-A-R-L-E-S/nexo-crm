import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { login } from "./support/login";
import { formatMoney } from "../src/features/opportunities/money";
import { OPPORTUNITY_STAGES, type Opportunity, type OpportunityResponsible } from "../src/features/opportunities/types";

const api = "http://127.0.0.1:54321/rest/v1";
const clientId = "11111111-1111-4111-8111-111111111111";
const longClientId = "11111111-1111-4111-8111-111111111112";
const ownerId = "00000000-0000-4000-8000-000000000001";
const longTitle = "ContratoPrueba".repeat(12);
const longDescription = "Descripción explícita para comprobar contenido extenso.\n".repeat(70).slice(0, 3000);
const people: OpportunityResponsible[] = [
  { id: ownerId, nombres: "Carlos", apellidos: "Prueba", rol: "Administrador", activo: true },
  { id: "00000000-0000-4000-8000-000000000002", nombres: "Responsable".repeat(8), apellidos: "Comercial".repeat(9), rol: "Gerente", activo: true },
];
const clients = [
  { id: clientId, nombres: "Ana", apellidos: "García", empresa: "Empresa de prueba", correo: "ana@example.test", telefono: "999123456", cargo: "Gerente", estado: "Prospecto", direccion: "", notas: "Datos explícitos de prueba visual", responsable: "Carlos Prueba", ultimo_contacto: null, created_at: "2026-09-01T12:00:00Z", updated_at: "2026-09-01T12:00:00Z" },
  { id: longClientId, nombres: "Alejandra".repeat(10), apellidos: "Fernández".repeat(10), empresa: "ConsultoríaComercialInternacional".repeat(3), correo: "extenso@example.test", telefono: "999123457", cargo: "", estado: "Activo", direccion: "", notas: "Datos explícitos de prueba visual", responsable: "Carlos Prueba", ultimo_contacto: null, created_at: "2026-09-01T12:00:00Z", updated_at: "2026-09-01T12:00:00Z" },
];
const fixture: Opportunity = {
  id: "33333333-3333-4333-8333-333333333331", titulo: "Renovación de prueba", cliente_id: clientId, lead_id: null,
  responsable_id: ownerId, etapa: "Nueva", valor: "1200.10", probabilidad: 10, fecha_cierre_estimada: "2026-12-15",
  descripcion: "Información comercial explícita de prueba", origen: "Web", cerrada_at: null,
  created_at: "2026-09-01T12:00:00Z", updated_at: "2026-09-01T12:00:00Z",
};
const visualRows: Opportunity[] = [
  fixture,
  { ...fixture, id: "33333333-3333-4333-8333-333333333332", titulo: longTitle, cliente_id: longClientId, responsable_id: people[1].id, valor: "999999999999.99", descripcion: longDescription, origen: "OrigenComercialPrueba".repeat(5), fecha_cierre_estimada: null },
  ...OPPORTUNITY_STAGES.slice(1).map((stage, index): Opportunity => ({
    ...fixture, id: `33333333-3333-4333-8333-33333333333${index + 3}`, titulo: `Prueba visual ${stage}`, etapa: stage,
    valor: "2345.67", probabilidad: [25, 50, 75, 100, 0][index],
    cerrada_at: stage === "Ganada" || stage === "Perdida" ? "2026-09-10T12:00:00Z" : null,
  })),
];

async function mockOpportunities(page: Page, initial: Opportunity[] = visualRows) {
  const db = { rows: initial.map((row) => ({ ...row })), unavailable: false, mutations: [] as { method: string; input: Partial<Opportunity> }[] };
  await page.route(`${api}/clientes**`, (route) => route.fulfill({ json: clients }));
  await page.route(`${api}/leads**`, (route) => route.fulfill({ json: [] }));
  await page.route(`${api}/tareas**`, (route) => route.fulfill({ json: [] }));
  await page.route(`${api}/rpc/opportunity_responsibles`, (route) => route.fulfill({ json: people }));
  await page.route(`${api}/oportunidades**`, (route) => {
    if (db.unavailable) return route.fulfill({ status: 503, json: { message: "Servicio de prueba no disponible" } });
    const request = route.request();
    const id = new URL(request.url()).searchParams.get("id")?.replace("eq.", "");
    if (request.method() === "GET") return route.fulfill({ json: id ? db.rows.filter((row) => row.id === id) : db.rows });
    const input = request.postDataJSON() as Partial<Opportunity>;
    db.mutations.push({ method: request.method(), input });
    const index = db.rows.findIndex((row) => row.id === id);
    if (request.method() !== "PATCH" || index < 0) return route.fulfill({ status: 400, json: { message: "Escritura no prevista en esta prueba visual" } });
    const item = { ...db.rows[index], ...input, updated_at: "2026-10-09T15:00:00Z" };
    item.cerrada_at = item.etapa === "Ganada" || item.etapa === "Perdida" ? item.updated_at : null;
    db.rows[index] = item;
    return route.fulfill({ json: [item] });
  });
  return db;
}

async function chooseTheme(page: Page, theme: "Claro" | "Oscuro" | "Sistema") {
  await page.getByRole("button", { name: /^Cambiar tema/ }).click();
  await page.getByRole("menuitemradio", { name: theme, exact: true }).click();
  await expect(page.locator("html")).toHaveClass(theme === "Oscuro" ? /dark/ : /light/);
}

async function noOverflow(page: Page) {
  type Measurement = { viewport: number; width: number; rootSize: string; focused?: string; narrowMedia: boolean; offenders: unknown[] };
  let measured: Measurement | undefined;
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect.poll(async () => {
    measured = await page.evaluate(() => ({
      viewport: innerWidth,
      width: document.documentElement.scrollWidth,
      rootSize: getComputedStyle(document.documentElement).fontSize,
      focused: document.activeElement?.outerHTML.slice(0, 350),
      narrowMedia: matchMedia("(max-width: 767px)").matches,
      offenders: Array.from(document.querySelectorAll("body *"))
        .filter((element) => element.checkVisibility() && element.getBoundingClientRect().right > innerWidth + 0.5)
        .map((element) => ({ tag: element.tagName, label: element.getAttribute("aria-label"), classes: element.className, right: element.getBoundingClientRect().right, scrollWidth: element.scrollWidth, width: element.getBoundingClientRect().width })).slice(0, 12),
    }));
    return measured.width <= measured.viewport ? "ok" : JSON.stringify(measured);
  }, { message: "La página conserva desbordamiento horizontal después de estabilizar el layout", timeout: 3_000 }).toBe("ok");
}

async function screenshot(page: Page, info: TestInfo, name: string) {
  const directory = join(process.cwd(), "anti-slop", "opportunities-evidence");
  await mkdir(directory, { recursive: true });
  const path = join(directory, `${name}.png`);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path, fullPage: true, animations: "disabled", style: "nextjs-portal { visibility: hidden; }" });
  await info.attach(`${name}: datos explícitos de prueba`, { path, contentType: "image/png" });
}

async function assertContrast(page: Page, selector: string) {
  const measured = await page.locator(selector).evaluateAll((elements) => {
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
    const contrast = (first: number[], second: number[]) => {
      const a = luminance(first); const b = luminance(second);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };
    return elements.flatMap((element) => {
      const bounds = element.getBoundingClientRect();
      if (bounds.width <= 2 || bounds.height <= 2 || !element.checkVisibility() || element.closest('nextjs-portal,[aria-hidden="true"],[disabled],option')) return [];
      const style = getComputedStyle(element);
      const text = Array.from(element.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent?.trim()).join("").trim();
      const content = element instanceof HTMLSelectElement ? element.selectedOptions[0]?.textContent?.trim()
        : element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement ? element.value.trim() : text;
      const placeholder = !content && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) ? element.placeholder : "";
      const bg = background(element);
      const result: { text: string; kind: string; ratio: number; minimum: number; foreground: string; background: string }[] = [];
      if (content || placeholder) {
        const foreground = placeholder ? getComputedStyle(element, "::placeholder").color : style.color;
        const fg = blend(rgba(foreground), bg);
        const size = parseFloat(style.fontSize);
        const minimum = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700) ? 3 : 4.5;
        result.push({ text: content || placeholder, kind: placeholder ? "placeholder" : element.tagName.toLowerCase(), ratio: contrast(bg, fg), minimum, foreground, background: bg.join(",") });
      }
      if (element.matches("input,select,textarea,button")) {
        const label = element.getAttribute("aria-label") || content || element.id || element.tagName;
        const outer = background(element.parentElement);
        const border = rgba(style.borderTopColor);
        const fillRatio = contrast(bg, outer);
        if (element instanceof HTMLButtonElement && fillRatio >= 3) {
          result.push({ text: label, kind: "control-fill", ratio: fillRatio, minimum: 3, foreground: style.backgroundColor, background: outer.join(",") });
        } else if (parseFloat(style.borderTopWidth) > 0 && style.borderTopStyle !== "none" && border[3] > 0) {
          result.push({ text: label, kind: "control-border", ratio: Math.min(contrast(blend(border, bg), bg), contrast(blend(border, outer), outer)), minimum: 3, foreground: style.borderTopColor, background: `${bg.join(",")} / ${outer.join(",")}` });
        }
        if (element.matches(":focus-visible") && parseFloat(style.outlineWidth) > 0 && style.outlineStyle !== "none") {
          result.push({ text: label, kind: "focus-outline", ratio: contrast(blend(rgba(style.outlineColor), outer), outer), minimum: 3, foreground: style.outlineColor, background: outer.join(",") });
        }
      }
      return result;
    });
  });
  expect(measured.length).toBeGreaterThan(0);
  expect(measured.filter((pair) => pair.ratio < pair.minimum), JSON.stringify(measured.filter((pair) => pair.ratio < pair.minimum))).toEqual([]);
  return measured;
}

async function reducedMotionViolations(page: Page) {
  return page.locator("main *, [role=dialog] *, [role=alertdialog] *").evaluateAll((elements) => elements.flatMap((element) => {
    if (!element.checkVisibility() || element.closest("nextjs-portal")) return [];
    return [null, "::before", "::after"].flatMap((pseudo) => {
      const style = getComputedStyle(element, pseudo);
      if (pseudo && ["none", "normal"].includes(style.content)) return [];
      const duration = [style.animationDuration, style.transitionDuration].flatMap((value) => value.split(",").map(parseFloat));
      const delay = [style.animationDelay, style.transitionDelay].flatMap((value) => value.split(",").map(parseFloat));
      return duration.some((value) => value > .001) || delay.some((value) => value !== 0)
        ? [{ tag: element.tagName, label: element.getAttribute("aria-label"), pseudo, duration, delay }] : [];
    });
  }));
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

for (const theme of ["Claro", "Oscuro", "Sistema"] as const) {
  test(`Oportunidades: ${theme}, pipeline y lista se adaptan con importes y títulos máximos`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (/hydrat|hasn't mounted/i.test(message.text())) errors.push(message.text()); });
    const db = await mockOpportunities(page);
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await login(page);
    await chooseTheme(page, theme);
    await page.goto("/oportunidades");
    await expect(page.getByRole("region", { name: "Resumen comercial", exact: true })).toBeVisible();
    const pipeline = page.getByRole("region", { name: "Pipeline comercial", exact: true });
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(pipeline).toBeVisible();
      await expect(page.getByRole("article", { name: longTitle, exact: true })).toContainText(formatMoney("999999999999.99"));
      await noOverflow(page);
      if (width < 768) {
        const navigation = page.getByRole("group", { name: "Navegar etapas", exact: true });
        await expect(navigation).toBeVisible();
        await expect(navigation.getByRole("button")).toHaveCount(6);
        for (const stage of OPPORTUNITY_STAGES) {
          await expect(navigation.getByRole("button", { name: `Ver etapa ${stage}`, exact: true })).toBeVisible();
          if (stage !== "Nueva") await expect(page.getByRole("region", { name: `Etapa ${stage}`, exact: true })).toBeHidden();
        }
      } else {
        for (const stage of OPPORTUNITY_STAGES) await expect(page.getByRole("region", { name: `Etapa ${stage}`, exact: true })).toBeVisible();
      }
      if (width === 390 || width === 1440) {
        const measured = await assertContrast(page, "main *");
        await testInfo.attach(`contrast-${theme}-pipeline-${width}.json`, { body: JSON.stringify(measured, null, 2), contentType: "application/json" });
      }
      expect(await reducedMotionViolations(page)).toEqual([]);
      await screenshot(page, testInfo, `fixtures-${theme}-pipeline-${width}`);
      await page.getByRole("button", { name: "Lista", exact: true }).click();
      if (width < 1200) {
        await expect(page.locator("main").getByRole("table")).toHaveCount(0);
        await expect(page.getByRole("article", { name: fixture.titulo, exact: true })).toBeVisible();
      } else {
        const table = page.locator("main").getByRole("table");
        await expect(table).toBeVisible();
        await expect(table.getByRole("columnheader")).toHaveCount(8);
      }
      await noOverflow(page);
      if (width === 390 || width === 1440) {
        await assertContrast(page, "main *");
        await screenshot(page, testInfo, `fixtures-${theme}-list-${width}`);
      }
      await page.getByRole("button", { name: "Pipeline", exact: true }).click();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const targets = await page.locator("main button, main input, main select, main a").evaluateAll((elements) => elements.map((element) => ({
      label: element.getAttribute("aria-label") ?? element.textContent?.trim(), width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height,
    })).filter((item) => item.width > 0 && item.height > 0));
    expect(targets.filter((item) => item.width < 44 || item.height < 44), JSON.stringify(targets)).toEqual([]);
    await page.addStyleTag({ content: "html { font-size: 200%; }" });
    await noOverflow(page);
    await screenshot(page, testInfo, `fixtures-${theme}-text-200`);
    await page.addStyleTag({ content: "html { font-size: 100%; }" });
    if (theme === "Sistema") {
      await page.emulateMedia({ colorScheme: "dark" });
      await expect(page.locator("html")).toHaveClass(/dark/);
      await expect(page.getByRole("button", { name: "Cambiar tema: Sistema", exact: true })).toBeVisible();
      await assertContrast(page, "main *");
      await noOverflow(page);
      await screenshot(page, testInfo, "fixtures-Sistema-dark");
      await page.emulateMedia({ colorScheme: "light" });
      await expect(page.locator("html")).toHaveClass(/light/);
    }
    db.rows = visualRows.filter((item) => item.titulo !== longTitle).map((item) => ({ ...item }));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("button", { name: "Actualizar", exact: true }).click();
    await expect(page.getByRole("article", { name: longTitle, exact: true })).toHaveCount(0);
    await expect(page.getByText("6 oportunidades visibles · Indicadores globales", { exact: true })).toBeVisible();
    await noOverflow(page);
    await screenshot(page, testInfo, `review-${theme}-desktop`);
    await page.setViewportSize({ width: 390, height: 844 });
    await noOverflow(page);
    await screenshot(page, testInfo, `review-${theme}-mobile`);
    expect(db.mutations).toEqual([]);
    expect(errors).toEqual([]);
  });

  test(`Oportunidades: ${theme}, formularios y detalle conservan teclado, foco y contenido extenso`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const db = await mockOpportunities(page);
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await login(page);
    await chooseTheme(page, theme);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/oportunidades");
    const create = page.getByRole("button", { name: "Nueva oportunidad", exact: true });
    await create.focus();
    expect(await create.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
    const focusContrast = await assertContrast(page, "main button:focus");
    await testInfo.attach(`contrast-${theme}-focus.json`, { body: JSON.stringify(focusContrast, null, 2), contentType: "application/json" });
    await page.keyboard.press("Enter");
    const form = page.getByRole("dialog", { name: "Nueva oportunidad", exact: true });
    await expect(form).toBeVisible();
    await focusStaysInDialog(page, form);
    await form.getByRole("button", { name: "Crear oportunidad", exact: true }).click();
    await expect(form.getByRole("alert")).toContainText("Título");
    const measured = await assertContrast(page, '[role="dialog"] *');
    await testInfo.attach(`contrast-${theme}-form.json`, { body: JSON.stringify(measured, null, 2), contentType: "application/json" });
    expect(await reducedMotionViolations(page)).toEqual([]);
    await noOverflow(page);
    await screenshot(page, testInfo, `fixtures-${theme}-form-validation`);
    await page.setViewportSize({ width: 390, height: 400 });
    await expect(form).toBeInViewport({ ratio: 1 });
    await form.getByLabel("Descripción", { exact: true }).focus();
    await expect(form.getByLabel("Descripción", { exact: true })).toBeInViewport({ ratio: 1 });
    await form.getByRole("button", { name: "Crear oportunidad", exact: true }).focus();
    await expect(form.getByRole("button", { name: "Crear oportunidad", exact: true })).toBeInViewport({ ratio: 1 });
    await noOverflow(page);
    await screenshot(page, testInfo, `fixtures-${theme}-form-short`);
    await page.keyboard.press("Escape");
    await expect(form).toBeHidden();
    await expect(create).toBeFocused();
    await page.setViewportSize({ width: 390, height: 844 });
    const card = page.getByRole("article", { name: longTitle, exact: true });
    const detailTrigger = card.getByRole("button", { name: `Ver oportunidad: ${longTitle}`, exact: true });
    await detailTrigger.focus();
    await page.keyboard.press("Enter");
    const detail = page.getByRole("dialog", { name: longTitle, exact: true });
    await expect(detail).toContainText(longDescription);
    await expect(detail).toContainText(formatMoney("999999999999.99"));
    await expect(detail.getByRole("link").filter({ hasText: clients[1].nombres })).toHaveAttribute("href", `/clientes?buscar=${longClientId}`);
    await assertContrast(page, '[role="dialog"] *');
    await noOverflow(page);
    await screenshot(page, testInfo, `fixtures-${theme}-detail-long`);
    await page.keyboard.press("Escape");
    await expect(detailTrigger).toBeFocused();
    const editTrigger = card.getByRole("button", { name: `Editar oportunidad: ${longTitle}`, exact: true });
    await editTrigger.press("Enter");
    const edit = page.getByRole("dialog", { name: "Editar oportunidad", exact: true });
    await expect(edit.getByLabel("Título *", { exact: true })).toHaveValue(longTitle);
    await expect(edit.getByLabel("Valor estimado (S/) *", { exact: true })).toHaveValue("999999999999.99");
    await expect(edit.getByLabel("Descripción", { exact: true })).toHaveValue(longDescription);
    await page.addStyleTag({ content: "html { font-size: 200%; }" });
    await noOverflow(page);
    await edit.getByRole("button", { name: "Guardar cambios", exact: true }).focus();
    await expect(edit.getByRole("button", { name: "Guardar cambios", exact: true })).toBeInViewport({ ratio: 1 });
    await screenshot(page, testInfo, `fixtures-${theme}-edit-text-200`);
    await page.keyboard.press("Escape");
    await expect(editTrigger).toBeFocused();
    expect(db.mutations).toEqual([]);
  });
}

test("Oportunidades móvil: navegar etapas y guardar un cambio mantiene tarjeta visible y foco", async ({ page }) => {
  const db = await mockOpportunities(page, [fixture]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.goto("/oportunidades");
  const navigation = page.getByRole("group", { name: "Navegar etapas", exact: true });
  const won = navigation.getByRole("button", { name: "Ver etapa Ganada", exact: true });
  await won.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "Etapa Ganada", exact: true })).toBeVisible();
  await expect(page.getByRole("article", { name: fixture.titulo, exact: true })).toBeHidden();
  await navigation.getByRole("button", { name: "Ver etapa Nueva", exact: true }).press("Enter");
  const stage = page.getByRole("article", { name: fixture.titulo, exact: true }).getByLabel("Cambiar etapa:");
  await stage.focus();
  await stage.selectOption("Ganada");
  await expect(page.getByRole("region", { name: "Etapa Ganada", exact: true }).getByRole("article", { name: fixture.titulo, exact: true })).toBeVisible();
  await expect(stage).toBeFocused();
  await expect(stage).toHaveValue("Ganada");
  await assertContrast(page, "main select:focus");
  expect(db.mutations).toHaveLength(1);
  expect(db.mutations[0].input).toMatchObject({ etapa: "Ganada", probabilidad: 100, valor: fixture.valor, responsable_id: fixture.responsable_id });
  await noOverflow(page);
});

test("Oportunidades: chips quitan un filtro sin alterar los demás y limpiar recupera el pipeline", async ({ page }) => {
  const db = await mockOpportunities(page);
  await login(page);
  await page.goto("/oportunidades");
  await page.getByLabel("Buscar oportunidades", { exact: true }).fill("renovacion");
  await page.getByLabel("Filtrar por etapa", { exact: true }).selectOption("Nueva");
  await page.getByLabel("Filtrar por responsable", { exact: true }).selectOption(ownerId);
  await page.getByLabel("Filtrar por cliente", { exact: true }).selectOption(clientId);
  await page.getByLabel("Filtrar por estado", { exact: true }).selectOption("open");
  await page.getByLabel("Cierre estimado desde", { exact: true }).fill("2026-12-01");
  await page.getByLabel("Cierre estimado hasta", { exact: true }).fill("2026-12-31");
  await expect(page.getByRole("article", { name: fixture.titulo, exact: true })).toBeVisible();
  const removeStage = page.getByRole("button", { name: /^Quitar filtro: Etapa:/ });
  await removeStage.press("Enter");
  await expect(page.getByLabel("Filtrar por etapa", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Filtrar por responsable", { exact: true })).toHaveValue(ownerId);
  await expect(page.getByLabel("Filtrar por cliente", { exact: true })).toHaveValue(clientId);
  await expect(page.getByLabel("Buscar oportunidades", { exact: true })).toHaveValue("renovacion");
  await page.getByRole("button", { name: /^Quitar filtro: Búsqueda:/ }).click();
  await expect(page.getByLabel("Buscar oportunidades", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Filtrar por estado", { exact: true })).toHaveValue("open");
  await expect(page.getByLabel("Cierre estimado desde", { exact: true })).toHaveValue("2026-12-01");
  await expect(page.getByLabel("Cierre estimado hasta", { exact: true })).toHaveValue("2026-12-31");
  await page.getByRole("button", { name: "Limpiar filtros", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Quitar filtro:/ })).toHaveCount(0);
  for (const name of ["Filtrar por etapa", "Filtrar por responsable", "Filtrar por cliente", "Filtrar por estado", "Cierre estimado desde", "Cierre estimado hasta"]) {
    await expect(page.getByLabel(name, { exact: true })).toHaveValue("");
  }
  await expect(page.getByText("7 oportunidades visibles · Indicadores globales", { exact: true })).toBeVisible();
  expect(db.mutations).toEqual([]);
});

for (const theme of ["Claro", "Oscuro", "Sistema"] as const) {
  test(`Oportunidades: ${theme}, carga, error y vacío anuncian su estado sin ceros provisionales`, async ({ page }, testInfo) => {
    const db = await mockOpportunities(page, [fixture]);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    await page.route(`${api}/oportunidades**`, async (route) => {
      await gate;
      await route.fulfill(db.unavailable ? { status: 503, json: { message: "Servicio de prueba no disponible" } } : { json: db.rows });
    });
    db.unavailable = true;
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await login(page);
    await chooseTheme(page, theme);
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto("/oportunidades");
    await expect(page.locator("main").getByRole("status").filter({ hasText: "Cargando oportunidades" })).toBeVisible();
    const summary = page.getByRole("region", { name: "Resumen comercial", exact: true });
    await expect(summary.getByText("0", { exact: true })).toHaveCount(0);
    await expect(summary.getByText("S/ 0.00", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("article")).toHaveCount(0);
    await noOverflow(page);
    await assertContrast(page, "main *");
    await screenshot(page, testInfo, `fixtures-${theme}-loading`);
    release();
    await expect(page.locator("main").getByRole("alert")).toBeVisible();
    await expect(summary.getByText("0", { exact: true })).toHaveCount(0);
    await expect(summary.getByText("S/ 0.00", { exact: true })).toHaveCount(0);
    await noOverflow(page);
    await assertContrast(page, "main *");
    await screenshot(page, testInfo, `fixtures-${theme}-error`);
    db.unavailable = false;
    await page.getByRole("button", { name: "Reintentar", exact: true }).click();
    await expect(page.getByRole("article", { name: fixture.titulo, exact: true })).toBeVisible();
    db.rows = [];
    await page.getByRole("button", { name: "Actualizar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Todavía no hay oportunidades", exact: true })).toBeVisible();
    await noOverflow(page);
    await assertContrast(page, "main *");
    await screenshot(page, testInfo, `fixtures-${theme}-empty`);
    await page.getByRole("button", { name: "Nueva oportunidad", exact: true }).first().press("Enter");
    await expect(page.getByRole("dialog", { name: "Nueva oportunidad", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    expect(db.mutations).toEqual([]);
  });
}
