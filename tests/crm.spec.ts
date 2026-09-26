import { devices, expect, test, type Locator, type Page } from "@playwright/test";

const sampleClient = {
  firstName: "Sofía",
  lastName: "Prueba Nexo",
  company: "Estudio Horizonte Demo",
  email: "sofia.prueba.nexo@example.com",
  phone: "+51 999 123 456",
  position: "Directora comercial",
  address: "Av. Los Álamos 120, Lima",
  notes: "Prefiere recibir propuestas por correo.",
};

async function fillClientForm(dialog: Locator) {
  await dialog.getByLabel("Nombres", { exact: true }).fill(sampleClient.firstName);
  await dialog.getByLabel("Apellidos", { exact: true }).fill(sampleClient.lastName);
  await dialog.getByLabel("Empresa", { exact: true }).fill(sampleClient.company);
  await dialog.getByLabel("Correo electrónico", { exact: true }).fill(sampleClient.email);
  await dialog.getByLabel("Teléfono", { exact: true }).fill(sampleClient.phone);
  await dialog.getByLabel("Cargo", { exact: true }).fill(sampleClient.position);
  await dialog.getByLabel("Estado", { exact: true }).selectOption("Activo");
  await dialog.getByLabel("Responsable", { exact: true }).selectOption("Lucía Torres");
  await dialog.getByLabel("Dirección", { exact: true }).fill(sampleClient.address);
  await dialog.getByLabel("Notas", { exact: true }).fill(sampleClient.notes);
}

async function registerClient(page: Page) {
  await page.getByRole("button", { name: "Nuevo cliente", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Nuevo cliente", exact: true });
  await fillClientForm(dialog);
  await dialog.getByRole("button", { name: "Guardar cliente", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Cliente registrado", { exact: true })).toBeVisible();
}

function clientRow(page: Page, name: string) {
  return page.getByRole("row").filter({ has: page.getByText(name, { exact: true }) });
}

async function selectClientAction(page: Page, name: string, action: "Ver" | "Editar" | "Eliminar") {
  await clientRow(page, name).getByRole("button", { name: /Acciones/ }).click();
  await page.getByRole("menuitem", { name: action, exact: true }).click();
}

test("el resumen muestra indicadores demo y la búsqueda global abre el directorio filtrado", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Resumen", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Clientes totales/ })).toContainText("1,248");
  await expect(page.getByText("326", { exact: true })).toBeVisible();
  await expect(page.getByText(/S\/\s?48,520/, { exact: true })).toBeVisible();
  await expect(page.getByText("24.8%", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rendimiento de ventas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Oportunidades recientes" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Actividad reciente" })).toBeVisible();

  await page.getByLabel("Buscar en Nexo").fill("valeria.rojas@example.com");
  await page.getByLabel("Buscar en Nexo").press("Enter");
  await expect(page).toHaveURL(/\/clientes\?buscar=valeria\.rojas%40example\.com/);
  await expect(page.getByLabel("Buscar clientes", { exact: true })).toHaveValue("valeria.rojas@example.com");
  await expect(clientRow(page, "Valeria Rojas")).toBeVisible();
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(2);
});

test("las acciones del encabezado y del espacio ofrecen respuestas claras", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Notificaciones", exact: true }).click();
  const notifications = page.getByRole("dialog", { name: "Notificaciones", exact: true });
  await notifications.getByRole("button", { name: "Marcar como leída", exact: true }).click();
  await expect(notifications.getByRole("button", { name: "Todas leídas", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Notificaciones", exact: true }).click();
  await expect(notifications).toContainText("Estás al día");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Ayuda", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Todos los datos son ficticios");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Configuración", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Configuración del espacio" })).toContainText("Memoria local");
  await page.keyboard.press("Escape");
  await page.getByRole("banner").getByRole("button", { name: "Perfil de Ana García" }).click();
  await expect(page.getByRole("dialog", { name: "Perfil de demostración" })).toContainText("Administrador");
  await page.keyboard.press("Escape");
  await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("button", { name: /Oportunidades/ }).click();
  await expect(page.getByRole("dialog", { name: "Oportunidades", exact: true })).toContainText("siguientes etapas");
});

