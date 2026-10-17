import { toCents } from "@/features/opportunities/money";
import type { Client } from "@/features/clients/types";
import type { Lead } from "@/features/leads/types";
import type { Opportunity } from "@/features/opportunities/types";
import type { Sale } from "@/features/sales/types";
import type { Task } from "@/features/tasks/types";

export type ReportPeriod = "month" | "previous" | "quarter" | "year";
export type ReportData = { clients: Client[]; leads: Lead[]; opportunities: Opportunity[]; sales: Sale[]; tasks: Task[] };

const POSTGRES_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function calendarDateKey(value: string) {
  const match = POSTGRES_DATE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? value : null;
}

export function limaDateKey(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
export function periodBounds(period: ReportPeriod, now = new Date()) {
  const today = limaDateKey(now);
  const [year, month] = today.split("-").map(Number);
  const startMonth = period === "quarter" ? month - 2 : period === "year" ? 1 : period === "previous" ? month - 1 : month;
  const startYear = startMonth < 1 ? year - 1 : year;
  const normalizedMonth = startMonth < 1 ? startMonth + 12 : startMonth;
  const start = `${startYear}-${String(normalizedMonth).padStart(2, "0")}-01`;
  const previousEnd = new Date(Date.UTC(year, month - 1, 0));
  const end = period === "previous" ? previousEnd.toISOString().slice(0, 10) : `${year}-${String(month).padStart(2, "0")}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0")}`;
  return { start, end, label: period === "month" ? "Mes actual" : period === "previous" ? "Mes anterior" : period === "quarter" ? "Últimos 3 meses" : "Año actual" };
}
const inCalendarPeriod = (value: string | null, start: string, end: string) => {
  const key = value ? calendarDateKey(value) : null;
  return Boolean(key && key >= start && key <= end);
};
const inInstantPeriod = (value: string | null, start: string, end: string) => Boolean(value && limaDateKey(value) >= start && limaDateKey(value) <= end);
const sum = <T,>(rows: T[], select: (row: T) => string) => rows.reduce((total, row) => total + toCents(select(row)), BigInt(0));

export function reportMetrics(data: ReportData, period: ReportPeriod, now = new Date()) {
  const bounds = periodBounds(period, now);
  const periodClients = data.clients.filter((row) => inInstantPeriod(row.createdAt, bounds.start, bounds.end));
  const periodLeads = data.leads.filter((row) => inInstantPeriod(row.created_at, bounds.start, bounds.end));
  const periodOpportunities = data.opportunities.filter((row) => inInstantPeriod(row.created_at, bounds.start, bounds.end));
  const periodSales = data.sales.filter((row) => inCalendarPeriod(row.fecha_venta, bounds.start, bounds.end));
  const paid = data.sales.filter((row) => row.estado === "Pagada" && inCalendarPeriod(row.fecha_pago, bounds.start, bounds.end));
  const pending = periodSales.filter((row) => row.estado === "Pendiente");
  const openOpportunities = periodOpportunities.filter((row) => !["Ganada", "Perdida"].includes(row.etapa));
  const weighted = openOpportunities.reduce((total, row) => total + toCents(row.valor) * BigInt(row.probabilidad), BigInt(0));
  const today = limaDateKey(now);
  return {
    bounds,
    clients: { total: data.clients.length, active: data.clients.filter((row) => row.status === "Activo").length, prospects: data.clients.filter((row) => row.status === "Prospecto").length, new: periodClients.length },
    leads: { total: periodLeads.length, converted: periodLeads.filter((row) => row.estado === "Convertido" && row.convertido_cliente_id).length },
    opportunities: { total: periodOpportunities.length, won: periodOpportunities.filter((row) => row.etapa === "Ganada").length, lost: periodOpportunities.filter((row) => row.etapa === "Perdida").length, pipeline: sum(openOpportunities, (row) => row.valor), weighted: (weighted + BigInt(50)) / BigInt(100) },
    sales: { total: periodSales.filter((row) => row.estado !== "Cancelada").length, registered: sum(periodSales.filter((row) => row.estado !== "Cancelada"), (row) => row.total), paid: sum(paid, (row) => row.total), pending: sum(pending, (row) => row.total) },
    tasks: { pending: data.tasks.filter((row) => ["Pendiente", "En progreso"].includes(row.estado)).length, completed: data.tasks.filter((row) => row.estado === "Completada" && inInstantPeriod(row.completada_at, bounds.start, bounds.end)).length, overdue: data.tasks.filter((row) => ["Pendiente", "En progreso"].includes(row.estado) && (calendarDateKey(row.fecha_vencimiento) ?? "") < today).length, upcoming: data.tasks.filter((row) => ["Pendiente", "En progreso"].includes(row.estado) && (calendarDateKey(row.fecha_vencimiento) ?? "") >= today).length },
    leadStates: ["Nuevo", "Contactado", "Calificado", "No interesado", "Convertido"].map((name) => ({ name, value: periodLeads.filter((row) => row.estado === name).length })),
    opportunityStages: ["Nueva", "Contacto", "Propuesta", "Negociación", "Ganada", "Perdida"].map((name) => ({ name, value: periodOpportunities.filter((row) => row.etapa === name).length })),
  };
}
