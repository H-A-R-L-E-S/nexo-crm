import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const cli = ["--yes", "supabase@2.122.0"];
const statusRun = spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", `npx ${cli.join(" ")} status -o json`], {
  cwd: process.cwd(),
  encoding: "utf8",
  windowsHide: true,
});
assert.equal(statusRun.status, 0, statusRun.stderr);
const local = JSON.parse(statusRun.stdout);
const apiUrl = new URL(local.API_URL);
const studioUrl = new URL(local.STUDIO_URL);
assert.equal(apiUrl.hostname, "127.0.0.1");
assert.equal(studioUrl.hostname, "127.0.0.1");
assert.equal(apiUrl.port, "54321");
assert.equal(studioUrl.port, "54323");
assert.ok(local.ANON_KEY);

const runSql = (sql) => {
  const result = spawnSync(
    "docker.exe",
    ["exec", "-i", "supabase_db_nexo-crm", "psql", "-X", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc", sql],
    { encoding: "utf8", windowsHide: true },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
};

const sqlLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;
const uuid = (value) => {
  assert.match(value, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  return value;
};

const request = async (path, { method = "GET", token, body, headers = {} } = {}) => {
  const response = await fetch(new URL(path, apiUrl), {
    method,
    headers: {
      apikey: local.ANON_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = text;
  if (text) {
    try { data = JSON.parse(text); } catch { /* keep text */ }
  }
  return { status: response.status, data, headers: response.headers };
};

const expectOk = (result, label, statuses = [200, 201, 204]) => {
  assert.ok(statuses.includes(result.status), `${label}: HTTP ${result.status} ${JSON.stringify(result.data)}`);
  return result.data;
};
const expectDenied = (result, label) => {
  assert.ok(result.status >= 400, `${label}: se esperaba rechazo, HTTP ${result.status}`);
};

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const password = "Local-7C23c-Only!";
const identities = {
  admin: { email: `admin-${suffix}@example.invalid`, nombres: "Alex", apellidos: "Rivera" },
  manager: { email: `manager-${suffix}@example.invalid`, nombres: "Alex", apellidos: "Rivera" },
  seller: { email: `seller-${suffix}@example.invalid`, nombres: "Sara", apellidos: "Prueba" },
  inactive: { email: `inactive-${suffix}@example.invalid`, nombres: "Ivan", apellidos: "Historico" },
  incomplete: { email: `incomplete-${suffix}@example.invalid`, nombres: "", apellidos: "Pendiente" },
};
const createdUserIds = [];
const createdClientIds = [];
const createdLeadIds = [];

const signUp = async (identity) => {
  const result = await request("/auth/v1/signup", {
    method: "POST",
    body: { email: identity.email, password, data: { nombres: identity.nombres, apellidos: identity.apellidos } },
  });
  const data = expectOk(result, `signup ${identity.email}`, [200]);
  assert.ok(data.user?.id);
  createdUserIds.push(uuid(data.user.id));
  return data.user.id;
};
const signIn = async (identity) => {
  const result = await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email: identity.email, password },
  });
  const data = expectOk(result, `signin ${identity.email}`, [200]);
  assert.ok(data.access_token);
  return data.access_token;
};

const insertClient = async (token, values) => {
  const result = await request("/rest/v1/clientes", {
    method: "POST",
    token,
    headers: { Prefer: "return=representation" },
    body: {
      nombres: "Fixture",
      apellidos: "PostgREST",
      correo: `${crypto.randomUUID()}@example.invalid`,
      telefono: "999123456",
      ...values,
    },
  });
  const rows = expectOk(result, "insert cliente", [201]);
  assert.equal(rows.length, 1);
  createdClientIds.push(uuid(rows[0].id));
  return rows[0];
};

const patchClient = async (token, id, patch) => request(`/rest/v1/clientes?id=eq.${id}`, {
  method: "PATCH",
  token,
  headers: { Prefer: "return=representation" },
  body: patch,
});

const insertLead = async (token, values) => {
  const result = await request("/rest/v1/leads", {
    method: "POST",
    token,
    headers: { Prefer: "return=representation" },
    body: { nombres: "Fixture", apellidos: "Conversion", telefono: "999123456", ...values },
  });
  const rows = expectOk(result, "insert lead", [201]);
  assert.equal(rows.length, 1);
  createdLeadIds.push(uuid(rows[0].id));
  return rows[0];
};

const startLockedProfileChange = (profileId, assignment) => {
  const sql = `begin; update public.profiles set ${assignment} where id=${sqlLiteral(profileId)}::uuid; select pg_sleep(2); commit;`;
  return spawn(
    "docker.exe",
    ["exec", "-i", "supabase_db_nexo-crm", "psql", "-X", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql],
    { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );
};
const waitProcess = (child) => new Promise((resolve, reject) => {
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("error", reject);
  child.on("close", (code) => code === 0 ? resolve() : reject(new Error(stderr || `proceso ${code}`)));
});

const results = [];
const pass = (label) => results.push(`PASS ${label}`);

try {
  const restRoot = await request("/rest/v1/");
  expectOk(restRoot, "PostgREST health", [200]);
  pass("PostgREST local responde");
  const authHealth = await request("/auth/v1/health");
  expectOk(authHealth, "GoTrue health", [200]);
  pass("GoTrue local responde");
  const studio = await fetch(studioUrl);
  assert.equal(studio.status, 200);
  pass("Studio local responde");

  for (const identity of Object.values(identities)) identity.id = await signUp(identity);
  runSql(`
    update public.profiles set rol='Administrador' where id=${sqlLiteral(identities.admin.id)}::uuid;
    update public.profiles set rol='Gerente' where id=${sqlLiteral(identities.manager.id)}::uuid;
    update public.profiles set activo=false where id=${sqlLiteral(identities.inactive.id)}::uuid;
  `);
  for (const identity of Object.values(identities)) identity.token = await signIn(identity);
  pass("GoTrue crea y autentica cinco sesiones reales locales");

  const privateView = await request("/rest/v1/client_responsible_directory?select=*", { token: identities.admin.token });
  assert.equal(privateView.status, 404);
  const privateRpc = await request("/rest/v1/rpc/client_responsible_has_visible_client", {
    method: "POST", token: identities.admin.token, body: { p_responsable_id: identities.seller.id },
  });
  assert.equal(privateRpc.status, 404);
  pass("nexo_private no está expuesto por PostgREST");

  const anonRead = await request("/rest/v1/clientes?select=id");
  expectDenied(anonRead, "anon lee clientes");
  const anonDirectory = await request("/rest/v1/rpc/client_responsibles", { method: "POST", body: {} });
  expectDenied(anonDirectory, "anon consulta responsables");
  pass("anon rechazado por API");

  const adminDirectory = expectOk(await request("/rest/v1/rpc/client_responsibles", {
    method: "POST", token: identities.admin.token, body: {},
  }), "directorio admin");
  assert.ok(adminDirectory.some((row) => row.id === identities.admin.id && row.can_assign));
  assert.ok(adminDirectory.some((row) => row.id === identities.manager.id && row.can_assign));
  assert.equal(adminDirectory.filter((row) => row.nombres === "Alex" && row.apellidos === "Rivera").length, 2);
  assert.ok(adminDirectory.some((row) => row.id === identities.incomplete.id && !row.can_assign));
  pass("directorio distingue homónimos e incompletos por UUID");

  const assigned = await insertClient(identities.admin.token, {
    responsable: "Texto manipulado",
    responsable_id: identities.seller.id,
  });
  assert.equal(assigned.responsable_id, identities.seller.id);
  assert.equal(assigned.responsable, "Sara Prueba");
  const reassigned = expectOk(await patchClient(identities.manager.token, assigned.id, {
    responsable_id: identities.admin.id,
  }), "Gerente reasigna");
  assert.equal(reassigned[0].responsable_id, identities.admin.id);
  assert.equal(reassigned[0].responsable, "Sara Prueba");
  pass("Administrador y Gerente asignan por UUID sin reescribir histórico");

  const sellerOwn = await insertClient(identities.seller.token, { responsable_id: identities.seller.id });
  assert.equal(sellerOwn.responsable_id, identities.seller.id);
  expectDenied(await request("/rest/v1/clientes", {
    method: "POST", token: identities.seller.token,
    body: { nombres: "Fixture", apellidos: "Prohibido", correo: `${crypto.randomUUID()}@example.invalid`, telefono: "999123456", responsable_id: identities.admin.id },
  }), "Vendedor asigna otro UUID");
  pass("Vendedor sólo se asigna a sí mismo");

  for (const [label, responsableId] of [
    ["inexistente", crypto.randomUUID()],
    ["malformado", "UUID-invalido"],
    ["inactivo", identities.inactive.id],
    ["incompleto", identities.incomplete.id],
  ]) {
    const denied = await request("/rest/v1/clientes", {
      method: "POST", token: identities.admin.token,
      body: { nombres: "Fixture", apellidos: "Invalido", correo: `${crypto.randomUUID()}@example.invalid`, telefono: "999123456", responsable_id: responsableId },
    });
    expectDenied(denied, `UUID ${label}`);
  }
  pass("UUID inexistente, malformado, inactivo e incompleto rechazados");

  const historical = expectOk(await request("/rest/v1/clientes?correo=eq.carlos.mendoza%40example.com&select=id,responsable,responsable_id,notas", {
    token: identities.seller.token,
  }), "Ana histórica");
  assert.equal(historical.length, 1);
  assert.equal(historical[0].responsable, "Ana García");
  assert.equal(historical[0].responsable_id, null);
  const historicalEdit = expectOk(await patchClient(identities.seller.token, historical[0].id, { notas: "Edición API local" }), "editar histórico");
  assert.equal(historicalEdit[0].responsable, "Ana García");
  assert.equal(historicalEdit[0].responsable_id, null);
  pass("Ana García conserva texto y UUID NULL por API");

  runSql(`update public.profiles set activo=true where id=${sqlLiteral(identities.inactive.id)}::uuid;`);
  const inactiveHistorical = await insertClient(identities.admin.token, { responsable_id: identities.inactive.id });
  runSql(`update public.profiles set activo=false where id=${sqlLiteral(identities.inactive.id)}::uuid;`);
  const inactiveContext = expectOk(await request("/rest/v1/rpc/client_responsibles", {
    method: "POST", token: identities.admin.token, body: { p_client_id: inactiveHistorical.id },
  }), "histórico inactivo");
  assert.ok(inactiveContext.some((row) => row.id === identities.inactive.id && !row.activo && !row.can_assign));

  runSql(`update public.profiles set nombres='Ines', apellidos='Completa' where id=${sqlLiteral(identities.incomplete.id)}::uuid;`);
  const incompleteHistorical = await insertClient(identities.admin.token, { responsable_id: identities.incomplete.id });
  runSql(`update public.profiles set nombres='', apellidos='Pendiente' where id=${sqlLiteral(identities.incomplete.id)}::uuid;`);
  const incompleteContext = expectOk(await request("/rest/v1/rpc/client_responsibles", {
    method: "POST", token: identities.admin.token, body: { p_client_id: incompleteHistorical.id },
  }), "histórico incompleto");
  assert.ok(incompleteContext.some((row) => row.id === identities.incomplete.id && !row.can_assign));
  pass("históricos inactivo e incompleto visibles pero no asignables");

  const inactiveRead = await request("/rest/v1/clientes?select=id", { token: identities.inactive.token });
  expectOk(inactiveRead, "RLS inactivo", [200]);
  assert.deepEqual(inactiveRead.data, []);
  expectDenied(await request("/rest/v1/rpc/client_responsibles", {
    method: "POST", token: identities.inactive.token, body: {},
  }), "directorio inactivo");
  pass("usuario Auth inactivo no obtiene datos ni directorio");

  const lead = await insertLead(identities.manager.token, {
    correo: `${crypto.randomUUID()}@example.invalid`, responsable_id: identities.seller.id,
  });
  const conversion = expectOk(await request("/rest/v1/rpc/convert_lead", {
    method: "POST", token: identities.manager.token, body: { p_lead_id: lead.id },
  }), "convertir lead");
  assert.equal(conversion[0].resultado, "creado");
  createdClientIds.push(uuid(conversion[0].cliente_id));
  const repeated = expectOk(await request("/rest/v1/rpc/convert_lead", {
    method: "POST", token: identities.manager.token, body: { p_lead_id: lead.id },
  }), "repetir conversión");
  assert.equal(repeated[0].resultado, "ya_convertido");
  assert.equal(repeated[0].cliente_id, conversion[0].cliente_id);
  pass("Lead → Cliente por RPC HTTP es idempotente");

  const sameLead = await insertLead(identities.manager.token, {
    correo: `${crypto.randomUUID()}@example.invalid`, responsable_id: identities.seller.id,
  });
  const sameLeadResults = await Promise.all([1, 2].map(() => request("/rest/v1/rpc/convert_lead", {
    method: "POST", token: identities.manager.token, body: { p_lead_id: sameLead.id },
  })));
  sameLeadResults.forEach((result, index) => expectOk(result, `conversión concurrente mismo lead ${index}`));
  const sameLeadRows = sameLeadResults.map((result) => result.data[0]);
  assert.deepEqual(new Set(sameLeadRows.map((row) => row.cliente_id)).size, 1);
  assert.deepEqual(new Set(sameLeadRows.map((row) => row.resultado)), new Set(["creado", "ya_convertido"]));
  createdClientIds.push(uuid(sameLeadRows[0].cliente_id));
  pass("dos conversiones simultáneas del mismo lead se serializan");

  const sharedEmail = `${crypto.randomUUID()}@example.invalid`;
  const leadA = await insertLead(identities.manager.token, { correo: sharedEmail, responsable_id: identities.seller.id });
  const leadB = await insertLead(identities.manager.token, { correo: sharedEmail, responsable_id: identities.seller.id });
  const sharedResults = await Promise.all([leadA, leadB].map((source) => request("/rest/v1/rpc/convert_lead", {
    method: "POST", token: identities.manager.token, body: { p_lead_id: source.id },
  })));
  sharedResults.forEach((result, index) => expectOk(result, `conversión concurrente correo ${index}`));
  const sharedRows = sharedResults.map((result) => result.data[0]);
  assert.deepEqual(new Set(sharedRows.map((row) => row.cliente_id)).size, 1);
  assert.deepEqual(new Set(sharedRows.map((row) => row.resultado)), new Set(["creado", "requiere_vinculo"]));
  createdClientIds.push(uuid(sharedRows[0].cliente_id));
  pass("dos conversiones simultáneas del mismo correo no duplican Cliente");

  const raceClient = await insertClient(identities.admin.token, { responsable_id: identities.admin.id });
  let locker = startLockedProfileChange(identities.seller.id, "activo=false");
  await delay(350);
  const inactiveRace = await patchClient(identities.admin.token, raceClient.id, { responsable_id: identities.seller.id });
  await waitProcess(locker);
  expectDenied(inactiveRace, "asignación concurrente con desactivación");
  runSql(`update public.profiles set activo=true where id=${sqlLiteral(identities.seller.id)}::uuid;`);

  locker = startLockedProfileChange(identities.seller.id, "apellidos='' ");
  await delay(350);
  const incompleteRace = await patchClient(identities.admin.token, raceClient.id, { responsable_id: identities.seller.id });
  await waitProcess(locker);
  expectDenied(incompleteRace, "asignación concurrente con perfil incompleto");
  runSql(`update public.profiles set apellidos='Prueba' where id=${sqlLiteral(identities.seller.id)}::uuid;`);
  pass("asignación espera locks y rechaza desactivación/nombre incompleto concurrentes");

  console.log(results.join("\n"));
  console.log(`PASS TOTAL ${results.length}`);
} finally {
  const cleanupSteps = [
    () => createdLeadIds.length && runSql(`delete from public.leads where id = any(array[${createdLeadIds.map((id) => `${sqlLiteral(id)}::uuid`).join(",")}]);`),
    () => createdClientIds.length && runSql(`delete from public.clientes where id = any(array[${[...new Set(createdClientIds)].map((id) => `${sqlLiteral(id)}::uuid`).join(",")}]);`),
    () => runSql("begin; alter table public.clientes disable trigger clientes_prepare_responsible; update public.clientes set notas='' where correo='carlos.mendoza@example.com'; alter table public.clientes enable trigger clientes_prepare_responsible; commit;"),
    () => createdUserIds.length && runSql(`delete from auth.users where id = any(array[${createdUserIds.map((id) => `${sqlLiteral(id)}::uuid`).join(",")}]);`),
  ];
  for (const cleanup of cleanupSteps) {
    try { cleanup(); } catch (cleanupError) {
      console.error("CLEANUP FAILED", cleanupError);
      process.exitCode = 1;
    }
  }
}
