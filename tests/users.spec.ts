import { expect, test, type Page } from "@playwright/test";
import { login } from "./support/login";

test.beforeEach(async ({ request }) => { await request.post("http://127.0.0.1:54321/__test/reset"); });

async function newUser(page: Page, email = "nuevo@example.test") {
  await page.getByRole("button", { name: "Nuevo usuario", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Nuevo usuario", exact: true });
  await dialog.getByLabel("Nombres", { exact: true }).fill("Mariana");
  await dialog.getByLabel("Apellidos", { exact: true }).fill("Nueva");
  await dialog.getByLabel("Correo electrónico").fill(email);
  await dialog.getByLabel("Contraseña temporal", { exact: true }).fill("Temporal-segura-2026!");
  await dialog.getByLabel("Confirmar contraseña").fill("Temporal-segura-2026!");
  return dialog;
}

test("Administrador administra equipo, filtros, alta, edición, roles y estado", async ({ page }) => {
  await login(page);
  await page.locator("aside").getByRole("link", { name: "Usuarios", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Usuarios", exact: true })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "gerente@example.test" })).toBeVisible();
  await page.getByLabel("Filtrar por rol").selectOption("Gerente");
  await expect(page.getByRole("row").filter({ hasText: "admin@example.test" })).toHaveCount(0);
  await page.getByLabel("Buscar usuarios").fill("inexistente");
  await expect(page.getByRole("heading", { name: "No encontramos usuarios" })).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  const createDialog = await newUser(page);
  await createDialog.getByLabel("Rol", { exact: true }).selectOption("Gerente");
  await createDialog.getByRole("button", { name: "Crear usuario", exact: true }).click();
  await expect(createDialog).toBeHidden();
  const row = page.getByRole("row").filter({ hasText: "nuevo@example.test" });
  await expect(row).toContainText("Gerente");
  await row.getByRole("button", { name: "Editar a Mariana Nueva" }).click();
  const editDialog = page.getByRole("dialog", { name: "Editar usuario", exact: true });
  await expect(editDialog.getByLabel("Correo electrónico")).toHaveAttribute("readonly", "");
  await editDialog.getByLabel("Nombres", { exact: true }).fill("Mariana Editada");
  await editDialog.getByLabel("Rol", { exact: true }).selectOption("Vendedor");
  await editDialog.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(editDialog).toBeHidden();
  await expect(row).toContainText("Mariana Editada Nueva");
  await expect(row).toContainText("Vendedor");
  await row.getByRole("button", { name: "Inactivar a Mariana Editada Nueva" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancelar" }).click();
  await expect(row).toContainText("Activo");
  await row.getByRole("button", { name: "Inactivar a Mariana Editada Nueva" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Inactivar usuario", exact: true }).click();
  await expect(row).toContainText("Inactivo");
  await page.reload();
  await expect(row).toContainText("Inactivo");
  await row.getByRole("button", { name: "Activar a Mariana Editada Nueva" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Activar usuario", exact: true }).click();
  await expect(row).toContainText("Activo");
});

test("validaciones de contraseña, confirmación y correo duplicado", async ({ page }) => {
  await login(page);
  await page.goto("/configuracion/usuarios");
  const dialog = await newUser(page, "admin@example.test");
  await dialog.getByLabel("Contraseña temporal", { exact: true }).fill("corta");
  await dialog.getByRole("button", { name: "Crear usuario", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("entre 12 y 128 caracteres");
  await dialog.getByLabel("Contraseña temporal", { exact: true }).fill("Temporal-segura-2026!");
  await dialog.getByLabel("Confirmar contraseña").fill("Otra-clave-2026!");
  await dialog.getByRole("button", { name: "Crear usuario", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Las contraseñas no coinciden.");
  await dialog.getByLabel("Confirmar contraseña").fill("Temporal-segura-2026!");
  await dialog.getByRole("button", { name: "Mostrar contraseña" }).click();
  await expect(dialog.getByLabel("Contraseña temporal", { exact: true })).toHaveAttribute("type", "text");
  await dialog.getByRole("button", { name: "Crear usuario", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Ya existe una cuenta con este correo.");
});

test("protege el rol y estado del propio administrador", async ({ page }) => {
  await login(page);
  await page.goto("/configuracion/usuarios");
  const own = page.getByRole("row").filter({ hasText: "admin@example.test" });
  await expect(own.getByRole("button", { name: "Inactivar a Carlos Prueba" })).toBeDisabled();
  await own.getByRole("button", { name: "Editar a Carlos Prueba" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Rol", { exact: true })).toBeDisabled();
  await expect(dialog.getByLabel("Estado", { exact: true })).toBeDisabled();
});

test("rechaza invocar una Server Action administrativa con sesión de Vendedor", async ({ page, browser, request }) => {
  await login(page);
  await page.goto("/configuracion/usuarios");
  const dialog = await newUser(page, "captura@example.test");
  const outgoing = page.waitForRequest((request) => request.method() === "POST" && Boolean(request.headers()["next-action"]) && Boolean(request.postData()?.includes("captura@example.test")));
  await dialog.getByRole("button", { name: "Crear usuario", exact: true }).click();
  const captured = await outgoing;
  await expect(dialog).toBeHidden();
  const seller = await browser.newContext({ baseURL: "http://127.0.0.1:3100" });
  try {
    await login(await seller.newPage(), "vendedor@example.test");
    const response = await seller.request.post("/configuracion/usuarios", {
      headers: { "Next-Action": captured.headers()["next-action"], "Content-Type": captured.headers()["content-type"], Origin: "http://127.0.0.1:3100" },
      data: captured.postData()!.replace("captura@example.test", "ataque@example.test"),
    });
    expect(await response.text()).toContain("Solo un Administrador activo puede administrar usuarios.");
    const state = await (await request.get("http://127.0.0.1:54321/__test/state")).json();
    expect(state.adminCreateCalls).toBe(1);
    expect(state.profiles.some((user: { email: string }) => user.email === "ataque@example.test")).toBe(false);
  } finally { await seller.close(); }
});

test("el servidor impide quitar el propio rol aunque se manipule el envío", async ({ page }) => {
  await login(page);
  await page.goto("/configuracion/usuarios");
  await page.getByRole("row").filter({ hasText: "admin@example.test" }).getByRole("button", { name: "Editar a Carlos Prueba" }).click();
  const outgoing = page.waitForRequest((request) => request.method() === "POST" && Boolean(request.headers()["next-action"]) && Boolean(request.postData()?.includes('"updatedAt"')));
  await page.getByRole("dialog").getByRole("button", { name: "Guardar cambios" }).click();
  const captured = await outgoing;
  await expect(page.getByRole("dialog")).toBeHidden();
  const response = await page.request.post("/configuracion/usuarios", {
    headers: { "Next-Action": captured.headers()["next-action"], "Content-Type": captured.headers()["content-type"], Origin: "http://127.0.0.1:3100" },
    data: captured.postData()!.replace('"rol":"Administrador"', '"rol":"Vendedor"'),
  });
  expect(await response.text()).toContain("No puedes desactivarte ni quitarte tu rol de Administrador.");
});

for (const email of ["vendedor@example.test", "gerente@example.test"]) {
  test(`${email} no ve Usuarios y no puede entrar por URL`, async ({ page }) => {
    await login(page, email);
    await expect(page.getByRole("link", { name: "Usuarios", exact: true })).toHaveCount(0);
    await page.goto("/configuracion/usuarios");
    await expect(page).toHaveURL(/\/acceso-restringido\?motivo=permisos/);
    await expect(page.getByRole("heading", { name: "No tienes permiso para acceder" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nuevo usuario" })).toHaveCount(0);
  });
}

test("un alta incompleta conserva una cuenta inactiva y no permite repetir el envío", async ({ page, request }) => {
  await login(page);
  await page.goto("/configuracion/usuarios");
  await request.post("http://127.0.0.1:54321/__test/control", { data: { failProvision: true } });
  const dialog = await newUser(page, "incompleto@example.test");
  await dialog.getByRole("button", { name: "Crear usuario", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Se creó la cuenta");
  await expect(dialog.getByRole("button", { name: "Crear usuario", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Cerrar", exact: true }).first().click();
  await expect(page.getByRole("row").filter({ hasText: "incompleto@example.test" })).toContainText("Inactivo");
  const state = await (await request.get("http://127.0.0.1:54321/__test/state")).json();
  expect(state.adminCreateCalls).toBe(1);
});

test("inactivar un usuario con sesión abierta bloquea su siguiente navegación", async ({ page, request }) => {
  await login(page, "vendedor@example.test");
  await request.post("http://127.0.0.1:54321/__test/control", { data: { email: "vendedor@example.test", activo: false } });
  // Puede redirigirse por la comprobación periódica antes de hacer clic en el enlace.
  await page.goto("/clientes");
  await expect(page).toHaveURL(/\/acceso-restringido$/);
  await expect(page.getByRole("heading", { name: "Tu acceso necesita revisión" })).toBeVisible();
});

test("módulo Usuarios y formulario se adaptan a móvil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole("button", { name: "Abrir navegación" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Usuarios", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Usuarios", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Nuevo usuario", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Nuevo usuario", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Nuevo usuario", exact: true })).toBeFocused();
});
