import { TASK_TYPES, TASK_STATUSES, TASK_PRIORITIES, type CreateTask } from "./types";
export function validateTask(input: CreateTask): CreateTask {
  const value = { ...input, titulo: input.titulo.trim(), descripcion: input.descripcion.trim() };
  if (value.titulo.length < 2 || value.titulo.length > 160) throw new Error("El título debe tener entre 2 y 160 caracteres.");
  if (value.descripcion.length > 3000) throw new Error("La descripción admite hasta 3000 caracteres.");
  if (!TASK_TYPES.includes(value.tipo) || !TASK_STATUSES.includes(value.estado) || !TASK_PRIORITIES.includes(value.prioridad)) throw new Error("Selecciona tipo, estado y prioridad válidos.");
  if (!value.responsable_id) throw new Error("Selecciona un responsable activo.");
  const due = Date.parse(value.fecha_vencimiento);
  if (!Number.isFinite(due)) throw new Error("Completa una fecha y hora de vencimiento válidas.");
  for (const [label, date] of [["El inicio", value.fecha_inicio], ["El recordatorio", value.recordatorio_at]]) {
    if (date && (!Number.isFinite(Date.parse(date)) || Date.parse(date) > due)) throw new Error(`${label} debe ser anterior o igual al vencimiento.`);
  }
  if ([value.cliente_id, value.lead_id, value.oportunidad_id, value.venta_id].filter(Boolean).length > 1) throw new Error("Selecciona una sola relación comercial.");
  return value;
}
