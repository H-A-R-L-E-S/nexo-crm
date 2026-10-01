import { isAdmin, isManager, type UserRole } from "@/features/auth/roles";
export const canManageLeads = (role: UserRole) => isAdmin(role) || isManager(role);
