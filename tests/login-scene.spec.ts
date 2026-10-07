import { expect, test, type Page } from "@playwright/test";
import { enableLogin } from "./support/login";

async function sceneTheme(page: Page, theme: "light" | "dark" | "system") {
  await page.addInitScript((value) => {
    if (localStorage.getItem("nexo-theme") === null) localStorage.setItem("nexo-theme", value);
  }, theme);
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

async function capture(page: Page, path: string) {
  await page.screenshot({
    path, fullPage: true, animations: "disabled",
    style: "[data-nextjs-dev-tools-button] { visibility: hidden; }",
  });
}

test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:54321/__test/reset");
});

test("apagada sin foco oculto, Enter y Space, apagar y conservar campos", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (/hydrat/i.test(message.text())) errors.push(message.text()); });
  await sceneTheme(page, "dark");
  await page.goto("/login");
  const lamp = page.getByRole("button", { name: /^(Encender|Apagar) lámpara$/ });
  await expect(lamp).toBeEnabled();
  await expect(lamp).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#login-access")).toHaveAttribute("inert", "");
  await expect(page.getByRole("textbox", { name: "Correo electrónico" })).toHaveCount(0);
  await capture(page, testInfo.outputPath("dark-off.png"));
  await lamp.focus();
  expect(await lamp.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.closest("#login-access") !== null)).toBe(false);
  await lamp.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#login-access")).toHaveCSS("opacity", "1");
  await expect(lamp).toHaveAttribute("aria-pressed", "true");
  await expect(lamp).toHaveAccessibleName("Apagar lámpara");
  await expect(lamp).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Nexo CRM, ir al resumen" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Correo electrónico")).toBeFocused();
  await page.getByLabel("Correo electrónico").fill("contacto@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("contraseña de prueba");
  await page.getByRole("button", { name: "Apagar lámpara", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#login-access")).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByRole("textbox", { name: "Correo electrónico" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Encender lámpara", exact: true })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.locator("#login-access")).toHaveCSS("opacity", "1");
  await expect(page.getByLabel("Correo electrónico")).toHaveValue("contacto@example.test");
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveValue("contraseña de prueba");
  await capture(page, testInfo.outputPath("dark-on.png"));
  await page.reload();
  await expect(page.getByRole("button", { name: "Encender lámpara", exact: true })).toHaveAttribute("aria-pressed", "false");
  expect(errors).toEqual([]);
});

for (const theme of ["light", "dark"] as const) {
  test(`${theme}: escena, ocho anchos, contraste, objetivos y texto al 200%`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await sceneTheme(page, theme);
    await page.goto("/login");
    await capture(page, testInfo.outputPath(`${theme}-off.png`));
    await enableLogin(page);
    for (const width of [320, 390, 640, 768, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: width < 640 ? 844 : 1000 });
      await noOverflow(page);
      if ([390, 768, 1440].includes(width)) await capture(page, testInfo.outputPath(`${theme}-${width}.png`));
    }
    const contrast = await page.locator("main").evaluate((scene) => {
      const style = getComputedStyle(scene);
      const luminance = (hex: string) => hex.trim().slice(1).match(/../g)!.map((value) => {
        const c = parseInt(value, 16) / 255;
        return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
      }).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
      const ratio = (foreground: string, background: string) => {
        const a = luminance(foreground); const b = luminance(background);
        return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      };
      const token = (key: string) => style.getPropertyValue(key).trim();
      return [
        { pair: "text/canvas", ratio: ratio(token("--scene-text"), token("--scene-on")), minimum: 4.5 },
        { pair: "muted/canvas", ratio: ratio(token("--scene-muted"), token("--scene-on")), minimum: 4.5 },
        { pair: "input text", ratio: ratio(token("--scene-text"), token("--scene-field")), minimum: 4.5 },
        { pair: "placeholder", ratio: ratio(token("--scene-muted"), token("--scene-field")), minimum: 4.5 },
        { pair: "input boundary", ratio: ratio(token("--scene-field-border"), token("--scene-field")), minimum: 3 },
        { pair: "input boundary canvas", ratio: ratio(token("--scene-field-border"), token("--scene-on")), minimum: 3 },
        { pair: "focus", ratio: ratio(token("--scene-focus"), token("--scene-on")), minimum: 3 },
        { pair: "submit", ratio: ratio("#ffffff", "#2563eb"), minimum: 4.5 },
      ];
    });
    expect(contrast.filter((pair) => pair.ratio < pair.minimum), JSON.stringify(contrast)).toEqual([]);
    await testInfo.attach("contrast.json", { body: JSON.stringify(contrast, null, 2), contentType: "application/json" });
    await page.setViewportSize({ width: 390, height: 844 });
    const targets = await page.locator("main button, main input").evaluateAll((elements) => elements.filter((element) => !element.closest("[inert]")).map((element) => ({ label: element.getAttribute("aria-label") || element.textContent, width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })));
    expect(targets.filter((target) => target.width < 44 || target.height < 44), JSON.stringify(targets)).toEqual([]);
    await page.addStyleTag({ content: "html { font-size: 200%; }" });
    await noOverflow(page);
    await capture(page, testInfo.outputPath(`${theme}-text-200.png`));
    await page.addStyleTag({ content: "html { font-size: 100%; }" });
    await page.setViewportSize({ width: 390, height: 400 });
    await page.getByLabel("Contraseña", { exact: true }).focus();
    await expect(page.getByLabel("Contraseña", { exact: true })).toBeInViewport({ ratio: 1 });
    await noOverflow(page);
    await capture(page, testInfo.outputPath(`${theme}-short-viewport.png`));
  });
}

