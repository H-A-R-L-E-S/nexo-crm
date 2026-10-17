import { expect, test } from "@playwright/test";

test("el bootstrap completo habilita la lámpara y apariencia al volver al login", async ({ page }, testInfo) => {
  const errors: string[] = [];
  const scripts: Array<Promise<{ url: string; status: number; type: string; bytes: number }>> = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.request().resourceType() !== "script" || !new URL(response.url()).pathname.startsWith("/_next/static/")) return;
    scripts.push((async () => ({
      url: response.url(),
      status: response.status(),
      type: response.headers()["content-type"] ?? "",
      bytes: (await response.body()).byteLength,
    }))().catch((error: Error) => {
      errors.push(`${response.url()}: ${error.message}`);
      return { url: response.url(), status: response.status(), type: "", bytes: 0 };
    }));
  });

  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const route of ["/login", "/oportunidades", "/reportes"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
    const lamp = page.getByRole("button", { name: "Encender lámpara", exact: true });
    await expect(lamp).toBeEnabled();
    await expect(page.getByRole("button", { name: /^Cambiar tema/ })).toBeEnabled();
    await expect(page.locator("#login-access")).toHaveAttribute("inert", "");
    await lamp.click();
    await expect(page.getByRole("button", { name: "Apagar lámpara", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#login-access")).not.toHaveAttribute("inert", "");
    await expect(page.locator("#login-access")).toHaveCSS("opacity", "1");
  }

  const delivered = await Promise.all(scripts);
  expect(delivered.length).toBeGreaterThan(0);
  for (const script of delivered) {
    expect(script.status, script.url).toBe(200);
    expect(script.type, script.url).toMatch(/javascript/);
    expect(script.bytes, script.url).toBeGreaterThan(128);
  }
  expect(errors).toEqual([]);
  await testInfo.attach("login-bootstrap-scripts.json", {
    body: JSON.stringify(delivered, null, 2),
    contentType: "application/json",
  });
});
