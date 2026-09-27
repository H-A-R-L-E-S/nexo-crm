import { getSupabaseClient } from "@/lib/supabase/client";
import type { Client, ClientInput, ClientStatus } from "../types";

type ClientRow = {
  id: string; nombres: string; apellidos: string; empresa: string; correo: string;
  telefono: string; cargo: string; estado: ClientStatus; direccion: string;
  notas: string; responsable: string; ultimo_contacto: string | null;
  created_at: string; updated_at: string;
};

function toClient(row: ClientRow): Client {
  return {
    id: row.id, firstName: row.nombres, lastName: row.apellidos,
    name: `${row.nombres} ${row.apellidos}`.trim(), company: row.empresa,
    email: row.correo, phone: row.telefono, position: row.cargo,
    status: row.estado, address: row.direccion, notes: row.notas,
    owner: row.responsable, lastContact: row.ultimo_contacto,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function toRow(input: ClientInput) {
  return {
    nombres: input.firstName, apellidos: input.lastName, empresa: input.company,
    correo: input.email, telefono: input.phone, cargo: input.position,
    estado: input.status, direccion: input.address, notas: input.notes,
    responsable: input.owner,
  };
}

function fail(message: string, error: { code?: string; message: string }): never {
  if (error.code === "23505") throw new Error("Ya existe un cliente con este correo electrónico.");
  throw new Error(`${message}: ${error.message}`);
}

export async function getClientes(): Promise<Client[]> {
  const clients: Client[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await getSupabaseClient().from("clientes").select("*").order("created_at", { ascending: false }).order("id").range(offset, offset + pageSize - 1);
    if (error) fail("No se pudieron cargar los clientes", error);
    const rows = data as ClientRow[];
    clients.push(...rows.map(toClient));
    if (rows.length < pageSize) return clients;
  }
}

export async function getClienteById(id: string): Promise<Client | null> {
  const { data, error } = await getSupabaseClient().from("clientes").select("*").eq("id", id).maybeSingle();
  if (error) fail("No se pudo cargar el cliente", error);
  return data ? toClient(data as ClientRow) : null;
}

export async function createCliente(input: ClientInput): Promise<Client> {
  const { data, error } = await getSupabaseClient().from("clientes").insert(toRow(input)).select("*").single();
  if (error) fail("No se pudo crear el cliente", error);
  return toClient(data as ClientRow);
}

export async function updateCliente(id: string, input: ClientInput): Promise<Client> {
  const { data, error } = await getSupabaseClient().from("clientes").update(toRow(input)).eq("id", id).select("*").single();
  if (error) fail("No se pudo actualizar el cliente", error);
  return toClient(data as ClientRow);
}

export async function deleteCliente(id: string): Promise<void> {
  const { data, error } = await getSupabaseClient().from("clientes").delete().eq("id", id).select("id");
  if (error) fail("No se pudo eliminar el cliente", error);
  if (!data?.length) throw new Error("No se encontró el cliente para eliminar.");
}
