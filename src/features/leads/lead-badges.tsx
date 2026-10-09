import styles from "@/components/crm/directory.module.css";
import { isOpenLead, limaDay, formatLeadDate } from "./dates";
import type { Lead, LeadEstado, LeadPrioridad } from "./types";

export function LeadStateBadge({ state }: { state: LeadEstado }) {
  return <span className={styles.status} data-status={state}>{state}</span>;
}
export function LeadPriorityBadge({ priority }: { priority: LeadPrioridad }) {
  const colors = { Alta: "text-[var(--danger)]", Media: "text-[var(--status-prospect)]", Baja: "text-muted-foreground" };
  return <span className={`text-xs font-medium ${colors[priority]}`}>{priority}</span>;
}
export function FollowupLabel({ lead, now }: { lead: Lead; now: Date }) {
  if (!lead.proximo_seguimiento) return <span className="text-xs text-muted-foreground">Sin programar</span>;
  const date = new Date(lead.proximo_seguimiento);
  const overdue = isOpenLead(lead) && date < now;
  const today = limaDay(date) === limaDay(now);
  return <span className={`block text-xs ${overdue ? "text-[var(--status-prospect)]" : "text-muted-foreground"}`}><span>{today ? `Hoy · ${new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false }).format(date)}` : formatLeadDate(lead.proximo_seguimiento)}</span>{overdue && <span className="mt-1 block text-xs font-medium">Vencido</span>}</span>;
}
