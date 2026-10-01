"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatLeadDate } from "@/features/leads/dates";
import { responsableName } from "@/features/leads/types";
import { getTask } from "./services/tasks.service";
import { getTasksDirectory, taskRelation, type TasksDirectory } from "./use-tasks";
import { TaskActions, TaskStateBadge } from "./task-actions";
import type { Task } from "./types";
export function TaskDetailView({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<{ task: Task; directory: TasksDirectory } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void Promise.all([getTask(id), getTasksDirectory()]).then(([task, directory]) => { if (active) { if (!task) setError("La tarea no está disponible o fue eliminada."); else { setData({ task, directory }); setError(""); } } }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "No se pudo cargar la tarea."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, attempt]);
  function saved(task: Task) { setData((value) => value ? { ...value, task } : null); }
  if (loading) return <p role="status" className="p-12 text-center text-sm text-slate-500">Cargando tarea...</p>;
  if (error || !data) return <div className="space-y-4"><p role="alert" className="text-sm text-red-700">{error}</p><Button variant="outline" onClick={() => { setLoading(true); setAttempt(attempt + 1); }}>Reintentar</Button><Button asChild variant="ghost"><Link href="/tareas">Volver a tareas</Link></Button></div>;
  const { task, directory } = data;
  const relation = taskRelation(task, directory);
  const personName = (personId: string) => { const person = directory.responsibles.find((row) => row.id === personId); return person ? `${responsableName(person)}${person.activo ? "" : " (inactivo)"}` : "Usuario no disponible"; };
  const fields = { Tipo: task.tipo, Prioridad: task.prioridad, Responsable: personName(task.responsable_id), "Creado por": personName(task.created_by), Inicio: formatLeadDate(task.fecha_inicio), Vencimiento: formatLeadDate(task.fecha_vencimiento), Recordatorio: formatLeadDate(task.recordatorio_at), Completada: formatLeadDate(task.completada_at), Creación: formatLeadDate(task.created_at), Actualización: formatLeadDate(task.updated_at) };
  return <div className="min-w-0 space-y-6"><Button asChild variant="outline"><Link href="/tareas">Volver a tareas</Link></Button><section className="min-w-0 space-y-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><h1 className="break-words text-2xl font-semibold">{task.titulo}</h1><p className="mt-2 text-xs text-slate-500">Detalle de seguimiento · Fechas y horas en Lima</p></div><TaskActions task={task} directory={directory} onSaved={saved} onDeleted={() => router.push("/tareas")} showDetail={false} /></div><TaskStateBadge state={task.estado} /><div><h2 className="text-xs text-slate-500">Relacionado con</h2>{relation ? <Link href={relation.href} className="mt-1 block break-words text-sm text-blue-700 underline">{relation.label} · {relation.type}</Link> : <p className="mt-1 text-sm">Tarea general</p>}</div><dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Object.entries(fields).map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm">{value}</dd></div>)}</dl><div><h2 className="text-xs text-slate-500">Descripción</h2><p className="mt-2 whitespace-pre-wrap break-words text-sm">{task.descripcion || "Sin descripción"}</p></div>{task.recordatorio_at && <p className="text-xs text-slate-500">El recordatorio está guardado. Las notificaciones automáticas estarán disponibles en una etapa posterior.</p>}</section></div>;
}
