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
    <section aria-label="Seguimiento comercial" className="overview-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="text-[15px] font-semibold">Seguimiento comercial</h2><p className="mt-1 text-sm text-slate-600">Próximas tareas, incluidas las vencidas</p></div>
        <Link href="/tareas" className="overview-link">Ver tareas</Link>
      </div>
      {error ? <div className="mt-4 space-y-3"><p role="alert" className="break-words text-sm text-red-700">{error}</p><Button className="h-11" variant="outline" onClick={() => setAttempt(attempt + 1)}>Reintentar tareas</Button></div>
        : !stats ? <p role="status" className="mt-5 text-sm text-slate-600">Cargando seguimiento...</p>
        : <>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-b border-slate-200 pb-3">
            <Link href="/tareas?vencimiento=today" className="overview-link gap-2"><span className="text-xl font-semibold tabular-nums">{stats.today}</span> para hoy</Link>
            <Link href="/tareas?vencimiento=overdue" className="overview-link gap-2 text-red-700 hover:text-red-800"><span className="text-xl font-semibold tabular-nums">{stats.overdue}</span> vencidas</Link>
          </div>
          {upcoming.length ? <ul className="mt-1 divide-y divide-slate-100">{upcoming.map((task) => <li key={task.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2"><Link href={`/tareas/${task.id}`} className="overview-link min-w-0 break-words text-slate-800">{task.titulo}</Link><span className="text-xs tabular-nums text-slate-600">{formatLeadDate(task.fecha_vencimiento)}</span></li>)}</ul>
            : <p className="mt-4 text-sm text-slate-600">No hay seguimientos abiertos. Puedes registrar una tarea desde el módulo Tareas.</p>}
        </>}
    </section>
  );
}
