import type { ClientActor, ClientResponsible } from "./types";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const roles = ["Administrador", "Gerente", "Vendedor"];

export function clientUuid(value: unknown): string {
  if (typeof value !== "string" || !uuidPattern.test(value)) throw new Error("El identificador debe ser un UUID válido.");
  return value.toLowerCase();
}

export function isResponsibleEligible(person: ClientResponsible): boolean {
  return person.activo && roles.includes(person.rol) && Boolean(person.nombres.trim()) && Boolean(person.apellidos.trim());
}

export function assertResponsibleChange(
  actor: ClientActor,
  change: { currentOwnerId: string | null | undefined; nextOwnerId: string | null; responsibles: readonly ClientResponsible[] },
): string | null {
  const actorId = clientUuid(actor.id);
  if (!actor.activo || !roles.includes(actor.rol)) throw new Error("Necesitas un perfil activo autorizado.");
  const creating = change.currentOwnerId === undefined;
  const currentId = change.currentOwnerId == null ? null : clientUuid(change.currentOwnerId);
  const nextId = change.nextOwnerId === null ? null : clientUuid(change.nextOwnerId);
  if (!creating && currentId === nextId) return nextId;
  if (actor.rol === "Vendedor" && (!creating || nextId !== actorId)) throw new Error("No tienes permisos para cambiar este responsable.");
  if (nextId === null) throw new Error("Selecciona expresamente un responsable real; no se permite vaciar una referencia.");
  const person = change.responsibles.find((entry) => clientUuid(entry.id) === nextId);
  if (!person || !person.can_assign || !isResponsibleEligible(person)) throw new Error("El responsable debe estar activo y tener su perfil completo.");
  return nextId;
}
