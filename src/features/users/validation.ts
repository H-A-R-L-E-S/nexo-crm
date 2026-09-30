import { isUserRole } from "@/features/auth/roles";
import type { EditUserInput, NewUserInput, UserFields } from "./types";

function record(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Los datos del usuario no son válidos.");
  return input as Record<string, unknown>;
}

function text(value: unknown, label: string, max: number) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new Error(`${label}: ingresa entre 1 y ${max} caracteres.`);
  return value.trim();
}

function fields(input: Record<string, unknown>): UserFields {
  if (!isUserRole(input.rol)) throw new Error("Selecciona un rol válido.");
  if (typeof input.activo !== "boolean") throw new Error("Selecciona un estado válido.");
  return { nombres: text(input.nombres, "Nombres", 80), apellidos: text(input.apellidos, "Apellidos", 100), rol: input.rol, activo: input.activo };
}

export function validateNewUser(value: unknown): NewUserInput {
  const input = record(value);
  const safe = fields(input);
  const email = text(input.email, "Correo", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Ingresa un correo electrónico válido.");
  if (typeof input.password !== "string" || input.password.length < 12 || input.password.length > 128 || !/[a-zA-Z]/.test(input.password) || !/[0-9]/.test(input.password)) {
    throw new Error("La contraseña temporal debe tener entre 12 y 128 caracteres e incluir letras y números.");
  }
  if (input.password !== input.passwordConfirmation) throw new Error("Las contraseñas no coinciden.");
  return { ...safe, email, password: input.password, passwordConfirmation: input.password };
}

export function validateEditUser(value: unknown): EditUserInput {
  const input = record(value);
  const safe = fields(input);
  return { ...safe, ...identity(input) };
}

function identity(input: Record<string, unknown>) {
  if (typeof input.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id)) throw new Error("El usuario no es válido.");
  if (typeof input.updatedAt !== "string" || !Number.isFinite(Date.parse(input.updatedAt))) throw new Error("Actualiza la lista antes de editar el usuario.");
  return { id: input.id, updatedAt: input.updatedAt };
}

export function validateStatusChange(value: unknown) {
  const input = record(value);
  if (typeof input.activo !== "boolean") throw new Error("Selecciona un estado válido.");
  return { ...identity(input), activo: input.activo };
}
