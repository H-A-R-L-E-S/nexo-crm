import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { login } from "./support/login";

test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:54321/__test/reset");
});

async function capture(page: Page, testInfo: TestInfo, name: string) {
  const directory = join(process.cwd(), "anti-slop", "settings-evidence");
  await mkdir(directory, { recursive: true });
  const path = join(directory, `${name}.png`);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

async function expectTextContrast(page: Page) {
  const failures = await page.locator("[data-settings-page] *").evaluateAll((elements) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    const rgba = (value: string) => {
      context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1);
      const color = context.getImageData(0, 0, 1, 1).data;
      return [color[0], color[1], color[2], color[3] / 255];
    };
    const blend = (front: number[], back: number[]) => [0, 1, 2].map((index) => front[index] * front[3] + back[index] * (1 - front[3])).concat(1);
    const background = (element: Element | null): number[] => {
      if (!element) return [255, 255, 255, 1];
      const color = rgba(getComputedStyle(element).backgroundColor);
      return color[3] === 1 ? color : blend(color, background(element.parentElement));
    };
    const luminance = (color: number[]) => color.slice(0, 3).map((channel) => {
      const value = channel / 255;
      return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    }).reduce((total, channel, index) => total + channel * [.2126, .7152, .0722][index], 0);
    return elements.flatMap((element) => {
      if (!element.checkVisibility() || element.closest('[aria-hidden="true"],[disabled]')) return [];
      const text = Array.from(element.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent?.trim()).join("").trim();
      if (!text) return [];
      const style = getComputedStyle(element); const bg = background(element); const fg = blend(rgba(style.color), bg);
      const light = luminance(bg); const dark = luminance(fg); const ratio = (Math.max(light, dark) + .05) / (Math.min(light, dark) + .05);
      const size = parseFloat(style.fontSize); const minimum = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700) ? 3 : 4.5;
      return ratio < minimum ? [{ text, ratio, minimum, color: style.color, background: bg.join(",") }] : [];
    });
  });
  expect(failures, JSON.stringify(failures)).toEqual([]);
}

test("Configuración presenta cuenta, contexto y accesos funcionales", async ({ page }) => {
  await login(page);
  await page.goto("/configuracion");
  await expect(page.getByRole("heading", { name: "Configuración", exact: true })).toBeVisible();
  const account = page.getByRole("region", { name: "Tu identidad en Nexo" });
  await expect(account).toContainText("Carlos Prueba");
  await expect(account).toContainText("admin@example.test");
  await expect(account).toContainText("Administrador");
  await account.getByRole("link", { name: "Editar información personal" }).click();
  await expect(page).toHaveURL(/\/perfil$/);
  await expect(page.getByLabel("Nombres", { exact: true })).toBeVisible();
  await page.goto("/configuracion");
  await page.getByRole("region", { name: "Equipo y accesos" }).getByRole("link", { name: /Usuarios/ }).click();
  await expect(page).toHaveURL(/\/configuracion\/usuarios$/);
});

test("Apariencia reutiliza Claro, Oscuro y Sistema con persistencia y teclado", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await login(page);
  await page.goto("/configuracion");
  const dark = page.getByRole("radio", { name: /Oscuro/ });
  await dark.focus();
  await expect(dark).toBeFocused();
  await page.keyboard.press("Space");
  await expect(dark).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(await page.evaluate(() => localStorage.getItem("nexo-theme"))).toBe("dark");
  await page.reload();
  await expect(page.getByRole("radio", { name: /Oscuro/ })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radio", { name: /Sistema/ }).click();
  await expect(page.locator("html")).toHaveClass(/light/);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(await page.evaluate(() => localStorage.getItem("nexo-theme"))).toBe("system");
});

test("Configuración mantiene responsive, zoom, temas y reduced motion", async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await login(page);
  await page.goto("/configuracion");
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("region", { name: "Cómo ves Nexo" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("radio", { name: /Claro/ }).click();
  await expectTextContrast(page);
  await capture(page, testInfo, "settings-light-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("radio", { name: /Oscuro/ }).click();
  await expectTextContrast(page);
  await capture(page, testInfo, "settings-dark-mobile");
  await page.setViewportSize({ width: 768, height: 900 });
  await page.getByRole("radio", { name: /Sistema/ }).click();
  await capture(page, testInfo, "settings-system-tablet");
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const profile = page.getByRole("link", { name: "Editar información personal" });
  await profile.focus();
  await expect(profile).toBeFocused();
  const motion = await page.locator("[data-settings-page]").evaluate((element) => {
    const style = getComputedStyle(element);
    return { animation: style.animationDuration, transition: style.transitionDuration };
  });
  expect(parseFloat(motion.animation) || 0).toBeLessThanOrEqual(.001);
  expect(parseFloat(motion.transition) || 0).toBeLessThanOrEqual(.001);
});

test("Vendedor ve su configuración sin controles administrativos", async ({ page }) => {
  await login(page, "vendedor@example.test");
  await page.goto("/configuracion");
  await expect(page.getByRole("region", { name: "Tu identidad en Nexo" })).toContainText("Vendedor");
  await expect(page.getByRole("region", { name: "Equipo y accesos" })).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("link", { name: /Usuarios/ })).toHaveCount(0);
  await expect(page.getByText("Leer, crear y editar", { exact: true })).toBeVisible();
});