test("Sistema, elección de tema independiente de la lámpara y persistencia", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || /hydrat/i.test(message.text())) errors.push(message.text());
  });
  async function openTheme(name: string) {
    await expect(page.locator("nextjs-portal [data-nextjs-dialog]")).not.toBeVisible();
    const trigger = page.getByRole("button", { name, exact: true });
    await trigger.focus();
    await trigger.press("Enter");
  }
  await page.emulateMedia({ colorScheme: "dark" });
  await sceneTheme(page, "system");
  await page.goto("/login");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await enableLogin(page);
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveClass(/light/);
  await expect(page.locator("main")).toHaveAttribute("data-lit", "true");
  await openTheme("Cambiar tema: Sistema");
  await page.getByRole("menuitemradio", { name: "Oscuro", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator("main")).toHaveAttribute("data-lit", "true");
  expect(await page.evaluate(() => localStorage.getItem("nexo-theme"))).toBe("dark");
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator("main")).toHaveAttribute("data-lit", "false");
  await openTheme("Cambiar tema: Oscuro");
  await page.getByRole("menuitemradio", { name: "Claro", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/light/);
  await openTheme("Cambiar tema: Claro");
  await page.getByRole("menuitemradio", { name: "Sistema", exact: true }).click();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator("nextjs-portal [data-nextjs-dialog]")).not.toBeVisible();
  expect(errors).toEqual([]);
});

test("reduced motion y conmutación rápida sin bloqueo de foco", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await page.goto("/login");
  await enableLogin(page);
  const stage = page.locator("#login-access");
  expect(await stage.evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration))).toBeLessThan(.01);
  expect(await stage.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
  await page.getByRole("button", { name: "Apagar lámpara", exact: true }).click();
  await page.getByRole("button", { name: "Encender lámpara", exact: true }).click();
  await page.getByRole("button", { name: "Apagar lámpara", exact: true }).click();
  await expect(stage).toHaveAttribute("inert", "");
  await page.getByRole("button", { name: "Encender lámpara", exact: true }).press("Space");
  await expect(stage).toHaveCSS("opacity", "1");
  await page.emulateMedia({ forcedColors: "active" });
  await expect(page.getByRole("button", { name: "Apagar lámpara", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Apagar lámpara", exact: true }).focus();
  expect(await page.getByRole("button", { name: "Apagar lámpara", exact: true }).evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
});

test("sesión expirada, envío pendiente y error conservan comportamiento", async ({ page }, testInfo) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let attempts = 0;
  await page.route("**/auth/v1/token**", async (route) => {
    attempts += 1;
    await pending;
    await route.fulfill({
      status: 400,
      headers: {
        "X-Supabase-Api-Version": "2024-01-01",
        "Access-Control-Expose-Headers": "X-Supabase-Api-Version",
      },
      json: { code: "invalid_credentials", message: "Invalid login credentials" },
    });
  });
  await sceneTheme(page, "dark");
  await page.goto("/login?motivo=sesion");
  await enableLogin(page);
  await expect(page.getByRole("status")).toContainText("Tu sesión terminó");
  expect(attempts).toBe(0);
  await page.getByLabel("Correo electrónico").fill("admin@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("incorrecta");
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page.locator("form")).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("button", { name: "Iniciando sesión..." })).toBeDisabled();
  await expect(page.getByLabel("Correo electrónico")).toBeDisabled();
  await capture(page, testInfo.outputPath("pending.png"));
  release();
  await expect(page.locator("#login-access form").getByRole("alert")).toHaveText("El correo o la contraseña no son correctos.");
  await expect(page.getByRole("button", { name: "Iniciar sesión", exact: true })).toBeEnabled();
  expect(attempts).toBe(1);
  await capture(page, testInfo.outputPath("error.png"));
});
