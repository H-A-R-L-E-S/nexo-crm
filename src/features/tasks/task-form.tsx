"use client";
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/auth-provider";
import { responsableName } from "@/features/leads/types";
import { toLimaInput } from "@/features/leads/dates";
import { canManageTasks } from "./permissions";
import { taskDateInput } from "./dates";
import { saveTask } from "./services/tasks.service";
import { RELATION_TYPES, TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES, type CreateTask, type RelationType, type Task } from "./types";
import { taskRelation, type TasksDirectory } from "./use-tasks";
export const taskSelectStyle = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus-visible:outline-blue-600 disabled:bg-slate-50 disabled:text-slate-500";
type Props = { task?: Task; directory: TasksDirectory; onSaved: (task: Task) => void; initialRelation?: RelationType; initialRecord?: string; defaultOpen?: boolean; disabled?: boolean; children?: ReactNode };
export function TaskFormDialog(props: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(props.defaultOpen ?? false);
  const [pending, setPending] = useState(false);
  function close() { setOpen(false); if (props.defaultOpen) router.replace("/tareas", { scroll: false }); }
  return <Dialog open={open} onOpenChange={(value) => { if (!pending) { if (value) setOpen(true); else close(); } }}><DialogTrigger asChild>{props.children ?? <Button disabled={props.disabled}><Plus className="size-4" />Nueva tarea</Button>}</DialogTrigger><DialogContent className="max-h-[92dvh] overflow-y-auto p-6 sm:max-w-2xl" showCloseButton={!pending}><DialogHeader><DialogTitle>{props.task ? "Editar tarea" : "Nueva tarea"}</DialogTitle><DialogDescription>Los campos con * son obligatorios. Todas las fechas y horas se ingresan en hora de Lima (UTC−5).</DialogDescription></DialogHeader><TaskForm {...props} pending={pending} setPending={setPending} onCancel={close} onSaved={(task) => { props.onSaved(task); close(); }} /></DialogContent></Dialog>;
}
function TaskForm({ task, directory, onSaved, initialRelation, initialRecord, pending, setPending, onCancel }: Props & { pending: boolean; setPending: (value: boolean) => void; onCancel: () => void }) {
  const id = useId();
  const { profile } = useAuth();
  const manage = canManageTasks(profile);
  const existing = task ? taskRelation(task, directory) : undefined;
  const requested = directory.relations.find((row) => row.type === initialRelation && row.id === initialRecord);
  const initial = existing ?? requested;
  const [relation, setRelation] = useState<RelationType>(initial?.type ?? "Ninguno");
  const [record, setRecord] = useState(initial?.id ?? "");
  const [error, setError] = useState("");
  const busy = useRef(false);
  const requestId = useRef<string | null>(null);
  const owner = task?.responsable_id ?? (manage && requested?.ownerId && directory.responsibles.some((person) => person.id === requested.ownerId && person.activo) ? requested.ownerId : profile.id);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy.current) return; setError("");
    const form = new FormData(event.currentTarget);
    const field = (name: string) => String(form.get(name) ?? "").trim();
    try {
      if (relation !== "Ninguno" && !directory.relations.some((row) => row.type === relation && row.id === record)) throw new Error("Selecciona el registro relacionado.");
      const input: CreateTask = {
        titulo: field("titulo"), descripcion: field("descripcion"), tipo: field("tipo") as CreateTask["tipo"], prioridad: field("prioridad") as CreateTask["prioridad"], estado: field("estado") as CreateTask["estado"],
        responsable_id: manage ? field("responsable") : owner,
        cliente_id: relation === "Cliente" ? record : null, lead_id: relation === "Lead" ? record : null, oportunidad_id: relation === "Oportunidad" ? record : null, venta_id: relation === "Venta" ? record : null,
        fecha_inicio: taskDateInput(field("inicio")), fecha_vencimiento: taskDateInput(field("vencimiento"), true)!, recordatorio_at: taskDateInput(field("recordatorio")),
      };
      busy.current = true; setPending(true); requestId.current ??= crypto.randomUUID();
      onSaved(await saveTask(input, requestId.current, task)); toast.success(task ? "Tarea actualizada" : "Tarea creada");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar la tarea."); }
    finally { busy.current = false; setPending(false); }
  }
  return <form noValidate onSubmit={submit} aria-busy={pending} className="space-y-5"><fieldset disabled={pending} className="grid min-w-0 gap-4 sm:grid-cols-2">
    {initialRelation && initialRecord && !requested && !task && <p role="alert" className="text-sm text-amber-700 sm:col-span-2">El registro solicitado no está disponible. Selecciona otra relación o crea una tarea general.</p>}
    <div className="space-y-2 sm:col-span-2"><Label htmlFor={`${id}-title`}>Título *</Label><Input id={`${id}-title`} name="titulo" defaultValue={task?.titulo ?? ""} maxLength={160} required /></div>
    <div className="space-y-2 sm:col-span-2"><Label htmlFor={`${id}-description`}>Descripción</Label><Textarea id={`${id}-description`} name="descripcion" defaultValue={task?.descripcion ?? ""} maxLength={3000} rows={3} /></div>
    <div className="space-y-2"><Label htmlFor={`${id}-type`}>Tipo *</Label><select id={`${id}-type`} name="tipo" defaultValue={task?.tipo ?? (relation === "Venta" ? "Cobro" : "Seguimiento")} className={taskSelectStyle} required>{TASK_TYPES.map((value) => <option key={value}>{value}</option>)}</select></div>
    <div className="space-y-2"><Label htmlFor={`${id}-priority`}>Prioridad *</Label><select id={`${id}-priority`} name="prioridad" defaultValue={task?.prioridad ?? "Media"} className={taskSelectStyle} required>{TASK_PRIORITIES.map((value) => <option key={value}>{value}</option>)}</select></div>
    <div className="space-y-2"><Label htmlFor={`${id}-owner`}>Responsable *</Label><select id={`${id}-owner`} name="responsable" defaultValue={owner} disabled={!manage} className={taskSelectStyle} required>{directory.responsibles.filter((person) => person.activo || person.id === task?.responsable_id).map((person) => <option key={person.id} value={person.id}>{responsableName(person)}{person.activo ? "" : " (inactivo · histórico)"}</option>)}</select>{!manage && <p className="text-xs text-slate-500">Solo puedes crear y modificar tareas asignadas a ti.</p>}</div>
    <div className="space-y-2"><Label htmlFor={`${id}-state`}>Estado *</Label><select id={`${id}-state`} name="estado" defaultValue={task?.estado ?? "Pendiente"} className={taskSelectStyle} required>{TASK_STATUSES.filter((state) => task?.estado !== "Cancelada" || state === "Cancelada").map((value) => <option key={value}>{value}</option>)}</select></div>
    <div className="space-y-2"><Label htmlFor={`${id}-start`}>Fecha de inicio</Label><Input id={`${id}-start`} type="datetime-local" name="inicio" defaultValue={toLimaInput(task?.fecha_inicio ?? null)} /></div>
    <div className="space-y-2"><Label htmlFor={`${id}-due`}>Fecha de vencimiento *</Label><Input id={`${id}-due`} type="datetime-local" name="vencimiento" defaultValue={toLimaInput(task?.fecha_vencimiento ?? null)} required /></div>
    <div className="space-y-2"><Label htmlFor={`${id}-reminder`}>Recordatorio</Label><Input id={`${id}-reminder`} type="datetime-local" name="recordatorio" defaultValue={toLimaInput(task?.recordatorio_at ?? null)} /><p className="text-xs text-slate-500">Se guarda la fecha; todavía no se envían notificaciones.</p></div>
    <div className="space-y-2"><Label htmlFor={`${id}-relation`}>Relacionado con</Label><select id={`${id}-relation`} value={relation} onChange={(event) => { setRelation(event.target.value as RelationType); setRecord(""); }} className={taskSelectStyle}>{RELATION_TYPES.map((value) => <option key={value}>{value}</option>)}</select></div>
    {relation !== "Ninguno" && <div className="space-y-2 sm:col-span-2"><Label htmlFor={`${id}-record`}>Registro relacionado *</Label><select id={`${id}-record`} value={record} onChange={(event) => setRecord(event.target.value)} className={taskSelectStyle} required><option value="">Selecciona un registro</option>{directory.relations.filter((row) => row.type === relation).map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}</select></div>}
  </fieldset>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={pending} onClick={onCancel}>Volver</Button><Button type="submit" disabled={pending}>{pending ? "Guardando..." : task ? "Guardar cambios" : "Crear tarea"}</Button></div></form>;
}
