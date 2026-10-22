import { expect, test, type Page } from "@playwright/test";
import { login } from "./support/login";

const modules = [
  ["Dashboard", "/", "Resumen"],
  ["Clientes", "/clientes", "Clientes"],
  ["Leads", "/leads", "Leads"],
  ["Oportunidades", "/oportunidades", "Oportunidades"],
  ["Ventas", "/ventas", "Ventas"],
  ["Tareas", "/tareas", "Tareas"],
  ["Calendario", "/calendario", "Calendario"],
  ["Reportes", "/reportes", "Reportes"],
  ["Usuarios", "/configuracion/usuarios", "Usuarios"],
] as const;

const resources = ["clientes", "leads", "oportunidades", "ventas", "tareas"] as const;

async function mockCommercialData(page: Page) {
  const requests = new Map<string, number>();
  const bytes = new Map<string, number>();
  for (const resource of resources) {
    await page.route(`**/rest/v1/${resource}**`, (route) => {
      const body = "[]";
      requests.set(resource, (requests.get(resource) ?? 0) + 1);
      bytes.set(resource, (bytes.get(resource) ?? 0) + Buffer.byteLength(body));
      return route.fulfill({ body, contentType: "application/json" });
    });
  }
  for (const rpc of ["lead_responsibles", "opportunity_responsibles", "sale_responsibles", "task_responsibles"]) {
    await page.route(`**/rest/v1/rpc/${rpc}`, (route) => route.fulfill({ json: [] }));
  }
  return { requests, bytes };
}

test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:54321/__test/reset");
});

test("registra la línea base reproducible de peticiones por módulo", async ({ page }, testInfo) => {
  await login(page);
  const { requests, bytes } = await mockCommercialData(page);
  const measurements: Array<Record<string, string | number>> = [];

  for (const [name, path, heading] of modules) {
    requests.clear();
    bytes.clear();
    const started = performance.now();
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await page.waitForLoadState("networkidle");
    const usefulContentMs = Math.round(performance.now() - started);
    measurements.push({
      module: name,
      usefulContentMs,
      requests: [...requests.values()].reduce((total, value) => total + value, 0),
      clientRequests: requests.get("clientes") ?? 0,
      rows: 0,
      approximateJsonBytes: [...bytes.values()].reduce((total, value) => total + value, 0),
    });
  }

  await testInfo.attach("performance-mock-small.json", {
    body: JSON.stringify(measurements, null, 2),
    contentType: "application/json",
  });
  console.log(`PERFORMANCE_MOCK_SMALL ${JSON.stringify(measurements)}`);
  for (const measurement of measurements) {
    expect(measurement.clientRequests, `${measurement.module} repitió la consulta de clientes`).toBeLessThanOrEqual(1);
  }
});
