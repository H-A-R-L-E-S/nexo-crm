import { isAdmin, isManager, type UserRole } from "@/features/auth/roles";
export const canManageOpportunities = (role: UserRole) => isAdmin(role) || isManager(role);
