import type { ClientRow } from "../../lib/supabase/database.types";
import type { ClientContactInput } from "./types";
import { clientUuid } from "./responsible-contract.ts";

const contactColumns = {
  firstName: "nombres", lastName: "apellidos", company: "empresa", email: "correo",
  phone: "telefono", status: "estado", position: "cargo", address: "direccion", notes: "notas",
} as const;

export type ClientContactRowPatch = Partial<Pick<ClientRow, typeof contactColumns[keyof typeof contactColumns]>>;
export type ClientChanges = ClientContactRowPatch & { responsable_id?: string };
export type ClientUpdateRequest = {
  id: string;
  expectedUpdatedAt: string;
  contact: Partial<ClientContactInput>;
  responsableId?: string;
};
export type ClientUpdatePort = {
  update: (id: string, expectedUpdatedAt: string, changes: ClientChanges) => Promise<ClientRow | null>;
};

export class ClientConflictError extends Error {
  constructor() {
    super("El cliente cambió o ya no está disponible. Recarga antes de volver a guardar.");
    this.name = "ClientConflictError";
  }
}

export function clientContactChanges(contact: Partial<ClientContactInput>): ClientContactRowPatch {
  const changes: Record<string, string> = {};
  if (!contact || typeof contact !== "object" || Array.isArray(contact)) throw new Error("Los cambios de contacto no son válidos.");
  for (const [key, value] of Object.entries(contact)) {
    if (!Object.hasOwn(contactColumns, key) || typeof value !== "string") throw new Error("El cambio contiene campos de cliente no permitidos.");
    if (key === "status" && !["Activo", "Prospecto", "Inactivo"].includes(value)) throw new Error("El estado del cliente no es válido.");
    changes[contactColumns[key as keyof ClientContactInput]] = value;
  }
  return changes as ClientContactRowPatch;
}

export function buildClientUpdate(request: ClientUpdateRequest) {
  const id = clientUuid(request.id);
  if (typeof request.expectedUpdatedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(request.expectedUpdatedAt) || !Number.isFinite(Date.parse(request.expectedUpdatedAt))) {
    throw new Error("Se necesita la versión original updated_at del cliente.");
  }
  const changes: ClientChanges = clientContactChanges(request.contact);
  if (Object.hasOwn(request, "responsableId")) changes.responsable_id = clientUuid(request.responsableId);
  if (!Object.keys(changes).length) throw new Error("No hay cambios para guardar.");
  return { id, expectedUpdatedAt: request.expectedUpdatedAt, changes: changes as ClientChanges };
}

export async function applyClientUpdate(port: ClientUpdatePort, request: ClientUpdateRequest): Promise<ClientRow> {
  const { id, expectedUpdatedAt, changes } = buildClientUpdate(request);
  const row = await port.update(id, expectedUpdatedAt, changes);
  if (!row) throw new ClientConflictError();
  return row;
}
