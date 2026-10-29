import assert from "node:assert/strict";
import { test } from "node:test";
import { CLIENT_RESPONSIBLES_UUID_ENABLED, assertClientResponsiblesEnabled, localResponsiblesPreviewAllowed } from "../../src/features/clients/responsibles-activation.ts";
import { clientInitialValues, normalizeClientInput, validateClient, validateClientContact } from "../../src/features/clients/client-validation.ts";

test("el acceso real UUID permanece cerrado por defecto y admite composición explícita revisada", () => {
  assert.equal(CLIENT_RESPONSIBLES_UUID_ENABLED, false);
  assert.throws(() => assertClientResponsiblesEnabled(), /todavía no están habilitadas/);
  assert.doesNotThrow(() => assertClientResponsiblesEnabled(true));
});

test("los mocks requieren flag explícito y ambos extremos loopback", () => {
  const local = { flag: "enabled", supabaseUrl: "http://127.0.0.1:54321", requestHost: "127.0.0.1:3100" };
  assert.equal(localResponsiblesPreviewAllowed(local), true);
  assert.equal(localResponsiblesPreviewAllowed({ ...local, supabaseUrl: "http://localhost:54321/", requestHost: "localhost:3100" }), true);
  assert.equal(localResponsiblesPreviewAllowed({ ...local, supabaseUrl: "http://[::1]:54321", requestHost: "[::1]:3100" }), true);
  for (const flag of [undefined, "false", "true", "disabled"]) assert.equal(localResponsiblesPreviewAllowed({ ...local, flag }), false);
  for (const supabaseUrl of [undefined, "https://project.supabase.co", "http://127.0.0.1.evil.test", "http://localhost@evil.test", "http://user:secret@localhost", "http://localhost/path", "http://localhost?enabled=true", "file://localhost"]) assert.equal(localResponsiblesPreviewAllowed({ ...local, supabaseUrl }), false);
  for (const requestHost of [undefined, "app.example.test", "localhost.evil.test", "user:pass@localhost", "localhost/path"]) assert.equal(localResponsiblesPreviewAllowed({ ...local, requestHost }), false);
});

const contact = { firstName: "Contacto", lastName: "Prueba", company: "", position: "", status: "Activo", email: "contacto@example.test", phone: "999123456", address: "", notes: "" };

test("el alta heredada comienza pendiente, sin identidad de demostración", () => {
  assert.equal(clientInitialValues().owner, "Sin asignar");
  assert.deepEqual(validateClient({ ...contact, owner: "Sin asignar" }, []), {});
  assert.ok(validateClient({ ...contact, owner: "Ana García" }, []).owner);
});

test("editar contacto conserva cualquier texto histórico exacto, sin exigir un nombre demo", () => {
  const client = { id: "11111111-1111-4111-8111-111111111111", ...contact, owner: "  Histórico sin perfil  ", ownerId: null };
  const input = normalizeClientInput({ ...contact, owner: client.owner });
  assert.equal(input.owner, client.owner);
  assert.deepEqual(validateClient(input, [client], client.id), {});
  assert.ok(validateClient({ ...input, owner: "Otra identidad" }, [client], client.id).owner);
});

test("la validación de contacto es independiente de la identidad histórica", () => {
  assert.deepEqual(validateClientContact(contact, []), {});
  assert.ok(validateClientContact({ ...contact, phone: "invalido" }, []).phone);
});
