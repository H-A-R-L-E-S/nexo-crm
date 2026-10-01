"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Ban, Check, Eye, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/features/auth/auth-provider";
import { canDeleteTask, canEditTask } from "./permissions";
import { deleteTask, setTaskStatus } from "./services/tasks.service";
import { TaskFormDialog } from "./task-form";
import type { Task, TaskStatus } from "./types";
import type { TasksDirectory } from "./use-tasks";
const stateColors: Record<TaskStatus, string> = { Pendiente: "border-amber-100 bg-amber-50 text-amber-700", "En progreso": "border-blue-100 bg-blue-50 text-blue-700", Completada: "border-emerald-100 bg-emerald-50 text-emerald-700", Cancelada: "border-slate-200 bg-slate-100 text-slate-600" };
export function TaskStateBadge({ state }: { state: TaskStatus }) { return <Badge variant="outline" className={stateColors[state]}>{state}</Badge>; }
export function TaskActions({ task, directory, onSaved, onDeleted, showDetail = true }: { task: Task; directory: TasksDirectory; onSaved: (task: Task) => void; onDeleted: (id: string) => void; showDetail?: boolean }) {
  const { profile } = useAuth();
  const [pending, setPending] = useState(false);
  const [operation, setOperation] = useState<TaskStatus>("Completada");
  const [error, setError] = useState("");
  const busy = useRef(false);
  async function change(state: TaskStatus) {
    if (busy.current) return; busy.current = true; setOperation(state); setPending(true); setError("");
    try { onSaved(await setTaskStatus(task, state)); toast.success(state === "Completada" ? "Tarea completada" : "Tarea reabierta"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo actualizar la tarea."); }
    finally { busy.current = false; setPending(false); }
  }
  return <div aria-busy={pending}><div className="flex w-max gap-1">
    {showDetail && <Button asChild variant="ghost" size="icon"><Link href={`/tareas/${task.id}`} aria-label={`Ver tarea: ${task.titulo}`} title="Ver detalle"><Eye className="size-4" /></Link></Button>}
    {canEditTask(profile, task) && <>
      <TaskFormDialog task={task} directory={directory} onSaved={onSaved}><Button disabled={pending} variant="ghost" size="icon" aria-label={`Editar tarea: ${task.titulo}`} title="Editar tarea"><Pencil className="size-4" /></Button></TaskFormDialog>
      {task.estado !== "Cancelada" && <Button disabled={pending} variant="ghost" size="icon" onClick={() => void change(task.estado === "Completada" ? "Pendiente" : "Completada")} aria-label={`${task.estado === "Completada" ? "Reabrir" : "Completar"} tarea: ${task.titulo}`} title={task.estado === "Completada" ? "Reabrir" : "Completar"}>{task.estado === "Completada" ? <RotateCcw className="size-4" /> : <Check className="size-4 text-emerald-700" />}</Button>}
      {task.estado !== "Cancelada" && <TaskConfirm task={task} action="cancel" onSaved={onSaved} onDeleted={onDeleted} disabled={pending} />}
    </>}
    {canDeleteTask(profile, task) && <TaskConfirm task={task} action="delete" onSaved={onSaved} onDeleted={onDeleted} disabled={pending} />}
  </div>{pending && <p role="status" className="text-xs text-slate-500">{operation === "Completada" ? "Completando..." : "Reabriendo..."}</p>}{error && <p role="alert" className="max-w-60 whitespace-normal text-xs text-red-700">{error}</p>}</div>;
}
function TaskConfirm({ task, action, onSaved, onDeleted, disabled }: { task: Task; action: "cancel" | "delete"; onSaved: (task: Task) => void; onDeleted: (id: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const deleting = action === "delete";
  async function confirm() {
    if (busy.current) return; busy.current = true; setPending(true); setError("");
    try { if (deleting) { await deleteTask(task); onDeleted(task.id); } else onSaved(await setTaskStatus(task, "Cancelada")); setOpen(false); toast.success(deleting ? "Tarea eliminada" : "Tarea cancelada"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo completar la operación."); }
    finally { busy.current = false; setPending(false); }
  }
  return <AlertDialog open={open} onOpenChange={(value) => { if (!pending) { setOpen(value); setError(""); } }}><AlertDialogTrigger asChild><Button disabled={disabled} variant="ghost" size="icon" aria-label={`${deleting ? "Eliminar" : "Cancelar"} tarea: ${task.titulo}`} title={deleting ? "Eliminar tarea general pendiente" : "Cancelar tarea"}>{deleting ? <Trash2 className="size-4 text-red-600" /> : <Ban className="size-4 text-slate-500" />}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{deleting ? "Eliminar tarea" : "Cancelar tarea"}</AlertDialogTitle><AlertDialogDescription>«{task.titulo}». {deleting ? "Solo se eliminan tareas generales pendientes sin actividad previa. Esta acción no se puede deshacer." : "La tarea se conservará como Cancelada y no podrá reabrirse. Puedes crear una nueva para retomar el seguimiento."}</AlertDialogDescription></AlertDialogHeader>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2"><Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>Volver</Button><Button variant="destructive" disabled={pending} onClick={() => void confirm()}>{pending ? deleting ? "Eliminando..." : "Cancelando..." : deleting ? "Confirmar eliminación" : "Confirmar cancelación"}</Button></div></AlertDialogContent></AlertDialog>;
}
