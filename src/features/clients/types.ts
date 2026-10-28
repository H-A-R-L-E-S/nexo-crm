import type { UserRole } from "../auth/roles";

export type ClientStatus = "Activo" | "Prospecto" | "Inactivo";

export type Client = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  status: ClientStatus;
  owner: string;
  ownerId: string | null;
  position: string;
  address: string;
  notes: string;
  lastContact: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientInput = Pick<
  Client,
  "firstName" | "lastName" | "company" | "email" | "phone" | "status" | "owner" | "position" | "address" | "notes"
>;

export type ClientContactInput = Omit<ClientInput, "owner">;
export type AssignedClientInput = ClientContactInput & { ownerId: string };

export type ClientResponsible = {
  id: string;
  nombres: string;
  apellidos: string;
  activo: boolean;
  rol: UserRole;
  can_assign: boolean;
};

export type ClientActor = { id: string; rol: UserRole; activo: boolean };
