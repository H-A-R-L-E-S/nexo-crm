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
import styles from "./task-detail.module.css";
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
  if (loading) return <p role="status" className={styles.state}>Cargando tarea...</p>;
  if (error || !data) return <div className="space-y-4"><p role="alert" className="text-sm text-red-700">{error}</p><Button variant="outline" onClick={() => { setLoading(true); setAttempt(attempt + 1); }}>Reintentar</Button><Button asChild variant="ghost"><Link href="/tareas">Volver a tareas</Link></Button></div>;
  const { task, directory } = data;
  const relation = taskRelation(task, directory);
  const personName = (personId: string) => { const person = directory.responsibles.find((row) => row.id === personId); return person ? `${responsableName(person)}${person.activo ? "" : " (inactivo)"}` : "Usuario no disponible"; };
  const fields = { Tipo: task.tipo, Prioridad: task.prioridad, Responsable: personName(task.responsable_id), "Creado por": personName(task.created_by), Inicio: formatLeadDate(task.fecha_inicio), Vencimiento: formatLeadDate(task.fecha_vencimiento), Recordatorio: formatLeadDate(task.recordatorio_at), Completada: formatLeadDate(task.completada_at), Creación: formatLeadDate(task.created_at), Actualización: formatLeadDate(task.updated_at) };
  return <div className={styles.page}><Button asChild variant="outline" className={styles.back}><Link href="/tareas">Volver a tareas</Link></Button><section className={styles.detail}><div className={styles.hero}><div className="min-w-0"><h1 className="break-words">{task.titulo}</h1><p>Detalle de seguimiento · Fechas y horas en Lima</p></div><TaskActions task={task} directory={directory} onSaved={saved} onDeleted={() => router.push("/tareas")} showDetail={false} /></div><div className={styles.body}><TaskStateBadge state={task.estado} /><div className={styles.relation}><h2>Relacionado con</h2>{relation ? <Link href={relation.href}>{relation.label} · {relation.type}</Link> : <p className="mt-1 text-sm">Tarea general</p>}</div><dl className={styles.fields}>{Object.entries(fields).map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="break-words">{value}</dd></div>)}</dl><div className={styles.description}><h2>Descripción</h2><p className="whitespace-pre-wrap break-words">{task.descripcion || "Sin descripción"}</p></div>{task.recordatorio_at && <p className="text-xs text-muted-foreground">El recordatorio está guardado. Las notificaciones automáticas estarán disponibles en una etapa posterior.</p>}</div></section></div>;
}
