import type { UserRole } from "@/features/auth/roles";

export type UserFields = { nombres: string; apellidos: string; rol: UserRole; activo: boolean };
export type NewUserInput = UserFields & { email: string; password: string; passwordConfirmation: string };
export type EditUserInput = UserFields & { id: string; updatedAt: string };
export type UserResult<T> = { ok: true; data: T } | { ok: false; error: string; partial?: boolean };
