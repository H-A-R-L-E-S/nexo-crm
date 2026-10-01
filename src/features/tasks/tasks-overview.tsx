"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatLeadDate } from "@/features/leads/dates";
import { getTasks } from "./services/tasks.service";
import { isOpenTask, taskStats } from "./dates";
import type { Task } from "./types";
export function TasksOverview() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void getTasks().then((rows) => { if (active) { setTasks(rows); setNow(new Date()); setError(""); } }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "No se pudieron cargar las tareas."); });
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => { active = false; clearInterval(timer); };
  }, [attempt]);
  const stats = tasks && now ? taskStats(tasks, now) : null;
  const upcoming = tasks?.filter(isOpenTask).sort((a, b) => Date.parse(a.fecha_vencimiento) - Date.parse(b.fecha_vencimiento)).slice(0, 3) ?? [];
  return <section aria-label="Seguimiento comercial" className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">Seguimiento comercial</h2><Link href="/tareas" className="text-xs text-blue-700 underline">Ver tareas</Link></div>{error ? <div className="mt-4 space-y-3"><p className="text-xs text-slate-500">{error}</p><Button size="sm" variant="outline" onClick={() => setAttempt(attempt + 1)}>Reintentar tareas</Button></div> : !stats ? <p className="mt-4 text-xs text-slate-500">Cargando seguimiento...</p> : <><div className="mt-4 flex flex-wrap gap-5"><Link href="/tareas?vencimiento=today" className="text-sm text-blue-700">{stats.today} para hoy</Link><Link href="/tareas?vencimiento=overdue" className="text-sm text-red-700">{stats.overdue} vencidas</Link></div><p className="mt-4 text-xs text-slate-500">Próximos seguimientos · Incluye tareas vencidas</p>{upcoming.length ? <ul className="mt-3 space-y-3">{upcoming.map((task) => <li key={task.id} className="flex flex-wrap justify-between gap-2"><Link href={`/tareas/${task.id}`} className="min-w-0 break-words text-xs font-medium text-slate-800 hover:text-blue-700">{task.titulo}</Link><span className="text-xs text-slate-500">{formatLeadDate(task.fecha_vencimiento)}</span></li>)}</ul> : <p className="mt-3 text-xs text-slate-500">No hay seguimientos abiertos.</p>}</>}</section>;
}
