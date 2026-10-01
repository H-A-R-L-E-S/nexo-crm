import { limaDay } from "@/features/leads/dates";
import { toCents } from "./money";
import { isClosed, type Opportunity } from "./types";
export function opportunityStats(items: Opportunity[], now: Date) {
  const open = items.filter((item) => !isClosed(item.etapa));
  const won = items.filter((item) => item.etapa === "Ganada");
  const lost = items.filter((item) => item.etapa === "Perdida");
  const weightedHundredths = open.reduce((sum, item) => sum + toCents(item.valor) * BigInt(item.probabilidad), BigInt(0));
  return { open: open.length, pipeline: open.reduce((sum, item) => sum + toCents(item.valor), BigInt(0)), weighted: (weightedHundredths + BigInt(50)) / BigInt(100), won: won.length, lost: lost.length,
    wonMonth: won.filter((item) => item.cerrada_at && limaDay(new Date(item.cerrada_at)).slice(0, 7) === limaDay(now).slice(0, 7)).length,
    closeRate: won.length + lost.length ? won.length * 100 / (won.length + lost.length) : 0 };
}
