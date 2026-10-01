import { formatCents, toCents } from "@/features/opportunities/money";
import type { Sale } from "./types";
export function SaleSummary({ amounts }: { amounts: { subtotal: bigint; discount: bigint; tax: bigint; total: bigint } }) {
  const lines = [{ label: "Subtotal", value: amounts.subtotal }, { label: "Descuento", value: amounts.discount }, { label: "IGV", value: amounts.tax }, { label: "Total", value: amounts.total }];
  return <dl className="ml-auto w-full max-w-sm space-y-2 rounded-xl border border-blue-100 bg-blue-50/50 p-4">{lines.map((line) => <div key={line.label} className={`flex justify-between gap-4 ${line.label === "Total" ? "border-t border-blue-100 pt-3 font-semibold" : "text-sm text-slate-600"}`}><dt>{line.label}</dt><dd className="break-all text-right">{formatCents(line.value)}</dd></div>)}</dl>;
}
export const storedAmounts = (sale: Sale) => ({ subtotal: toCents(sale.subtotal), discount: toCents(sale.descuento), tax: toCents(sale.impuesto), total: toCents(sale.total) });
