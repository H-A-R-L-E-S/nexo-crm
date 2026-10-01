import { limaDay } from "@/features/leads/dates";
import { toCents } from "@/features/opportunities/money";
import type { Sale } from "./types";
export function salesStats(sales: Sale[], now: Date) {
  const active = sales.filter((sale) => sale.estado !== "Cancelada");
  return { total: active.length, paid: active.filter((sale) => sale.estado === "Pagada").reduce((sum, sale) => sum + toCents(sale.total), BigInt(0)), pending: active.filter((sale) => sale.estado === "Pendiente").reduce((sum, sale) => sum + toCents(sale.total), BigInt(0)), pendingCount: active.filter((sale) => sale.estado === "Pendiente").length, month: active.filter((sale) => sale.fecha_venta.slice(0, 7) === limaDay(now).slice(0, 7)).length };
}
