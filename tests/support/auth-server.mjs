// Servicio HTTP de prueba: reemplaza Supabase SOLO en playwright.config.ts.
// No se importa en src ni constituye una prueba de las políticas PostgreSQL.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const sessions = new Map();
const profiles = new Map();
const passwords = new Map();
let failProvision = false;
let adminCreateCalls = 0;
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
  sessions.clear(); profiles.clear(); passwords.clear();
  users.splice(fixtures.length);
  failProvision = false;
  adminCreateCalls = 0;
  users.forEach((user, index) => {
    passwords.set(user.id, password);
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
  if (url.pathname === "/__test/control") {
    if (typeof body.failProvision === "boolean") failProvision = body.failProvision;
    if (body.email && typeof body.activo === "boolean") {
      const user = users.find((item) => item.email === body.email);
      if (user && profiles.has(user.id)) Object.assign(profiles.get(user.id), { activo: body.activo, updated_at: new Date().toISOString() });
    }
    return send({ ok: true });
  }
  if (url.pathname === "/__test/state") return send({ adminCreateCalls, profiles: [...profiles.values()] });
  if (url.pathname === "/auth/v1/admin/users" && request.method === "POST") {
    if (request.headers.authorization !== "Bearer playwright-service-role-key") return send({ message: "Unauthorized admin API" }, 403);
    adminCreateCalls++;
    if (users.some((user) => user.email === body.email)) return send({ code: "email_exists", message: "Already registered" }, 422);
    const user = { id: randomUUID(), aud: "authenticated", role: "authenticated", email: body.email, app_metadata: body.app_metadata, user_metadata: body.user_metadata, created_at: new Date().toISOString() };
    users.push(user); passwords.set(user.id, body.password);
    profiles.set(user.id, { id: user.id, nombres: body.user_metadata.nombres, apellidos: body.user_metadata.apellidos, email: user.email, rol: "Vendedor", activo: !body.app_metadata.nexo_provisioning, avatar_url: null, created_at: user.created_at, updated_at: user.created_at });
    return send(user);
  }
  if (url.pathname === "/auth/v1/token") {
    if (url.searchParams.get("grant_type") === "refresh_token") {
      const old = [...sessions.values()].find((item) => item.refresh_token === body.refresh_token);
      return old ? send(session(old.user)) : send({ code: "refresh_token_not_found", message: "Invalid refresh token" }, 400);
    }
    const user = users.find((item) => item.email === body.email);
    if (!user || body.password !== passwords.get(user.id)) return send({ code: "invalid_credentials", message: "Invalid login credentials" }, 400);
    return send(session(user));
  }
  const token = request.headers.authorization?.replace(/^Bearer /, "");
  const current = sessions.get(token);
  if (!current) return send({ code: "bad_jwt", message: "Invalid session" }, 401);
  if (url.pathname === "/auth/v1/user") return send(current.user);
  if (url.pathname === "/auth/v1/logout") { sessions.delete(token); return send({}); }
  if (url.pathname === "/rest/v1/rpc/admin_user_management_ready") {
    const actor = profiles.get(current.user.id);
    return send(actor?.activo && actor?.rol === "Administrador");
  }
  if (url.pathname === "/rest/v1/rpc/admin_update_profile") {
    const actor = profiles.get(current.user.id);
    if (!actor?.activo || actor.rol !== "Administrador") return send({ code: "42501", message: "Solo un Administrador activo puede administrar usuarios." }, 403);
    if (failProvision) return send({ code: "MOCK_ERROR", message: "Provisioning failure" }, 503);
    const target = profiles.get(body.p_id);
    if (!target) return send({ code: "P0002", message: "No se encontró el perfil del usuario." }, 404);
    if (body.p_id === actor.id && (!body.p_activo || body.p_rol !== "Administrador")) return send({ code: "42501", message: "No puedes desactivarte ni quitarte tu rol de Administrador." }, 403);
    if (body.p_updated_at && target.updated_at !== body.p_updated_at) return send({ code: "40001", message: "El usuario cambió mientras lo editabas. Actualiza la lista." }, 409);
    Object.assign(target, { nombres: body.p_nombres, apellidos: body.p_apellidos, rol: body.p_rol, activo: body.p_activo, updated_at: new Date().toISOString() });
    return send(request.headers.accept?.includes("vnd.pgrst.object") ? target : [target]);
  }
  if (url.pathname === "/rest/v1/profiles") {
    const profile = profiles.get(current.user.id);
    if (request.method === "PATCH") {
      if (!profile?.activo || Object.keys(body).some((key) => !["nombres", "apellidos"].includes(key))) return send({ code: "42501", message: "Forbidden" }, 403);
      Object.assign(profile, body, { updated_at: new Date().toISOString() });
    }
    const requestedId = url.searchParams.get("id")?.replace("eq.", "");
    let visible = profile?.activo && profile.rol === "Administrador" ? [...profiles.values()] : profile ? [profile] : [];
    if (requestedId) visible = visible.filter((item) => item.id === requestedId);
    const single = request.headers.accept?.includes("vnd.pgrst.object");
    return send(single ? visible[0] ?? null : visible);
  }
  if (url.pathname === "/rest/v1/clientes") return send([]);
  return send({ message: "Mock route not implemented" }, 404);
}).listen(54321, "127.0.0.1", () => process.stdout.write("Supabase simulado disponible en 127.0.0.1:54321\n"));
