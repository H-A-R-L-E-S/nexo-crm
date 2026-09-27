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
