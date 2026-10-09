import { expect, test, type Locator, type Page } from "@playwright/test";
import { enableLogin, login } from "./support/login";

async function emptyWorkspace(page: Page) {
  await page.route("http://127.0.0.1:54321/rest/v1/clientes**", (route) => route.fulfill({ json: [] }));
  await page.route("http://127.0.0.1:54321/rest/v1/tareas**", (route) => route.fulfill({ json: [] }));
}

async function reducedMotionViolations(page: Page) {
  return page.locator("body *").evaluateAll((elements) => {
    const seconds = (value: string) => value.split(",").map((part) => parseFloat(part) || 0);
    return elements.flatMap((element) => {
      let ancestor: Element | null = element;
      while (ancestor) {
        if (ancestor.matches("nextjs-portal")) return [];
        const root = ancestor.getRootNode();
        ancestor = ancestor.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
      }
      const bounds = element.getBoundingClientRect();
      if (bounds.width === 0 || bounds.height === 0) return [];
      return [null, "::before", "::after"].flatMap((pseudo) => {
        const style = getComputedStyle(element, pseudo);
        if (style.display === "none" || style.visibility === "hidden") return [];
        if (pseudo && ["none", "normal"].includes(style.content)) return [];
        const timings = {
          animationDuration: style.animationDuration,
          animationDelay: style.animationDelay,
          transitionDuration: style.transitionDuration,
          transitionDelay: style.transitionDelay,
        };
        const delayed = seconds(timings.animationDelay).some((value) => value !== 0)
          || seconds(timings.transitionDelay).some((value) => value !== 0);
        const animated = seconds(timings.animationDuration).some((value) => value > .001)
          || seconds(timings.transitionDuration).some((value) => value > .001);
        return delayed || animated ? [{ element: element.tagName, slot: element.getAttribute("data-slot"), className: element.getAttribute("class"), pseudo, ...timings }] : [];
      });
    });
  });
}

async function insideViewport(page: Page, element: Locator) {
  await expect(element).toBeInViewport({ ratio: 1 });
  const bounds = await element.boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(-1);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds!.y).toBeGreaterThanOrEqual(-1);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
}

test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:54321/__test/reset");
});

test("movimiento reducido elimina esperas en login, decoración, controles y portales", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await emptyWorkspace(page);
  await page.goto("/login");
  expect(await reducedMotionViolations(page)).toEqual([]);
  await enableLogin(page);
  expect(await reducedMotionViolations(page)).toEqual([]);
  await login(page);
  const switcher = page.getByRole("button", { name: /^Cambiar tema/ });
  await expect(switcher).toBeEnabled();
  await switcher.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  expect(await reducedMotionViolations(page)).toEqual([]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Notificaciones", exact: true }).press("Enter");
  await expect(page.getByRole("dialog", { name: "Notificaciones" })).toBeVisible();
  const violations = await reducedMotionViolations(page);
  await testInfo.attach("reduced-motion.json", { body: JSON.stringify(violations, null, 2), contentType: "application/json" });
  expect(violations).toEqual([]);
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  const navigation = page.getByRole("button", { name: "Abrir navegación" });
  await expect(navigation).toBeEnabled();
  await navigation.press("Enter");
  await expect(page.getByRole("dialog", { name: "Navegación de Nexo CRM" })).toBeVisible();
  expect(await reducedMotionViolations(page)).toEqual([]);
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`${reducedMotion}: dropdown y diálogo conservan posición, foco y temas al animar`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion });
    await emptyWorkspace(page);
    await login(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const [theme, className] of [["Oscuro", "dark"], ["Claro", "light"]]) {
      await page.setViewportSize({ width: 1280, height: 900 });
      const switcher = page.getByRole("button", { name: /^Cambiar tema/ });
      await expect(switcher).toBeEnabled();
      await switcher.focus();
      await page.keyboard.press("Enter");
      const menu = page.getByRole("menu");
      await expect(menu).toBeVisible();
      await insideViewport(page, menu);
      await page.getByRole("menuitemradio", { name: theme, exact: true }).focus();
      await page.keyboard.press("Enter");
      await expect(menu).toBeHidden();
      await expect(switcher).toBeFocused();
      await expect(page.locator("html")).toHaveClass(new RegExp(className));
      const notifications = page.getByRole("button", { name: "Notificaciones", exact: true });
      await notifications.focus();
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog", { name: "Notificaciones" });
      await expect(dialog).toBeVisible();
      await insideViewport(page, dialog);
      await expect.poll(async () => {
        const bounds = await dialog.boundingBox();
        return bounds ? Math.abs(bounds.x + bounds.width / 2 - page.viewportSize()!.width / 2) : Infinity;
      }).toBeLessThan(2);
      for (let step = 0; step < 4; step += 1) {
        await page.keyboard.press("Tab");
        expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
      }
      await page.screenshot({ path: testInfo.outputPath(`dialog-${className}-${reducedMotion}.png`), animations: "disabled" });
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(notifications).toBeFocused();
      expect(await notifications.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
      await page.setViewportSize({ width: 390, height: 400 });
      await page.getByRole("button", { name: "Nuevo cliente", exact: true }).press("Enter");
      const form = page.getByRole("dialog", { name: "Nuevo cliente" });
      await expect(form).toBeVisible();
      await insideViewport(page, form);
      await page.getByLabel("Notas", { exact: true }).focus();
      await expect(page.getByLabel("Notas", { exact: true })).toBeInViewport({ ratio: 1 });
      await page.keyboard.press("Escape");
      await expect(form).toBeHidden();
      await expect(page.getByRole("button", { name: "Nuevo cliente", exact: true })).toBeFocused();
    }
    expect(errors).toEqual([]);
  });
}

