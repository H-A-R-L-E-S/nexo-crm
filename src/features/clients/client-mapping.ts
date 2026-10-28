import type { ClientReadRow } from "../../lib/supabase/database.types";
import type { Client } from "./types";

export function toClient(row: ClientReadRow): Client {
  return {
    id: row.id, firstName: row.nombres, lastName: row.apellidos,
    name: `${row.nombres} ${row.apellidos}`.trim(), company: row.empresa,
    email: row.correo, phone: row.telefono, position: row.cargo,
    status: row.estado, address: row.direccion, notes: row.notas,
    owner: row.responsable, ownerId: row.responsable_id ?? null,
    lastContact: row.ultimo_contacto, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
