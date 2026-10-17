import { expect, test } from "@playwright/test";
import { login } from "./support/login";

test.beforeEach(async ({ request }) => { await request.post("http://127.0.0.1:54321/__test/reset"); });

test("el límite CRM oculta detalles, reintenta y ofrece navegación segura", async ({ page }) => {
  await login(page);
  await page.goto("/prueba-limite-error");
  const alert = page.locator("main section[role='alert']");
  await expect(alert).toContainText("No pudimos mostrar esta sección");
  await expect(alert).not.toContainText("E2E_SECRET_SHOULD_NOT_BE_VISIBLE");
  const retry = page.getByRole("button", { name: "Reintentar" });
  await retry.focus();
  await expect(retry).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Recuperación completada" })).toBeVisible();
});

test("el límite CRM conserva temas y reflow móvil", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await login(page);
  await page.goto("/prueba-limite-error");
  const alert = page.locator("main section[role='alert']");
  await expect(alert).toBeVisible();
  for (const theme of ["Claro", "Oscuro", "Sistema"] as const) {
    await page.getByRole("button", { name: /^Cambiar tema/ }).click();
    await page.getByRole("menuitemradio", { name: theme, exact: true }).click();
    await expect(page.locator("html")).toHaveClass(theme === "Claro" ? /light/ : /dark/);
    await expect(alert).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const targets = await alert.locator("a, button").evaluateAll((elements) => elements.map((element) => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })));
  expect(targets.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
  await page.getByRole("link", { name: "Volver al resumen" }).click();
  await expect(page).toHaveURL(/\/$/);
});
