"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getClientes } from "@/features/clients/services/clients.service";
import { getLeads } from "@/features/leads/services/leads.service";
import { getOpportunities } from "@/features/opportunities/services/opportunities.service";
import { getSales } from "@/features/sales/services/sales.service";
import { leadName } from "@/features/leads/types";
import { getTasks, getTaskResponsibles } from "./services/tasks.service";
import type { RelationType, Task, TaskResponsible } from "./types";
export type TaskRelation = { id: string; type: Exclude<RelationType, "Ninguno">; label: string; href: string; ownerId?: string | null };
export type TasksDirectory = { responsibles: TaskResponsible[]; relations: TaskRelation[] };
export async function getTasksDirectory(): Promise<TasksDirectory> {
  const [clients, leads, opportunities, sales, responsibles] = await Promise.all([getClientes(), getLeads(), getOpportunities(), getSales(), getTaskResponsibles()]);
  return { responsibles, relations: [
    ...clients.map((row): TaskRelation => ({ id: row.id, type: "Cliente", label: row.name, href: `/clientes?buscar=${encodeURIComponent(row.id)}` })),
    ...leads.map((row): TaskRelation => ({ id: row.id, type: "Lead", label: leadName(row), href: `/leads?buscar=${encodeURIComponent(row.id)}`, ownerId: row.responsable_id })),
    ...opportunities.map((row): TaskRelation => ({ id: row.id, type: "Oportunidad", label: row.titulo, href: `/oportunidades?buscar=${encodeURIComponent(row.id)}`, ownerId: row.responsable_id })),
    ...sales.map((row): TaskRelation => ({ id: row.id, type: "Venta", label: `${row.numero} · ${clients.find((client) => client.id === row.cliente_id)?.name ?? "Cliente"}`, href: `/ventas/${row.id}`, ownerId: row.responsable_id })),
  ] };
}
export function taskRelation(task: Task, directory: TasksDirectory): TaskRelation | undefined {
  const [type, id]: [RelationType, string | null] = task.cliente_id ? ["Cliente", task.cliente_id] : task.lead_id ? ["Lead", task.lead_id] : task.oportunidad_id ? ["Oportunidad", task.oportunidad_id] : task.venta_id ? ["Venta", task.venta_id] : ["Ninguno", null];
  return directory.relations.find((row) => row.id === id && row.type === type);
}
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [directory, setDirectory] = useState<TasksDirectory>({ responsibles: [], relations: [] });
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const version = useRef(0);
  const invalidate = useCallback(() => { ++version.current; }, []);
  const reload = useCallback(async () => {
    const request = ++version.current;
    setLoading(true); setError("");
    try { const [rows, lookup] = await Promise.all([getTasks(), getTasksDirectory()]); if (request === version.current) { setTasks(rows); setDirectory(lookup); setLoaded(true); } }
    catch (cause) { if (request === version.current) setError(cause instanceof Error ? cause.message : "No se pudieron cargar las tareas."); }
    finally { if (request === version.current) setLoading(false); }
  }, []);
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void reload(); }); return () => { active = false; invalidate(); }; }, [reload, invalidate]);
  function saved(task: Task) { ++version.current; setLoading(false); setTasks((rows) => rows.some((row) => row.id === task.id) ? rows.map((row) => row.id === task.id ? task : row) : [task, ...rows]); }
  function removed(id: string) { ++version.current; setLoading(false); setTasks((rows) => rows.filter((row) => row.id !== id)); }
  return { tasks, directory, loading, loaded, error, reload, saved, removed };
}
