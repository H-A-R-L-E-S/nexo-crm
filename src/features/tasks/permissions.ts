import type { Profile } from "@/features/auth/types";
import type { Task } from "./types";
export const canManageTasks = (profile: Profile) => profile.activo && (profile.rol === "Administrador" || profile.rol === "Gerente");
export const canEditTask = (profile: Profile, task: Task) => profile.activo && (canManageTasks(profile) || profile.id === task.responsable_id);
export const canDeleteTask = (profile: Profile, task: Task) => canManageTasks(profile) && task.estado === "Pendiente" && !task.actividad_at && !task.cliente_id && !task.lead_id && !task.oportunidad_id && !task.venta_id;