test("registra, consulta, edita y elimina con confirmación; el resumen refleja los cambios", async ({ page }) => {
  await page.goto("/clientes");
  await registerClient(page);
  const name = `${sampleClient.firstName} ${sampleClient.lastName}`;
  await expect(clientRow(page, name)).toContainText(sampleClient.email);
  await expect(clientRow(page, name)).toContainText("Lucía Torres");

  await page.getByRole("link", { name: "Resumen", exact: true }).click();
  await expect(page.getByRole("link", { name: /Clientes totales/ })).toContainText("1,249");
  await page.getByRole("link", { name: "Clientes", exact: true }).click();
  await expect(clientRow(page, name)).toBeVisible();

  await selectClientAction(page, name, "Ver");
  let dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(sampleClient.position);
  await expect(dialog).toContainText(sampleClient.address);
  await expect(dialog).toContainText(sampleClient.notes);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await selectClientAction(page, name, "Editar");
  dialog = page.getByRole("dialog", { name: "Editar cliente", exact: true });
  await expect(dialog.getByLabel("Correo electrónico", { exact: true })).toHaveValue(sampleClient.email);
  await expect(dialog.getByLabel("Notas", { exact: true })).toHaveValue(sampleClient.notes);
  await dialog.getByLabel("Empresa", { exact: true }).fill("Horizonte Actualizado");
  await dialog.getByLabel("Estado", { exact: true }).selectOption("Inactivo");
  await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Cambios guardados", { exact: true })).toBeVisible();
  await expect(clientRow(page, name)).toContainText("Horizonte Actualizado");
  await expect(clientRow(page, name).getByRole("cell", { name: "Inactivo", exact: true })).toBeVisible();

  await selectClientAction(page, name, "Eliminar");
  const confirmation = page.getByRole("alertdialog");
  await expect(confirmation).toContainText(name);
  await confirmation.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(clientRow(page, name)).toBeVisible();
  await selectClientAction(page, name, "Eliminar");
  await confirmation.getByRole("button", { name: "Eliminar cliente", exact: true }).click();
  await expect(confirmation).toBeHidden();
  await expect(page.getByText("Cliente eliminado", { exact: true })).toBeVisible();
  await expect(clientRow(page, name)).toHaveCount(0);
  await page.getByRole("link", { name: "Resumen", exact: true }).click();
  await expect(page.getByRole("link", { name: /Clientes totales/ })).toContainText("1,248");
});

test("los cambios locales sobreviven a la navegación y se reinician al recargar", async ({ page }) => {
  await page.goto("/clientes");
  await registerClient(page);
  await page.getByRole("link", { name: "Resumen", exact: true }).click();
  await expect(page.getByRole("link", { name: /Clientes totales/ })).toContainText("1,249");
  await page.reload();
  await expect(page.getByRole("link", { name: /Clientes totales/ })).toContainText("1,248");
  await page.getByRole("link", { name: "Clientes", exact: true }).click();
  await page.getByLabel("Buscar clientes", { exact: true }).fill(sampleClient.email);
  await expect(page.getByRole("heading", { name: "No encontramos clientes" })).toBeVisible();
});

