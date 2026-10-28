import type { Page } from "@playwright/test";
import type { Client, ClientContactInput, ClientResponsible } from "../../src/features/clients/types";
import type { UserRole } from "../../src/features/auth/roles";
import type { ClientUpdateRequest } from "../../src/features/clients/client-write";
import { assertResponsibleChange } from "../../src/features/clients/responsible-contract";
import { actorFixture, clientFixture, CLIENT_RESPONSIBLE_IDS, RESPONSIBLE_FIXTURES } from "./client-responsibles-fixtures";

export type ResponsibleScenario = "create" | "historical" | "linked" | "inactive" | "incomplete";
export type MockSave = { kind: "create"; input: ClientContactInput & { ownerId: string } } | { kind: "update"; request: ClientUpdateRequest };

export async function mockClientResponsibles(page: Page, options: {
  scenario?: ResponsibleScenario;
  role?: UserRole;
  directoryError?: string;
  empty?: boolean;
  holdDirectory?: boolean;
  saveError?: string;
  saveStatus?: number;
} = {}) {
  const scenario = options.scenario ?? "create";
  const actor = actorFixture(options.role);
  const linked = scenario === "linked" ? CLIENT_RESPONSIBLE_IDS.duplicateA : scenario === "inactive" ? CLIENT_RESPONSIBLE_IDS.inactive : scenario === "incomplete" ? CLIENT_RESPONSIBLE_IDS.incomplete : null;
  const current = scenario === "create" ? null : clientFixture({
    ownerId: linked,
    owner: scenario === "inactive" ? "Inactivo Prueba" : scenario === "incomplete" ? "Nombre histórico incompleto" : scenario === "linked" ? "Homónimo Prueba" : "Ana García",
  });
  let releaseDirectory = () => {};
  const directoryGate = options.holdDirectory ? new Promise<void>((resolve) => { releaseDirectory = resolve; }) : Promise.resolve();
  const state = {
    client: current as Client | null,
    saves: [] as MockSave[],
    successfulSaves: [] as MockSave[],
    directoryCalls: 0,
    directoryError: options.directoryError ?? null,
    empty: options.empty ?? false,
    saveError: options.saveError ?? null,
    saveStatus: options.saveStatus ?? 503,
    releaseDirectory,
  };

  function directory(): ClientResponsible[] {
    if (state.empty) return [];
    return RESPONSIBLE_FIXTURES.filter((person) => {
      const historicallyLinked = state.client?.ownerId === person.id;
      return historicallyLinked || (person.activo && (actor.rol !== "Vendedor" || person.id === actor.id));
    }).map((person) => ({ ...person, can_assign: person.can_assign && (actor.rol !== "Vendedor" || person.id === actor.id) }));
  }

  await page.route("**/__test/client-responsibles/context**", (route) => route.fulfill({ json: { actor, client: state.client } }));
  await page.route("**/__test/client-responsibles/directory**", async (route) => {
    state.directoryCalls++;
    await directoryGate;
    if (state.directoryError) return route.fulfill({ status: 503, json: { error: state.directoryError, message: state.directoryError } });
    return route.fulfill({ json: directory() });
  });
  await page.route("**/__test/client-responsibles/save", (route) => {
    const payload = route.request().postDataJSON() as MockSave;
    state.saves.push(payload);
    if (state.saveError) return route.fulfill({ status: state.saveStatus, json: { error: state.saveError, message: state.saveError } });
    try {
      if (payload.kind === "create") {
        const chosen = assertResponsibleChange(actor, { currentOwnerId: undefined, nextOwnerId: payload.input.ownerId, responsibles: directory() });
        const person = RESPONSIBLE_FIXTURES.find((entry) => entry.id === chosen)!;
        state.client = clientFixture({ ...payload.input, id: "11111111-1111-4111-8111-111111111112", name: `${payload.input.firstName} ${payload.input.lastName}`, ownerId: chosen, owner: `${person.nombres} ${person.apellidos}` });
      } else {
        if (!state.client || payload.request.id !== state.client.id || payload.request.expectedUpdatedAt !== state.client.updatedAt) {
          return route.fulfill({ status: 409, json: { error: "El cliente cambió. Recarga antes de volver a guardar.", message: "El cliente cambió. Recarga antes de volver a guardar." } });
        }
        let ownerId = state.client.ownerId;
        if (Object.hasOwn(payload.request, "responsableId")) ownerId = assertResponsibleChange(actor, {
          currentOwnerId: state.client.ownerId,
          nextOwnerId: payload.request.responsableId ?? null,
          responsibles: directory(),
        });
        state.client = { ...state.client, ...payload.request.contact, ownerId, updatedAt: "2026-10-22T12:00:00.123457+00:00" };
      }
      state.successfulSaves.push(payload);
      return route.fulfill({ json: state.client });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Asignación no autorizada.";
      return route.fulfill({ status: 403, json: { error: message, message } });
    }
  });

  return state;
}
