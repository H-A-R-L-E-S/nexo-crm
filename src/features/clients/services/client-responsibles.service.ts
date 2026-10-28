import { getSupabaseClient } from "@/lib/supabase/client";
import type { ClientActor, ClientResponsible, AssignedClientInput } from "../types";
import type { ClientRow, Database } from "@/lib/supabase/database.types";
import { isUserRole } from "@/features/auth/roles";
import { assertResponsibleChange, clientUuid } from "../responsible-contract";
import { applyClientUpdate, clientContactChanges, type ClientUpdateRequest } from "../client-write";
import { toClient } from "../client-mapping";
import { assertClientResponsiblesEnabled } from "../responsibles-activation";

function fail(error: { code?: string; message: string }): never {
  if (error.code === "42501") throw new Error("No tienes permisos para asignar ese responsable.");
  if (error.code === "23503") throw new Error("El responsable o la referencia relacionada ya no existe. Recarga antes de continuar.");
  if (error.code === "23505") throw new Error("Ya existe un cliente con ese correo.");
  if (error.code === "22023" || error.code === "22P02") throw new Error("El responsable debe ser un usuario activo con perfil completo y UUID válido.");
  if (error.code === "40001") throw new Error("El cliente cambió. Recarga antes de volver a guardar.");
  throw new Error("No se pudo completar la operación. Comprueba la sesión y la configuración de Clientes.");
}

async function assignmentActor(): Promise<ClientActor> {
  const supabase = getSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || user.is_anonymous) throw new Error("Necesitas una sesión de usuario válida.");
  const { data: actor, error: actorError } = await supabase.from("profiles").select("id,rol,activo").eq("id", user.id).maybeSingle();
  if (actorError || !actor?.activo || !isUserRole(actor.rol)) throw new Error("Necesitas un perfil activo autorizado.");
  return actor;
}

export async function getClientResponsibles(clientId: string | null = null): Promise<ClientResponsible[]> {
  assertClientResponsiblesEnabled();
  const { data, error } = await getSupabaseClient().rpc("client_responsibles", { p_client_id: clientId === null ? null : clientUuid(clientId) });
  if (error) fail(error);
  return data.map(({ id, nombres, apellidos, activo, rol, can_assign }) => ({ id, nombres, apellidos, activo, rol, can_assign }));
}

// Esta API se conectará al formulario UUID en la siguiente etapa; no usa OWNERS.
export async function createAssignedCliente(input: AssignedClientInput) {
  assertClientResponsiblesEnabled();
  const actor = await assignmentActor();
  const { ownerId, ...contact } = input;
  const selected = assertResponsibleChange(actor, { currentOwnerId: undefined, nextOwnerId: ownerId, responsibles: await getClientResponsibles() });
  const row = { ...clientContactChanges(contact), responsable_id: selected } as Database["public"]["Tables"]["clientes"]["Insert"];
  const { data, error } = await getSupabaseClient().from("clientes").insert(row).select("*").single();
  if (error) fail(error);
  return toClient(data);
}

export async function updateAssignedCliente(request: ClientUpdateRequest) {
  assertClientResponsiblesEnabled();
  const actor = await assignmentActor();
  if (Object.hasOwn(request, "responsableId")) {
    const { data: current, error } = await getSupabaseClient().from("clientes").select("responsable_id").eq("id", clientUuid(request.id)).maybeSingle();
    if (error) fail(error);
    if (!current) throw new Error("No se encontró el cliente autorizado.");
    assertResponsibleChange(actor, { currentOwnerId: current.responsable_id, nextOwnerId: request.responsableId ?? null, responsibles: await getClientResponsibles(request.id) });
  }
  const result = await applyClientUpdate({
    async update(id, expectedUpdatedAt, changes) {
      const { data, error } = await getSupabaseClient().from("clientes").update(changes).eq("id", id).eq("updated_at", expectedUpdatedAt).select("*").maybeSingle();
      if (error) fail(error);
      return data as ClientRow | null;
    },
  }, request);
  return toClient(result);
}
