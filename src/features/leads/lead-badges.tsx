import { Badge } from "@/components/ui/badge";
import { isOpenLead, limaDay, formatLeadDate } from "./dates";
import type { Lead, LeadEstado, LeadPrioridad } from "./types";

const states: Record<LeadEstado, string> = {
  Nuevo: "border-blue-100 bg-blue-50 text-blue-700",
  Contactado: "border-violet-100 bg-violet-50 text-violet-700",
  Calificado: "border-emerald-100 bg-emerald-50 text-emerald-700",
  "No interesado": "border-slate-200 bg-slate-100 text-slate-500",
  Convertido: "border-teal-100 bg-teal-50 text-teal-700",
};
export function LeadStateBadge({ state }: { state: LeadEstado }) {
  return <Badge variant="outline" className={`font-medium ${states[state]}`}>{state}</Badge>;
}
export function LeadPriorityBadge({ priority }: { priority: LeadPrioridad }) {
  const colors = { Alta: "text-rose-700", Media: "text-amber-700", Baja: "text-slate-500" };
  return <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${colors[priority]}`}><span className="size-1.5 rounded-full bg-current" aria-hidden="true" />{priority}</span>;
}
export function FollowupLabel({ lead, now }: { lead: Lead; now: Date }) {
  if (!lead.proximo_seguimiento) return <span className="text-xs text-slate-400">Sin programar</span>;
  const date = new Date(lead.proximo_seguimiento);
  const overdue = isOpenLead(lead) && date < now;
  const today = limaDay(date) === limaDay(now);
  return <span className={`block text-xs ${overdue ? "text-amber-700" : "text-slate-500"}`}><span>{today ? `Hoy · ${new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false }).format(date)}` : formatLeadDate(lead.proximo_seguimiento)}</span>{overdue && <span className="mt-1 block text-[10px] font-semibold">Vencido</span>}</span>;
}
