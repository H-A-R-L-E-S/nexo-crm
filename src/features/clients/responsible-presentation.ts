import { assertResponsibleChange, isResponsibleEligible } from "./responsible-contract.ts";
import type { ClientActor, ClientResponsible } from "./types";

export function responsibleName(person: ClientResponsible): string {
  return [person.nombres.trim(), person.apellidos.trim()].filter(Boolean).join(" ") || "Perfil sin nombre";
}

export function responsibleOptionState(person: ClientResponsible): string {
  const states = [person.activo ? "Activo" : "Inactivo"];
  if (!person.nombres.trim() || !person.apellidos.trim()) states.push("Perfil incompleto");
  return states.join(" · ");
}

export function canSelectResponsible(
  actor: ClientActor,
  person: ClientResponsible,
  currentOwnerId: string | null | undefined,
): boolean {
  if (!person.can_assign || !isResponsibleEligible(person)) return false;
  try {
    assertResponsibleChange(actor, { currentOwnerId, nextOwnerId: person.id, responsibles: [person] });
    return true;
  } catch {
    return false;
  }
}

function searchText(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es");
}

export function createResponsibleSearchIndex(items: readonly ClientResponsible[]) {
  return items.map((person) => ({
    person,
    text: searchText(`${responsibleName(person)} ${person.rol} ${person.id} ${responsibleOptionState(person)}`),
  }));
}

export function searchResponsibleIndex(index: ReturnType<typeof createResponsibleSearchIndex>, query: string): ClientResponsible[] {
  const terms = searchText(query).trim().split(/\s+/).filter(Boolean);
  return index.filter(({ text }) => terms.every((term) => text.includes(term))).map(({ person }) => person);
}

export function filterResponsibles(items: readonly ClientResponsible[], query: string): ClientResponsible[] {
  return searchResponsibleIndex(createResponsibleSearchIndex(items), query);
}
