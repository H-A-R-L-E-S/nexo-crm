import type { Lead } from "./types";

const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" });
const dateFormat = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
export const isOpenLead = (lead: Lead) => lead.estado !== "Convertido" && lead.estado !== "No interesado";
export const limaDay = (date: Date) => dayFormat.format(date);
export const formatLeadDate = (value: string | null) => value ? dateFormat.format(new Date(value)) : "Sin registrar";
export function isPendingFollowup(lead: Lead, now: Date) {
  return isOpenLead(lead) && Boolean(lead.proximo_seguimiento && limaDay(new Date(lead.proximo_seguimiento)) <= limaDay(now));
}
export function toLimaInput(value: string | null) {
  return value ? new Date(new Date(value).getTime() - 5 * 3600_000).toISOString().slice(0, 16) : "";
}
export function fromLimaInput(value: string) {
  if (!value) return null;
  const date = new Date(`${value}:00-05:00`);
  if (!Number.isFinite(date.getTime())) throw new Error("Ingresa una fecha y hora válidas.");
  return date.toISOString();
}
