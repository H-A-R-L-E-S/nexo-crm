import { expect, test } from "@playwright/test";
import { login } from "./support/login";

test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:54321/__test/reset");
});

test("las rutas del CRM redirigen al login sin revelar contenido", async ({ page }) => {
  for (const route of ["/", "/clientes", "/perfil", "/configuracion", "/leads", "/oportunidades", "/ventas", "/tareas", "/calendario", "/reportes"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Bienvenido a tu espacio" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toHaveCount(0);
  }
});

test("valida formulario, muestra contraseña y maneja credenciales incorrectas", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page.getByText("Ingresa un correo electrónico válido.")).toBeVisible();
  await expect(page.getByLabel("Correo electrónico")).toBeFocused();
  await page.getByLabel("Correo electrónico").fill("admin@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("incorrecta");
  await page.getByRole("button", { name: "Mostrar contraseña" }).click();
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Ocultar contraseña" }).click();
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("El correo o la contraseña no son correctos.");
});

test("login, perfil real, edición segura, sesión al recargar y logout", async ({ page }) => {
  await login(page);
  await expect(page.locator("header").getByRole("button", { name: "Menú de Carlos Prueba" })).toBeVisible();
  await page.goto("/login");
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  await page.locator("header").getByRole("button", { name: "Menú de Carlos Prueba" }).click();
  await page.getByRole("menuitem", { name: "Mi perfil" }).click();
  await page.getByLabel("Nombres", { exact: true }).fill("Carlos Actualizado");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.locator("header").getByRole("button", { name: "Menú de Carlos Actualizado Prueba" })).toBeVisible();
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Nombres", { exact: true })).toHaveValue("Carlos Actualizado");
  await page.locator("header").getByRole("button", { name: "Menú de Carlos Actualizado Prueba" }).click();
  await page.getByRole("menuitem", { name: "Cerrar sesión", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await page.goto("/clientes");
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
});

test("rechaza sesiones revocadas y evita usar cookies falsas", async ({ page, context, request }) => {
  await context.addCookies([{ name: "sb-127-auth-token", value: "sesion-falsa", domain: "127.0.0.1", path: "/" }]);
  await page.goto("/clientes");
  await expect(page).toHaveURL(/\/login/);
  await context.clearCookies();
  await login(page);
  await request.post("http://127.0.0.1:54321/__test/reset");
  await page.goto("/clientes");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText("Tu sesión terminó. Inicia sesión para continuar.")).toBeVisible();
});

for (const email of ["inactivo@example.test", "sinperfil@example.test"]) {
  test(`bloquea acceso a cuenta ${email}`, async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill("Nexo-prueba-local-2026!");
    await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
    await expect(page).toHaveURL(/\/acceso-restringido$/);
    await expect(page.getByRole("heading", { name: "Tu acceso necesita revisión" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toHaveCount(0);
  });
}

test("login y menú de usuario son utilizables en móvil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole("button", { name: "Abrir navegación" }).click();
  const drawer = page.getByRole("dialog", { name: "Navegación de Nexo CRM" });
  await drawer.getByRole("button", { name: "Menú de Carlos Prueba" }).click();
  await page.getByRole("menuitem", { name: "Mi perfil" }).click();
  await expect(drawer).toBeHidden();
  await expect(page.getByRole("heading", { name: "Mi perfil", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
