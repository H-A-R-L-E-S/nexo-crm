import type { UserRole } from "./roles";

export type Profile = {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
  rol: UserRole;
  avatar_url: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export function profileName(profile: Profile) {
  return `${profile.nombres} ${profile.apellidos}`.trim() || profile.email;
}
