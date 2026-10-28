import assert from "node:assert/strict";
import { test } from "node:test";
import { canSelectResponsible, createResponsibleSearchIndex, filterResponsibles, responsibleName, responsibleOptionState, searchResponsibleIndex } from "../../src/features/clients/responsible-presentation.ts";

const actor = { id: "00000000-0000-4000-8000-000000000001", rol: "Administrador", activo: true };
const first = { id: "00000000-0000-4000-8000-000000000003", nombres: "José", apellidos: "Prueba", rol: "Vendedor", activo: true, can_assign: true };
const duplicate = { ...first, id: "00000000-0000-4000-8000-000000000004" };

test("presenta nombres existentes y un diagnóstico cuando falta identidad nominal", () => {
  assert.equal(responsibleName({ ...first, nombres: "  José  ", apellidos: "  Prueba  " }), "José Prueba");
  assert.equal(responsibleName({ ...first, nombres: "", apellidos: "Prueba" }), "Prueba");
  assert.equal(responsibleName({ ...first, nombres: "\u00a0", apellidos: "\ufeff" }), "Perfil sin nombre");
});

test("el estado diferencia actividad de perfil completo sin esconder ninguno", () => {
  assert.equal(responsibleOptionState(first), "Activo");
  assert.equal(responsibleOptionState({ ...first, activo: false }), "Inactivo");
  assert.equal(responsibleOptionState({ ...first, nombres: "", activo: false }), "Inactivo · Perfil incompleto");
  assert.equal(responsibleOptionState({ ...first, apellidos: "" }), "Activo · Perfil incompleto");
});

test("la búsqueda ignora acentos y mayúsculas sin fusionar homónimos ni resolver por nombre", () => {
  const items = [first, duplicate];
  assert.deepEqual(filterResponsibles(items, "JOSE PRUEBA"), items);
  assert.equal(items[0].nombres, "José");
  assert.deepEqual(filterResponsibles(items, duplicate.id), [duplicate]);
  assert.deepEqual(filterResponsibles(items, "vendedor jose"), items);
  assert.deepEqual(filterResponsibles(items, "gerente jose"), []);
});

test("búsqueda vacía conserva orden, identidades y diagnósticos de todos los perfiles", () => {
  const incomplete = { ...first, id: "00000000-0000-4000-8000-000000000005", nombres: "", apellidos: "", activo: false, can_assign: false };
  const items = [duplicate, first, incomplete];
  assert.deepEqual(filterResponsibles(items, " \t\u00a0 "), items);
  assert.deepEqual(filterResponsibles(items, "inactivo incompleto"), [incomplete]);
  assert.equal(filterResponsibles(items, "jose")[0], duplicate);
});

test("el índice busca en todo el directorio aunque la vista limite sus resultados visibles", () => {
  const items = Array.from({ length: 250 }, (_, index) => ({ ...first, id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, apellidos: `Prueba ${index}` }));
  const index = createResponsibleSearchIndex(items);
  assert.deepEqual(searchResponsibleIndex(index, items[249].id), [items[249]]);
  assert.equal(searchResponsibleIndex(index, "prueba").length, 250);
  assert.equal(items[249].apellidos, "Prueba 249");
});

for (const rol of ["Administrador", "Gerente"]) {
  test(`${rol}: candidatos nuevos dependen de elegibilidad y capacidad recibida`, () => {
    const currentActor = { ...actor, rol };
    assert.equal(canSelectResponsible(currentActor, first, undefined), true);
    assert.equal(canSelectResponsible(currentActor, { ...first, can_assign: false }, undefined), false);
    assert.equal(canSelectResponsible(currentActor, { ...first, activo: false }, undefined), false);
    assert.equal(canSelectResponsible(currentActor, { ...first, nombres: "" }, undefined), false);
    assert.equal(canSelectResponsible(currentActor, { ...first, apellidos: "\u00a0" }, undefined), false);
  });
}

test("Vendedor: opciones de alta limitadas a su UUID y sin apropiarse de un legado", () => {
  const seller = { id: first.id, rol: "Vendedor", activo: true };
  assert.equal(canSelectResponsible(seller, first, undefined), true);
  assert.equal(canSelectResponsible(seller, duplicate, undefined), false);
  assert.equal(canSelectResponsible(seller, first, null), false);
  assert.equal(canSelectResponsible(seller, duplicate, first.id), false);
});

test("un actor inactivo, rol ajeno o UUID inválido no obtiene opciones elegibles", () => {
  for (const invalid of [{ ...actor, activo: false }, { ...actor, rol: "Otro" }, { ...actor, id: "no-es-un-uuid" }]) {
    assert.equal(canSelectResponsible(invalid, first, undefined), false);
  }
});

test("un vínculo histórico inactivo o incompleto se conserva aparte de las nuevas opciones", () => {
  for (const current of [{ ...first, activo: false, can_assign: false }, { ...first, nombres: "", can_assign: false }]) {
    assert.equal(canSelectResponsible(actor, current, current.id), false);
  }
});
