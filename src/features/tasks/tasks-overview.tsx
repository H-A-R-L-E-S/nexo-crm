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
  return (
    <section aria-label="Seguimiento comercial" className="overview-followup">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="overview-section-title">Seguimiento comercial</h2><p className="overview-section-context">Próximas tareas, incluidas las vencidas</p></div>
        <Link href="/tareas" className="overview-link">Ver tareas</Link>
      </div>
      {error ? <div className="mt-4 space-y-3"><p role="alert" className="break-words text-sm text-red-700">{error}</p><Button className="h-11" variant="outline" onClick={() => setAttempt(attempt + 1)}>Reintentar tareas</Button></div>
        : !stats ? <p role="status" className="mt-5 text-sm text-slate-600">Cargando seguimiento...</p>
        : <>
          <div className="mt-4 grid grid-cols-2 gap-3 border-b border-border pb-4">
            <Link href="/tareas?vencimiento=today" className="followup-count rounded-md py-1"><span className="block text-[1.75rem] font-semibold leading-tight tracking-tight tabular-nums">{stats.today}</span><span className="mt-1 block text-xs text-muted-foreground">para hoy</span></Link>
            <Link href="/tareas?vencimiento=overdue" className="followup-count rounded-md py-1" data-overdue={stats.overdue > 0}><span className="block text-[1.75rem] font-semibold leading-tight tracking-tight tabular-nums">{stats.overdue}</span><span className="mt-1 block text-xs text-muted-foreground">vencidas</span></Link>
          </div>
          {upcoming.length ? <ul className="mt-1 divide-y divide-border">{upcoming.map((task) => <li key={task.id} className="py-3"><Link href={`/tareas/${task.id}`} className="overview-link min-w-0 break-words text-foreground">{task.titulo}</Link><span className="block text-xs tabular-nums text-muted-foreground">{formatLeadDate(task.fecha_vencimiento)}</span></li>)}</ul>
            : <p className="mt-4 text-sm leading-relaxed text-muted-foreground">No hay seguimientos abiertos. Puedes registrar una tarea desde el módulo Tareas.</p>}
        </>}
    </section>
  );
}
