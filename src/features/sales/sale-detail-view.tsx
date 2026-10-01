"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getClientes } from "@/features/clients/services/clients.service";
import { getOpportunities } from "@/features/opportunities/services/opportunities.service";
import { estimatedDate } from "@/features/opportunities/opportunity-actions";
import { formatMoney, formatCents, toCents } from "@/features/opportunities/money";
import { formatLeadDate } from "@/features/leads/dates";
import { responsableName } from "@/features/leads/types";
import { getSaleDetail, getSaleResponsibles } from "./services/sales.service";
import { SaleActions, SaleStateBadge } from "./sale-actions";
import { SaleSummary, storedAmounts } from "./sale-summary";
import type { SaleDetail } from "./types";
import type { SalesDirectory } from "./use-sales";

export function SaleDetailView({ id, today }: { id: string; today: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [directory, setDirectory] = useState<SalesDirectory>({ clients: [], opportunities: [], responsibles: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void Promise.all([getSaleDetail(id), getClientes(), getOpportunities(), getSaleResponsibles()]).then(([data, clients, opportunities, responsibles]) => { if (active) { setDetail(data); setDirectory({ clients, opportunities, responsibles }); setError(""); } }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "No se pudo cargar el detalle."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, attempt]);
  function retry() { setLoading(true); setError(""); setAttempt(attempt + 1); }
  if (loading) return <p role="status" className="p-12 text-center text-sm text-slate-500">Cargando detalle de venta...</p>;
  if (error || !detail) return <div className="space-y-4 rounded-xl border bg-white p-8"><p role="alert" className="text-sm text-red-700">{error || "Venta no disponible."}</p><Button variant="outline" onClick={retry}>Reintentar</Button><Button asChild variant="ghost"><Link href="/ventas">Volver a Ventas</Link></Button></div>;
  const sale = detail.sale;
  const client = directory.clients.find((row) => row.id === sale.cliente_id);
  const opportunity = directory.opportunities.find((row) => row.id === sale.oportunidad_id);
  const owner = directory.responsibles.find((row) => row.id === sale.responsable_id);
  const fields = { Responsable: owner ? `${responsableName(owner)}${owner.activo ? "" : " (inactivo)"}` : "Sin asignar", "Fecha de venta": estimatedDate(sale.fecha_venta), "Fecha de pago": estimatedDate(sale.fecha_pago), "Método de pago": sale.metodo_pago || "Sin registrar", Referencia: sale.referencia_pago || "Sin referencia", Moneda: "PEN · Sol peruano", Creación: formatLeadDate(sale.created_at), Actualización: formatLeadDate(sale.updated_at) };
  return <div className="min-w-0 space-y-6"><Button asChild variant="ghost" className="-ml-3"><Link href="/ventas"><ArrowLeft className="size-4" />Volver a Ventas</Link></Button><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">{sale.numero}</h1><div className="mt-2"><SaleStateBadge state={sale.estado} /></div></div><SaleActions sale={sale} directory={directory} today={today} showDetail={false} onSaved={(saved) => setDetail({ ...detail, sale: saved })} onEdited={setDetail} onDeleted={() => router.push("/ventas")} /></div>
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6" aria-label="Datos de la venta"><div className="grid gap-4 sm:grid-cols-2"><div><h2 className="text-xs text-slate-500">Cliente</h2><Link className="mt-1 block text-sm font-medium text-blue-700 underline" href={`/clientes?buscar=${encodeURIComponent(sale.cliente_id)}`}>{client?.name ?? "Ver cliente"}</Link></div><div><h2 className="text-xs text-slate-500">Oportunidad</h2>{opportunity ? <p className="mt-1 break-words text-sm">{opportunity.titulo} · {opportunity.etapa}</p> : <p className="mt-1 text-sm text-slate-500">Sin oportunidad relacionada</p>}</div></div><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(fields).map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm">{value}</dd></div>)}</dl>{sale.estado === "Pagada" && <p className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">Pago registrado. Los datos y los ítems están bloqueados para edición.</p>}{sale.estado === "Cancelada" && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800"><p className="font-semibold">Venta cancelada · {formatLeadDate(sale.cancelada_at)}</p><p className="mt-2 whitespace-pre-wrap break-words">{sale.motivo_cancelacion}</p><p className="mt-2 text-xs">Los datos originales se conservan y esta venta no cuenta como ingreso.</p></div>}</section>
    <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Ítems de la venta"><h2 className="p-5 text-sm font-semibold">Productos y servicios</h2><Table><TableHeader><TableRow>{["Descripción", "Cantidad", "Precio unitario", "Subtotal", "Descuento", "Importe neto"].map((label) => <TableHead key={label} className="px-4 text-xs">{label}</TableHead>)}</TableRow></TableHeader><TableBody>{detail.items.map((item) => <TableRow key={item.id}><TableCell className="max-w-80 whitespace-normal break-words px-4 py-4 text-sm">{item.descripcion}</TableCell><TableCell className="px-4 text-xs">{item.cantidad}</TableCell><TableCell className="px-4 text-xs">{formatMoney(item.precio_unitario)}</TableCell><TableCell className="px-4 text-xs">{formatMoney(item.subtotal)}</TableCell><TableCell className="px-4 text-xs">{formatMoney(item.descuento)}</TableCell><TableCell className="px-4 text-xs">{formatCents(toCents(item.subtotal) - toCents(item.descuento))}</TableCell></TableRow>)}</TableBody></Table><div className="space-y-3 p-5"><p className="text-xs text-slate-500">IGV {sale.aplica_igv ? "18% sobre el importe neto" : "no aplicado"}. Importes calculados al guardar.</p><SaleSummary amounts={storedAmounts(sale)} /></div></section><section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold">Observaciones</h2><p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">{sale.observaciones || "Sin observaciones"}</p></section></div>;
}
