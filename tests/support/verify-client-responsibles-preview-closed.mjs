import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { createServerClient } from "@supabase/ssr";

// Requiere el build E2E local y su Auth simulado en 54321; no inicia una base de datos.
const health = await fetch("http://127.0.0.1:54321/health", { signal: AbortSignal.timeout(2000) });
assert.equal(health.status, 200, "El Auth simulado local no está disponible.");

const localEnv = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "playwright-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "playwright-service-role-key",
  NEXO_E2E_CLIENT_RESPONSIBLES: "disabled",
  NEXO_E2E_ERROR_PROBE: "disabled",
};

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3101"], {
  env: localEnv, stdio: ["ignore", "pipe", "pipe"],
});
let ended = false;
let serverError = "";
server.once("exit", () => { ended = true; });
server.once("error", (error) => { serverError = error.message; });
server.stdout.resume();
server.stderr.on("data", (data) => { serverError += data; });

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (ended || serverError.includes("EADDRINUSE")) throw new Error(serverError || "El servidor local terminó.");
    try {
      const response = await fetch("http://127.0.0.1:3101/login", { redirect: "manual", signal: AbortSignal.timeout(1000) });
      if (response.status === 200) { ready = true; break; }
    } catch { /* Esperar únicamente al proceso local que acaba de iniciarse. */ }
    await delay(250);
  }
  assert.ok(ready, "El servidor 3101 no quedó disponible.");

  const cookieJar = new Map();
  const auth = createServerClient("http://127.0.0.1:54321", "playwright-anon-key", {
    cookies: {
      getAll: () => [...cookieJar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => { for (const { name, value } of cookies) cookieJar.set(name, value); },
    },
  });
  const { error } = await auth.auth.signInWithPassword({ email: "admin@example.test", password: "Nexo-prueba-local-2026!" });
  assert.equal(error, null);
  assert.ok(cookieJar.size > 0);
  const headers = { cookie: [...cookieJar].map(([name, value]) => `${name}=${value}`).join("; ") };
  const authenticated = await fetch("http://127.0.0.1:3101/login", { headers, redirect: "manual" });
  assert.equal(authenticated.status, 307);
  assert.equal(new URL(authenticated.headers.get("location"), "http://127.0.0.1:3101").pathname, "/");

  const preview = await fetch("http://127.0.0.1:3101/prueba-responsables-clientes", { headers, redirect: "manual" });
  assert.equal(preview.status, 404);
  assert.equal((await preview.text()).includes("Vista de pruebas local"), false);

  const errorProbe = await fetch("http://127.0.0.1:3101/prueba-limite-error", { headers, redirect: "manual" });
  const errorProbeHtml = await errorProbe.text();
  assert.ok([200, 404].includes(errorProbe.status));
  assert.equal(errorProbeHtml.includes("No encontramos esta página"), true);
  assert.equal(errorProbeHtml.includes("Preparando fallo controlado"), false);
  assert.equal(errorProbeHtml.includes("E2E_SECRET_SHOULD_NOT_BE_VISIBLE"), false);
  console.log(`PASS: sesión simulada confirmada; responsables=${preview.status}, error-probe=${errorProbe.status} con contenido not-found y sin probe.`);
} finally {
  if (!ended) { server.kill(); await once(server, "exit"); }
}
