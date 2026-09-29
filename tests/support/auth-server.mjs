// Servicio HTTP de prueba: reemplaza Supabase SOLO en playwright.config.ts.
// No se importa en src ni constituye una prueba de las políticas PostgreSQL.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const sessions = new Map();
const profiles = new Map();
const password = "Nexo-prueba-local-2026!";
const fixtures = [
  { email: "admin@example.test", rol: "Administrador", nombres: "Carlos", apellidos: "Prueba" },
  { email: "gerente@example.test", rol: "Gerente", nombres: "Lucía", apellidos: "Prueba" },
  { email: "vendedor@example.test", rol: "Vendedor", nombres: "Diego", apellidos: "Prueba" },
  { email: "inactivo@example.test", rol: "Vendedor", nombres: "Inactivo", apellidos: "Prueba", activo: false },
  { email: "sinperfil@example.test", rol: "Vendedor", nombres: "Sin", apellidos: "Perfil" },
];
const users = fixtures.map((fixture, index) => ({ id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, aud: "authenticated", role: "authenticated", email: fixture.email, app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, created_at: "2026-09-01T00:00:00Z" }));

function reset() {
  sessions.clear(); profiles.clear();
  users.forEach((user, index) => {
    if (user.email === "sinperfil@example.test") return;
    profiles.set(user.id, { id: user.id, ...fixtures[index], activo: fixtures[index].activo ?? true, avatar_url: null, created_at: user.created_at, updated_at: user.created_at });
  });
}
reset();
function session(user) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, exp: now + 3600, iat: now, aud: "authenticated", role: "authenticated", email: user.email, session_id: randomUUID() })}.test-signature`;
  const value = { access_token: token, token_type: "bearer", refresh_token: randomUUID(), expires_in: 3600, expires_at: now + 3600, user };
  sessions.set(token, value);
  return value;
}

createServer(async (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:3100");
  response.setHeader("Access-Control-Allow-Headers", request.headers["access-control-request-headers"] ?? "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  response.setHeader("Content-Type", "application/json");
  response.setHeader("X-Supabase-Api-Version", "2024-01-01");
  response.setHeader("Access-Control-Expose-Headers", "X-Supabase-Api-Version");
  const send = (body, status = 200) => { response.statusCode = status; response.end(JSON.stringify(body)); };
  if (request.method === "OPTIONS") return send({});
  const url = new URL(request.url, "http://127.0.0.1:54321");
  let raw = "";
  for await (const chunk of request) raw += chunk;
  let body;
  try { body = raw ? JSON.parse(raw) : {}; } catch { return send({ message: "Invalid JSON" }, 400); }
  if (url.pathname === "/health") return send({ ok: true });
  if (url.pathname === "/__test/reset") { reset(); return send({ ok: true }); }
  if (url.pathname === "/auth/v1/token") {
    if (url.searchParams.get("grant_type") === "refresh_token") {
      const old = [...sessions.values()].find((item) => item.refresh_token === body.refresh_token);
      return old ? send(session(old.user)) : send({ code: "refresh_token_not_found", message: "Invalid refresh token" }, 400);
    }
    const user = users.find((item) => item.email === body.email);
    if (!user || body.password !== password) return send({ code: "invalid_credentials", message: "Invalid login credentials" }, 400);
    return send(session(user));
  }
  const token = request.headers.authorization?.replace(/^Bearer /, "");
  const current = sessions.get(token);
  if (!current) return send({ code: "bad_jwt", message: "Invalid session" }, 401);
  if (url.pathname === "/auth/v1/user") return send(current.user);
  if (url.pathname === "/auth/v1/logout") { sessions.delete(token); return send({}); }
  if (url.pathname === "/rest/v1/profiles") {
    const profile = profiles.get(current.user.id);
    if (request.method === "PATCH") {
      if (!profile?.activo || Object.keys(body).some((key) => !["nombres", "apellidos"].includes(key))) return send({ code: "42501", message: "Forbidden" }, 403);
      Object.assign(profile, body, { updated_at: new Date().toISOString() });
    }
    const single = request.headers.accept?.includes("vnd.pgrst.object");
    return send(single ? profile ?? null : profile ? [profile] : []);
  }
  if (url.pathname === "/rest/v1/clientes") return send([]);
  return send({ message: "Mock route not implemented" }, 404);
}).listen(54321, "127.0.0.1", () => process.stdout.write("Supabase simulado disponible en 127.0.0.1:54321\n"));
