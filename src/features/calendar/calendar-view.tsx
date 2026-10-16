"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, CircleAlert, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { responsableName } from "@/features/leads/types";
import { limaDay } from "@/features/leads/dates";
import { isOverdue, isOpenTask } from "@/features/tasks/dates";
import { TaskFormDialog, taskSelectStyle } from "@/features/tasks/task-form";
import { TASK_PRIORITIES, TASK_STATUSES, type Task } from "@/features/tasks/types";
import { taskRelation, useTasks } from "@/features/tasks/use-tasks";
import { addDays, formatPeriod, monthGrid, parseDay, shiftPeriod, startOfWeek, type CalendarView as View } from "./dates";
import styles from "./calendar.module.css";

const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const time = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false });
const longDay = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", weekday: "long", day: "numeric", month: "long", year: "numeric" });

export function CalendarView({ initialToday }: { initialToday: string }) {
  const today = limaDay(new Date(initialToday));
  const { tasks, directory, loaded, error, reload, saved } = useTasks();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(today);
  const [selected, setSelected] = useState(today);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [owner, setOwner] = useState("");
  const days = view === "month" ? monthGrid(cursor) : view === "week" ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i)) : [cursor];
  const visible = useMemo(() => tasks.filter((task) => {
    const relation = taskRelation(task, directory);
    return (!query || normalize(`${task.titulo} ${task.descripcion} ${relation?.label ?? ""}`).includes(normalize(query))) && (!status || task.estado === status) && (!priority || task.prioridad === priority) && (!owner || task.responsable_id === owner);
  }), [tasks, directory, query, status, priority, owner]);
  const byDay = useMemo(() => visible.reduce<Record<string, Task[]>>((map, task) => { (map[limaDay(new Date(task.fecha_vencimiento))] ??= []).push(task); return map; }, {}), [visible]);
  const selectedTasks = byDay[selected] ?? [];
  const ownerName = (id: string) => { const person = directory.responsibles.find((row) => row.id === id); return person ? responsableName(person) : "Usuario no disponible"; };
  const choose = (day: string) => { setSelected(day); if (view === "day") setCursor(day); };
  const reset = () => { setQuery(""); setStatus(""); setPriority(""); setOwner(""); };

  return <div className={styles.page}>
    <header className={styles.header}><div><h1>Calendario</h1><p>Seguimientos comerciales por fecha de vencimiento · hora de Lima</p></div>{loaded && !error && <TaskFormDialog directory={directory} onSaved={saved} initialDueDate={selected} />}</header>
    <section className={styles.toolbar} aria-label="Controles del calendario">
      <div className={styles.periodControls}><Button variant="outline" onClick={() => { setCursor(today); setSelected(today); }}>Hoy</Button><Button variant="outline" size="icon" aria-label="Período anterior" onClick={() => setCursor(shiftPeriod(cursor, view, -1))}><ChevronLeft aria-hidden="true" /></Button><Button variant="outline" size="icon" aria-label="Período siguiente" onClick={() => setCursor(shiftPeriod(cursor, view, 1))}><ChevronRight aria-hidden="true" /></Button><h2 aria-live="polite">{formatPeriod(cursor, view)}</h2></div>
      <div className={styles.viewPicker} role="group" aria-label="Vista del calendario">{([['month','Mes'],['week','Semana'],['day','Día']] as const).map(([value,label]) => <Button key={value} variant={view === value ? "default" : "outline"} aria-pressed={view === value} onClick={() => setView(value)}>{label}</Button>)}</div>
      <label className={styles.datePicker}>Ir a fecha<Input type="date" value={selected} onChange={(event) => { if (event.target.value) { setSelected(event.target.value); setCursor(event.target.value); } }} /></label>
    </section>
    <section className={styles.filters} aria-label="Filtros"><div className={styles.search}><Search aria-hidden="true"/><Input aria-label="Buscar en calendario" placeholder="Buscar tarea o relación" value={query} onChange={(e) => setQuery(e.target.value)} /></div><select aria-label="Filtrar por estado" className={taskSelectStyle} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos los estados</option>{TASK_STATUSES.map(v=><option key={v}>{v}</option>)}</select><select aria-label="Filtrar por prioridad" className={taskSelectStyle} value={priority} onChange={(e)=>setPriority(e.target.value)}><option value="">Todas las prioridades</option>{TASK_PRIORITIES.map(v=><option key={v}>{v}</option>)}</select><select aria-label="Filtrar por responsable" className={taskSelectStyle} value={owner} onChange={(e)=>setOwner(e.target.value)}><option value="">Todos los responsables</option>{directory.responsibles.map(p=><option key={p.id} value={p.id}>{responsableName(p)}</option>)}</select><Button variant="ghost" onClick={reset}>Limpiar</Button></section>
    {error ? <div className={styles.state} role="alert"><CircleAlert aria-hidden="true"/><p>{error}</p><Button variant="outline" onClick={() => void reload()}>Reintentar</Button></div> : !loaded ? <div className={styles.skeleton} role="status"><span>Cargando seguimientos...</span></div> : <div className={styles.workspace}>
      <section className={styles.calendar} aria-label={`${view === "month" ? "Vista mensual" : view === "week" ? "Vista semanal" : "Vista diaria"}`} data-view={view}>
        {view !== "day" && weekdays.map((label) => <div key={label} className={styles.weekday}>{label}</div>)}
        {days.map((day) => { const date = parseDay(day); const items = byDay[day] ?? []; const adjacent = view === "month" && date.getMonth() !== parseDay(cursor).getMonth(); return <button key={day} type="button" className={styles.day} data-today={day === today} data-selected={day === selected} data-adjacent={adjacent} aria-label={`${longDay.format(date)}. ${items.length} ${items.length === 1 ? "tarea" : "tareas"}`} aria-pressed={day === selected} onClick={() => choose(day)}><span className={styles.dayNumber}>{date.getDate()}<span>{longDay.format(date).split(",")[0]}</span></span><span className={styles.events}>{items.slice(0, view === "month" ? 3 : 8).map(task => <span key={task.id} className={styles.event} data-state={task.estado} data-priority={task.prioridad}><span>{time.format(new Date(task.fecha_vencimiento))}</span>{task.titulo}</span>)}{items.length > (view === "month" ? 3 : 8) && <span className={styles.more}>+{items.length - (view === "month" ? 3 : 8)} más</span>}</span></button>; })}
      </section>
      <aside className={styles.agenda} aria-label="Tareas del día seleccionado"><div><p className={styles.eyebrow}>{longDay.format(parseDay(selected))}</p><h2>{selectedTasks.length ? `${selectedTasks.length} ${selectedTasks.length === 1 ? "seguimiento" : "seguimientos"}` : "Día disponible"}</h2></div>{!selectedTasks.length ? <div className={styles.empty}><CalendarDays aria-hidden="true"/><p>{visible.length ? "No hay tareas para esta fecha." : tasks.length ? "Los filtros no tienen resultados." : "Todavía no hay tareas programadas."}</p></div> : <ul>{selectedTasks.map(task => { const overdue = isOverdue(task, new Date(initialToday)); const relation = taskRelation(task, directory); return <li key={task.id}><Link href={`/tareas/${task.id}`}><div><span className={styles.taskTime}>{time.format(new Date(task.fecha_vencimiento))}</span><strong>{task.titulo}</strong></div><p>{task.estado}{isOpenTask(task) ? overdue ? " · Vencida" : " · Próxima" : ""} · {task.prioridad}</p><p>{ownerName(task.responsable_id)}{relation ? ` · ${relation.label}` : " · Tarea general"}</p></Link></li>; })}</ul>}</aside>
    </div>}
  </div>;
}