test("valida campos con mensajes accesibles y rechaza correos duplicados", async ({ page }) => {
  await page.goto("/clientes");
  await page.getByRole("button", { name: "Nuevo cliente", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Nuevo cliente", exact: true });
  await dialog.getByRole("button", { name: "Guardar cliente", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Revisa los campos");
  await expect(dialog.getByLabel("Nombres", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(dialog.getByLabel("Nombres", { exact: true })).toBeFocused();

  await fillClientForm(dialog);
  await dialog.getByLabel("Correo electrónico", { exact: true }).fill("correo-invalido");
  await dialog.getByLabel("Teléfono", { exact: true }).fill("123");
  await dialog.getByRole("button", { name: "Guardar cliente", exact: true }).click();
  await expect(dialog.getByLabel("Correo electrónico", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(dialog.getByLabel("Teléfono", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(dialog.getByText(/Escribe un correo válido/)).toBeVisible();
  await expect(dialog.getByText(/Escribe un teléfono/)).toBeVisible();

  await dialog.getByLabel("Correo electrónico", { exact: true }).fill("VALERIA.ROJAS@EXAMPLE.COM");
  await dialog.getByLabel("Teléfono", { exact: true }).fill(sampleClient.phone);
  await dialog.getByRole("button", { name: "Guardar cliente", exact: true }).click();
  await expect(dialog.getByText("Ya existe un cliente con este correo electrónico.", { exact: true })).toBeVisible();
  await expect(dialog.getByLabel("Correo electrónico", { exact: true })).toBeFocused();
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("link", { name: "Resumen", exact: true }).click();
  await expect(page.getByRole("link", { name: /Clientes totales/ })).toContainText("1,248");
});

test("combina búsqueda, filtros y paginación; recupera el directorio desde el estado vacío", async ({ page }) => {
  await page.goto("/clientes");
  const table = page.getByRole("table");
  await expect(table.getByRole("row")).toHaveCount(9);
  await expect(page.getByRole("button", { name: "Página anterior", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Página siguiente", exact: true }).click();
  await expect(page.getByRole("button", { name: "Página 2", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText(/Mostrando 9–16 de/)).toBeVisible();
  await page.getByLabel("Por página", { exact: true }).selectOption("16");
  await expect(table.getByRole("row")).toHaveCount(17);
  await expect(page.getByRole("button", { name: "Página 1", exact: true })).toHaveAttribute("aria-current", "page");

  const search = page.getByLabel("Buscar clientes", { exact: true });
  await search.fill("puna logistica");
  await expect(clientRow(page, "Sebastián Flores")).toBeVisible();
  await expect(table.getByRole("row")).toHaveCount(2);
  await search.fill("987654321");
  await expect(clientRow(page, "Valeria Rojas")).toBeVisible();
  await expect(table.getByRole("row")).toHaveCount(2);

  await search.fill("");
  await page.getByLabel("Filtrar por estado", { exact: true }).selectOption("Activo");
  await page.getByLabel("Filtrar por responsable", { exact: true }).selectOption("Ana García");
  await expect(table.getByRole("row")).toHaveCount(17);
  await expect(table.getByRole("cell", { name: "Activo", exact: true })).toHaveCount(16);
  await expect(table.getByRole("cell", { name: "Ana García", exact: true })).toHaveCount(16);
  await search.fill("nexo-cliente-inexistente-zzzz");
  await expect(page.getByRole("heading", { name: "No encontramos clientes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Página siguiente", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Ver todos los clientes", exact: true }).click();
  await expect(search).toHaveValue("");
  await expect(page.getByLabel("Filtrar por estado", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Filtrar por responsable", { exact: true })).toHaveValue("");
  await expect(table.getByRole("row")).toHaveCount(17);
});

test.describe("móvil", () => {
  test.use({ ...devices["Pixel 7"] });

  test("navega por el menú y registra un cliente con formulario y foco utilizables", async ({ page }) => {
    await page.goto("/");
    const navigationTrigger = page.getByRole("button", { name: "Abrir navegación", exact: true });
    await navigationTrigger.click();
    await page.getByRole("dialog").getByRole("link", { name: "Clientes", exact: true }).click();
    await expect(page).toHaveURL(/\/clientes$/);
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("heading", { name: "Clientes", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    const newClientButton = page.getByRole("button", { name: "Nuevo cliente", exact: true });
    await newClientButton.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Nuevo cliente", exact: true });
    await expect(dialog.getByLabel("Nombres", { exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(dialog.getByLabel("Apellidos", { exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(newClientButton).toBeFocused();

    await registerClient(page);
    await expect(clientRow(page, `${sampleClient.firstName} ${sampleClient.lastName}`)).toBeVisible();
    await navigationTrigger.click();
    await page.getByRole("dialog").getByRole("link", { name: "Resumen", exact: true }).click();
    await expect(page.getByRole("link", { name: /Clientes totales/ })).toContainText("1,249");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