test("la navegación móvil sigue accesible al cambiar de ancho y con movimiento reducido", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await emptyWorkspace(page);
  await login(page);
  for (const width of [320, 640, 768]) {
    await page.setViewportSize({ width, height: 900 });
    const trigger = page.getByRole("button", { name: "Abrir navegación" });
    await expect(trigger).toBeEnabled();
    await trigger.focus();
    await page.keyboard.press("Enter");
    const drawer = page.getByRole("dialog", { name: "Navegación de Nexo CRM" });
    await expect(drawer).toBeVisible();
    await insideViewport(page, drawer);
    const clients = drawer.getByRole("link", { name: "Clientes", exact: true });
    await clients.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/clientes$/);
    await expect(drawer).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await trigger.press("Enter");
    await expect(drawer).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath(`mobile-shell-${width}.png`), fullPage: true, animations: "disabled" });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByRole("button", { name: "Abrir navegación" })).toBeHidden();
  const clientLink = page.locator("aside").getByRole("link", { name: "Clientes", exact: true });
  await expect(clientLink).toHaveAttribute("aria-current", "page");
  await clientLink.focus();
  expect(await clientLink.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
});

test("la entrada de página termina y se cancela al activar movimiento reducido", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await emptyWorkspace(page);
  await login(page);
  const motion = page.locator('[data-motion="page"]');
  await expect.poll(() => motion.evaluate((element) => element.getAnimations().filter((animation) => animation.playState === "running").length)).toBe(0);
  await page.addStyleTag({ content: ":root { --motion-enter: 4000ms; }" });
  await page.locator("aside").getByRole("link", { name: "Clientes", exact: true }).click();
  await expect.poll(() => motion.evaluate((element) => element.getAnimations().some((animation) => animation.playState === "running"))).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => motion.evaluate((element) => element.getAnimations().length)).toBe(0);
  expect(await motion.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
  await expect(page.getByRole("heading", { name: "Clientes", exact: true })).toBeVisible();
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`${reducedMotion}: aviso real conserva tema, contraste y tiempos de motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion, colorScheme: "light" });
    await emptyWorkspace(page);
    await login(page);
    await page.goto("/perfil");
    await page.getByLabel("Nombres", { exact: true }).fill("Carlos Motion");
    await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
    const toast = page.locator("[data-sonner-toast]").filter({ hasText: "Perfil actualizado" });
    await expect(toast).toBeVisible();
    await page.keyboard.press("Tab");
    await toast.focus();
    await expect(toast).toBeFocused();
    expect(await toast.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
    const timings = await toast.evaluate((element) => {
      const style = getComputedStyle(element);
      return { duration: style.transitionDuration.split(",").map(parseFloat), radius: style.borderRadius, color: style.color };
    });
    expect(timings.radius).toBe("14px");
    expect(timings.duration.every((duration) => duration <= (reducedMotion === "reduce" ? .001 : .32))).toBe(true);
    if (reducedMotion === "no-preference") expect(timings.duration.some((duration) => duration > .1)).toBe(true);
    if (reducedMotion === "reduce") expect(await reducedMotionViolations(page)).toEqual([]);
    await page.getByRole("button", { name: /^Cambiar tema/ }).click();
    await page.getByRole("menuitemradio", { name: "Oscuro", exact: true }).click();
    await expect(page.locator("[data-sonner-toaster]")).toHaveAttribute("data-sonner-theme", "dark");
    await expect(toast).toBeVisible();
    expect(await toast.evaluate((element) => getComputedStyle(element).color)).not.toBe(timings.color);
  });
}
