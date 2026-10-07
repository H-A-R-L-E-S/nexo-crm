import { expect, type Page } from "@playwright/test";

export async function enableLogin(page: Page) {
  await page.getByRole("button", { name: "Encender lámpara", exact: true }).click();
  await expect(page.locator("#login-access")).toHaveCSS("opacity", "1");
}

export async function login(page: Page, email = "admin@example.test") {
  await page.goto("/login");
  await enableLogin(page);
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("Nexo-prueba-local-2026!");
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  await expect(page.getByRole("heading", { name: "Resumen", exact: true })).toBeVisible();
}
