import { getSupabaseClient } from "@/lib/supabase/client";
import { validateTask } from "../validation";
import type { CreateTask, Task, TaskResponsible, TaskStatus } from "../types";
function fail(error: { code?: string; message: string }): never {
  if (["42501", "22023", "40001", "P0002"].includes(error.code ?? "")) throw new Error(error.message);
  if (["23514", "22P02", "22007", "22008"].includes(error.code ?? "")) throw new Error("Revisa los campos, fechas y relación comercial de la tarea.");
  if (error.code === "23503") throw new Error("El responsable o registro relacionado ya no está disponible. Actualiza antes de continuar.");
  if (["PGRST301", "PGRST303"].includes(error.code ?? "")) { window.location.replace("/login?motivo=sesion"); throw new Error("Tu sesión terminó. Inicia sesión nuevamente."); }
  throw new Error("No se pudo completar la operación de tareas. Revisa tu conexión y que tasks.sql esté aplicado.");
}
export async function getTasks(): Promise<Task[]> {
  const result: Task[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await getSupabaseClient().from("tareas").select("*").order("fecha_vencimiento").order("id").range(offset, offset + 499);
    if (error) fail(error);
    result.push(...data);
    if (data.length < 500) return result;
  }
}
export async function getTask(id: string): Promise<Task | null> {
  const { data, error } = await getSupabaseClient().from("tareas").select("*").eq("id", id).maybeSingle();
  if (error) fail(error);
  return data;
}
export async function getTaskResponsibles(): Promise<TaskResponsible[]> {
  const { data, error } = await getSupabaseClient().rpc("task_responsibles");
  if (error) fail(error);
  return data;
}
async function savedTask(id: string): Promise<Task> {
  try { const row = await getTask(id); if (row) return row; } catch { /* El guardado ya fue confirmado por SQL. */ }
  throw new Error("La operación se guardó, pero no pudimos recuperar la tarea. Cierra el formulario y actualiza la lista.");
}
export async function saveTask(input: CreateTask, requestId: string, task?: Task): Promise<Task> {
  const { data, error } = await getSupabaseClient().rpc("save_task", { p_id: task?.id ?? null, p_updated_at: task?.updated_at ?? null, p_request_id: requestId, p_data: validateTask(input) });
  if (error) fail(error);
  return savedTask(data);
}
export async function setTaskStatus(task: Task, state: TaskStatus): Promise<Task> {
  const { data, error } = await getSupabaseClient().rpc("set_task_status", { p_id: task.id, p_updated_at: task.updated_at, p_estado: state });
  if (error) fail(error);
  return savedTask(data);
}
export async function deleteTask(task: Task): Promise<void> {
  const { data, error } = await getSupabaseClient().rpc("delete_task", { p_id: task.id, p_updated_at: task.updated_at });
  if (error) fail(error);
  if (!data) throw new Error("No se eliminó la tarea. Actualiza la lista.");
}
