import assert from "node:assert/strict";
import { test } from "node:test";
import { assertResponsibleChange, isResponsibleEligible } from "../../src/features/clients/responsible-contract.ts";
import { applyClientUpdate, buildClientUpdate, ClientConflictError } from "../../src/features/clients/client-write.ts";
import { toClient } from "../../src/features/clients/client-mapping.ts";

const ids = {
  admin: "00000000-0000-4000-8000-000000000001",
  manager: "00000000-0000-4000-8000-000000000002",
  seller: "00000000-0000-4000-8000-000000000003",
  other: "00000000-0000-4000-8000-000000000004",
  customer: "00000000-0000-4000-8000-000000000005",
};
const version = "2026-10-22T12:00:00.123456+00:00";
const nextVersion = "2026-10-22T12:00:00.123457+00:00";

function person(overrides = {}) {
  return { id: ids.seller, nombres: "Perfil", apellidos: "De prueba", activo: true, rol: "Vendedor", can_assign: true, ...overrides };
}

function actor(rol = "Administrador", overrides = {}) {
  const id = rol === "Administrador" ? ids.admin : rol === "Gerente" ? ids.manager : ids.seller;
  return { id, rol, activo: true, ...overrides };
}

function change(overrides = {}) {
  return { currentOwnerId: undefined, nextOwnerId: ids.seller, responsibles: [person()], ...overrides };
}

function row(overrides = {}) {
  return {
    id: ids.customer, nombres: "Cliente", apellidos: "De prueba", empresa: "",
    correo: "fixture@example.invalid", telefono: "999123456", cargo: "", estado: "Prospecto",
    direccion: "", notas: "Notas originales", responsable: "Ana García", responsable_id: null,
    ultimo_contacto: null, created_at: version, updated_at: version, ...overrides,
  };
}

for (const rol of ["Administrador", "Gerente", "Vendedor"]) {
  test(`un perfil activo completo del rol ${rol} es elegible`, () => {
    assert.equal(isResponsibleEligible(person({ rol })), true);
  });
}

for (const [label, overrides] of [
  ["inactivo", { activo: false }],
  ["sin nombres", { nombres: "" }],
  ["sin apellidos", { apellidos: "" }],
  ["nombres de espacios", { nombres: " \t\n " }],
  ["apellidos de espacios", { apellidos: " \t " }],
  ["nombres NBSP", { nombres: "\u00a0" }],
  ["apellidos BOM", { apellidos: "\ufeff" }],
  ["nombres con espacios Unicode", { nombres: "\u2003\u202f\u2007\u3000" }],
  ["nombres con NBSP y BOM", { nombres: " \u00a0\ufeff\t" }],
  ["rol ajeno", { rol: "Otro" }],
]) {
  test(`un perfil ${label} no puede recibir una asignación nueva`, () => {
    const target = person(overrides);
    assert.equal(isResponsibleEligible(target), false);
    assert.throws(() => assertResponsibleChange(actor(), change({ responsibles: [target] })));
  });
}

for (const rol of ["Administrador", "Gerente"]) {
  test(`${rol} elige y cambia un responsable por UUID conservando identidades duplicadas`, () => {
    const duplicateNames = [person(), person({ id: ids.other })];
    assert.equal(assertResponsibleChange(actor(rol), change({ responsibles: duplicateNames })), ids.seller);
    assert.equal(assertResponsibleChange(actor(rol), change({
      currentOwnerId: ids.seller, nextOwnerId: ids.other, responsibles: duplicateNames,
    })), ids.other);
  });

  test(`${rol} no vacía una referencia existente`, () => {
    assert.throws(() => assertResponsibleChange(actor(rol), change({ currentOwnerId: ids.seller, nextOwnerId: null })));
  });

  test(`${rol} puede vincular explícitamente un histórico NULL`, () => {
    assert.equal(assertResponsibleChange(actor(rol), change({ currentOwnerId: null })), ids.seller);
  });
}

