import type { Client, ClientActor, ClientResponsible } from "../../src/features/clients/types";
import type { UserRole } from "../../src/features/auth/roles";

export const CLIENT_RESPONSIBLE_IDS = {
  admin: "00000000-0000-4000-8000-000000000001",
  manager: "00000000-0000-4000-8000-000000000002",
  seller: "00000000-0000-4000-8000-000000000003",
  duplicateA: "00000000-0000-4000-8000-000000000004",
  duplicateB: "00000000-0000-4000-8000-000000000005",
  inactive: "00000000-0000-4000-8000-000000000006",
  incomplete: "00000000-0000-4000-8000-000000000007",
  client: "11111111-1111-4111-8111-111111111111",
} as const;

export const RESPONSIBLE_FIXTURES: readonly ClientResponsible[] = [
  { id: CLIENT_RESPONSIBLE_IDS.admin, nombres: "Carlos", apellidos: "Prueba", rol: "Administrador", activo: true, can_assign: true },
  { id: CLIENT_RESPONSIBLE_IDS.manager, nombres: "Lucía", apellidos: "Prueba", rol: "Gerente", activo: true, can_assign: true },
  { id: CLIENT_RESPONSIBLE_IDS.seller, nombres: "Diego", apellidos: "Prueba", rol: "Vendedor", activo: true, can_assign: true },
  { id: CLIENT_RESPONSIBLE_IDS.duplicateA, nombres: "Homónimo", apellidos: "Prueba", rol: "Vendedor", activo: true, can_assign: true },
  { id: CLIENT_RESPONSIBLE_IDS.duplicateB, nombres: "Homónimo", apellidos: "Prueba", rol: "Vendedor", activo: true, can_assign: true },
  { id: CLIENT_RESPONSIBLE_IDS.inactive, nombres: "Inactivo", apellidos: "Prueba", rol: "Vendedor", activo: false, can_assign: false },
  { id: CLIENT_RESPONSIBLE_IDS.incomplete, nombres: "", apellidos: "", rol: "Vendedor", activo: true, can_assign: false },
];

export function actorFixture(rol: UserRole = "Administrador"): ClientActor {
  const ids = { Administrador: CLIENT_RESPONSIBLE_IDS.admin, Gerente: CLIENT_RESPONSIBLE_IDS.manager, Vendedor: CLIENT_RESPONSIBLE_IDS.seller };
  return { id: ids[rol], rol, activo: true };
}

export function clientFixture(overrides: Partial<Client> = {}): Client {
  return {
    id: CLIENT_RESPONSIBLE_IDS.client,
    name: "Cliente Prueba",
    firstName: "Cliente",
    lastName: "Prueba",
    company: "Empresa de prueba local",
    email: "cliente-responsables@example.test",
    phone: "999123456",
    status: "Activo",
    owner: "Ana García",
    ownerId: null,
    position: "Contacto comercial",
    address: "Lima",
    notes: "Fixture en memoria. No representa un cliente de producción.",
    lastContact: null,
    createdAt: "2026-10-22T12:00:00.123456+00:00",
    updatedAt: "2026-10-22T12:00:00.123456+00:00",
    ...overrides,
  };
}
