import { limaDay } from "@/features/leads/dates";
import type { Task } from "./types";

export const isOpenTask = (task: Task) => task.estado === "Pendiente" || task.estado === "En progreso";
export const isOverdue = (task: Task, now: Date) => isOpenTask(task) && new Date(task.fecha_vencimiento).getTime() < now.getTime();
export const isToday = (task: Task, now: Date) => isOpenTask(task) && limaDay(new Date(task.fecha_vencimiento)) === limaDay(now);
export function taskStats(tasks: Task[], now: Date) {
  const month = limaDay(now).slice(0, 7);
  return { pending: tasks.filter((task) => task.estado === "Pendiente").length, overdue: tasks.filter((task) => isOverdue(task, now)).length, today: tasks.filter((task) => isToday(task, now)).length, completed: tasks.filter((task) => task.estado === "Completada" && task.completada_at && limaDay(new Date(task.completada_at)).slice(0, 7) === month).length };
}
/** datetime-local se interpreta explícitamente en Lima, independientemente del equipo. */
export function taskDateInput(value: string, required = false): string | null {
  if (!value && !required) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Ingresa una fecha y hora válidas.");
  const date = new Date(`${value}:00-05:00`);
  if (!Number.isFinite(date.getTime()) || new Date(date.getTime() - 5 * 3600_000).toISOString().slice(0, 16) !== value) throw new Error("Ingresa una fecha y hora válidas.");
  return date.toISOString();
}