test("los UUID se comparan y devuelven en su forma canónica", () => {
  const mixedCase = "ABCDEFAB-0000-4000-8000-ABCDEFABCDEF";
  assert.equal(assertResponsibleChange(actor(), change({
    nextOwnerId: mixedCase, responsibles: [person({ id: mixedCase.toLowerCase() })],
  })), mixedCase.toLowerCase());
});

test("un UUID ausente del directorio o no asignable se rechaza", () => {
  assert.throws(() => assertResponsibleChange(actor(), change({ nextOwnerId: ids.other })));
  assert.throws(() => assertResponsibleChange(actor(), change({ responsibles: [person({ can_assign: false })] })));
});

test("un nombre histórico no se interpreta como UUID ni resuelve personas", () => {
  assert.throws(() => assertResponsibleChange(actor(), change({ nextOwnerId: "Ana García" })));
  assert.throws(() => assertResponsibleChange(actor(), change({ nextOwnerId: "uuid-con-error" })));
  assert.throws(() => assertResponsibleChange(actor(), change({ nextOwnerId: null })));
});

test("Vendedor crea solamente con su propio UUID elegible y una elección expresa", () => {
  assert.equal(assertResponsibleChange(actor("Vendedor"), change()), ids.seller);
  assert.throws(() => assertResponsibleChange(actor("Vendedor"), change({
    nextOwnerId: ids.other, responsibles: [person({ id: ids.other })],
  })));
  assert.throws(() => assertResponsibleChange(actor("Vendedor"), change({ nextOwnerId: null })));
});

test("Vendedor no reasigna, no vacía y no se apropia de un histórico NULL", () => {
  for (const entry of [
    change({ currentOwnerId: ids.other }),
    change({ currentOwnerId: ids.seller, nextOwnerId: ids.other }),
    change({ currentOwnerId: ids.seller, nextOwnerId: null }),
    change({ currentOwnerId: null }),
  ]) assert.throws(() => assertResponsibleChange(actor("Vendedor"), entry));
});

for (const rol of ["Administrador", "Gerente", "Vendedor"]) {
  test(`${rol} conserva una referencia histórica inactiva, incompleta o no resuelta`, () => {
    for (const responsibles of [[], [person({ activo: false, can_assign: false })], [person({ nombres: "", can_assign: false })]]) {
      assert.equal(assertResponsibleChange(actor(rol), change({ currentOwnerId: ids.seller, responsibles })), ids.seller);
    }
    assert.equal(assertResponsibleChange(actor(rol), change({ currentOwnerId: null, nextOwnerId: null, responsibles: [] })), null);
  });
}

test("la conservación histórica también exige un actor activo autorizado", () => {
  for (const entry of [actor("Vendedor", { activo: false }), actor("Otro"), actor("Administrador", { id: "sin-UUID" })]) {
    assert.throws(() => assertResponsibleChange(entry, change({ currentOwnerId: ids.seller, responsibles: [] })));
  }
});

test("el mapper lee una fila anterior a la expansión sin inventar responsable_id", () => {
  const oldRow = row();
  delete oldRow.responsable_id;
  const mapped = toClient(oldRow);
  assert.equal(mapped.ownerId, null);
  assert.equal(mapped.owner, "Ana García");
  assert.equal(mapped.updatedAt, version);
});

test("el mapper conserva el texto byte por byte junto a un UUID distinto del nombre histórico", () => {
  const mapped = toClient(row({ responsable: "  Ana García\n", responsable_id: ids.other }));
  assert.equal(mapped.owner, "  Ana García\n");
  assert.equal(mapped.ownerId, ids.other);
  assert.equal(mapped.notes, "Notas originales");
});

test("la actualización de contacto conserva el timestamp con sus seis decimales", () => {
  assert.deepEqual(buildClientUpdate({
    id: ids.customer, expectedUpdatedAt: version, contact: { phone: "999111222", notes: "  Texto original\n" },
  }), {
    id: ids.customer, expectedUpdatedAt: version,
    changes: { telefono: "999111222", notas: "  Texto original\n" },
  });
});

