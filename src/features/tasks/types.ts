import type { LeadResponsable } from "@/features/leads/types";

export const TASK_TYPES = ["Llamada", "Reunión", "Correo", "Seguimiento", "Demostración", "Propuesta", "Cobro", "Otro"] as const;
export const TASK_STATUSES = ["Pendiente", "En progreso", "Completada", "Cancelada"] as const;
export const TASK_PRIORITIES = ["Alta", "Media", "Baja"] as const;
export const RELATION_TYPES = ["Ninguno", "Cliente", "Lead", "Oportunidad", "Venta"] as const;
export type TaskType = typeof TASK_TYPES[number];
export type TaskStatus = typeof TASK_STATUSES[number];
export type TaskPriority = typeof TASK_PRIORITIES[number];
export type RelationType = typeof RELATION_TYPES[number];
export type TaskResponsible = LeadResponsable;
export type Task = {
  id: string; request_id: string; titulo: string; descripcion: string;
  tipo: TaskType; estado: TaskStatus; prioridad: TaskPriority; responsable_id: string;
  cliente_id: string | null; lead_id: string | null; oportunidad_id: string | null; venta_id: string | null;
  fecha_inicio: string | null; fecha_vencimiento: string; recordatorio_at: string | null;
  completada_at: string | null; actividad_at: string | null; created_by: string; created_at: string; updated_at: string;
};
export type CreateTask = Omit<Task, "id" | "request_id" | "created_by" | "created_at" | "updated_at" | "completada_at" | "actividad_at">;
export type UpdateTask = CreateTask;
export function taskInput(task: Task): UpdateTask {
  const { titulo, descripcion, tipo, estado, prioridad, responsable_id, cliente_id, lead_id, oportunidad_id, venta_id, fecha_inicio, fecha_vencimiento, recordatorio_at } = task;
  return { titulo, descripcion, tipo, estado, prioridad, responsable_id, cliente_id, lead_id, oportunidad_id, venta_id, fecha_inicio, fecha_vencimiento, recordatorio_at };
}
