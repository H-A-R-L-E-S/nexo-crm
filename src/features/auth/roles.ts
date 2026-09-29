export const USER_ROLES = ["Administrador", "Gerente", "Vendedor"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.some((role) => role === value);
}

export const isAdmin = (role: UserRole) => role === "Administrador";
export const isManager = (role: UserRole) => role === "Gerente";
export const canDeleteClient = (role: UserRole) => isAdmin(role) || isManager(role);