test("el contrato permite UUID expreso y no añade texto histórico al patch", () => {
  assert.deepEqual(buildClientUpdate({
    id: ids.customer, expectedUpdatedAt: version, contact: {}, responsableId: ids.seller,
  }).changes, { responsable_id: ids.seller });
});

for (const key of ["owner", "ownerId", "responsable", "responsable_id", "updatedAt", "updated_at", "id", "__proto__"]) {
  test(`el contacto rechaza la propiedad manipulada ${key}`, () => {
    const contact = JSON.parse(JSON.stringify({ [key]: "valor manipulado" }));
    assert.throws(() => buildClientUpdate({ id: ids.customer, expectedUpdatedAt: version, contact }));
  });
}

test("no se aceptan parches vacíos, estados ajenos ni valores de contacto no textuales", () => {
  for (const contact of [{}, { status: "Desconocido" }, { notes: null }, [], null]) {
    assert.throws(() => buildClientUpdate({ id: ids.customer, expectedUpdatedAt: version, contact }));
  }
});

test("no se permite vaciar ni sustituir un UUID por un nombre en el patch", () => {
  for (const responsableId of [null, undefined, "", "Ana García", "uuid-con-error"]) {
    assert.throws(() => buildClientUpdate({ id: ids.customer, expectedUpdatedAt: version, contact: {}, responsableId }));
  }
});

test("sin una versión original válida no se construye una escritura", () => {
  for (const expectedUpdatedAt of [undefined, "", "2026-10-22", "timestamp-invalido", "2026-10-22T12:00:00.1234567Z"]) {
    assert.throws(() => buildClientUpdate({ id: ids.customer, expectedUpdatedAt, contact: { notes: "Cambio" } }));
  }
});

test("el puerto recibe una única actualización condicionada y devuelve la fila persistida", async () => {
  const calls = [];
  const persisted = row({ telefono: "999111222", updated_at: nextVersion });
  const port = { update: async (...args) => { calls.push(args); return persisted; } };
  const result = await applyClientUpdate(port, {
    id: ids.customer, expectedUpdatedAt: version, contact: { phone: "999111222" },
  });
  assert.equal(result, persisted);
  assert.deepEqual(calls, [[ids.customer, version, { telefono: "999111222" }]]);
});

test("cero filas afectadas produce conflicto sin reintentar una escritura sin condición", async () => {
  let count = 0;
  const port = { update: async () => { count += 1; return null; } };
  await assert.rejects(applyClientUpdate(port, {
    id: ids.customer, expectedUpdatedAt: version, contact: { notes: "Cambio" },
  }), ClientConflictError);
  assert.equal(count, 1);
});

test("los errores de autorización o integridad del puerto se propagan", async () => {
  const rejected = Object.assign(new Error("Asignación no autorizada"), { code: "42501" });
  await assert.rejects(applyClientUpdate({ update: async () => { throw rejected; } }, {
    id: ids.customer, expectedUpdatedAt: version, contact: {}, responsableId: ids.other,
  }), (error) => error === rejected);
});

test("dos guardados con la misma versión conservan UUID y texto del primer resultado", async () => {
  let persisted = row();
  let calls = 0;
  const port = {
    update: async (id, expectedUpdatedAt, changes) => {
      calls += 1;
      if (id !== persisted.id || expectedUpdatedAt !== persisted.updated_at) return null;
      persisted = { ...persisted, ...changes, updated_at: nextVersion };
      return persisted;
    },
  };
  await applyClientUpdate(port, { id: ids.customer, expectedUpdatedAt: version, contact: {}, responsableId: ids.seller });
  await assert.rejects(applyClientUpdate(port, {
    id: ids.customer, expectedUpdatedAt: version, contact: { notes: "Escritura obsoleta" },
  }), ClientConflictError);
  assert.equal(calls, 2);
  assert.equal(persisted.responsable_id, ids.seller);
  assert.equal(persisted.responsable, "Ana García");
  assert.equal(persisted.notas, "Notas originales");
});
