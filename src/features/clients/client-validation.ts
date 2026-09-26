import { OWNERS } from "./demo-data";
import type { Client, ClientInput, ClientStatus } from "./types";

export type ClientFormErrors = Partial<Record<keyof ClientInput, string>>;
export const CLIENT_STATUSES: ClientStatus[] = ["Prospecto", "Activo", "Inactivo"];
export const CLIENT_FIELD_ORDER: (keyof ClientInput)[] = ["firstName", "lastName", "company", "email", "phone", "position", "status", "owner", "address", "notes"];

export function clientInitialValues(client?: Client): ClientInput {
  return {
    firstName: client?.firstName ?? "", lastName: client?.lastName ?? "",
    company: client?.company ?? "", email: client?.email ?? "", phone: client?.phone ?? "",
    position: client?.position ?? "", status: client?.status ?? "Prospecto",
    owner: client?.owner ?? OWNERS[0].name, address: client?.address ?? "", notes: client?.notes ?? "",
  };
}

export function normalizeClientInput(values: ClientInput): ClientInput {
  return {
    firstName: values.firstName.trim(), lastName: values.lastName.trim(), company: values.company.trim(),
    email: values.email.trim().toLowerCase(), phone: values.phone.trim(), position: values.position.trim(),
    status: values.status, owner: values.owner, address: values.address.trim(), notes: values.notes.trim(),
  };
}

export function validateClient(input: ClientInput, clients: Client[], editingId?: string): ClientFormErrors {
  const errors: ClientFormErrors = {};
  if (input.firstName.length < 2) errors.firstName = "Escribe nombres de al menos 2 caracteres.";
  if (input.firstName.length > 80) errors.firstName = "Los nombres pueden tener hasta 80 caracteres.";
  if (!input.lastName) errors.lastName = "Escribe los apellidos del cliente.";
  if (input.lastName.length > 100) errors.lastName = "Los apellidos pueden tener hasta 100 caracteres.";
  if (input.company.length > 100) errors.company = "La empresa puede tener hasta 100 caracteres.";
  if (input.position.length > 100) errors.position = "El cargo puede tener hasta 100 caracteres.";
  if (input.address.length > 200) errors.address = "La dirección puede tener hasta 200 caracteres.";
  if (input.notes.length > 1500) errors.notes = "Las notas pueden tener hasta 1,500 caracteres.";
  if (input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.email = "Escribe un correo válido, por ejemplo nombre@empresa.com.";
  } else if (clients.some((client) => client.id !== editingId && client.email.toLowerCase() === input.email.toLowerCase())) {
    errors.email = "Ya existe un cliente con este correo electrónico.";
  }
  const digits = input.phone.replace(/\D/g, "");
  if (!/^\+?[\d\s()-]+$/.test(input.phone) || digits.length < 7 || digits.length > 15 || input.phone.length > 30) {
    errors.phone = "Escribe un teléfono de 7 a 15 dígitos; puedes incluir +51.";
  }
  if (!CLIENT_STATUSES.includes(input.status)) errors.status = "Selecciona un estado válido.";
  if (!OWNERS.some((owner) => owner.name === input.owner)) errors.owner = "Selecciona un responsable de la lista.";
  return errors;
}
