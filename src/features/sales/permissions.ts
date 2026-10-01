import { isAdmin, isManager, type UserRole } from "@/features/auth/roles";
import type { Sale } from "./types";
export const canManageSales = (role: UserRole) => isAdmin(role) || isManager(role);
export const canDeleteSale = (role: UserRole, sale: Sale) => canManageSales(role) && sale.estado === "Borrador" && !sale.emitida_at;
