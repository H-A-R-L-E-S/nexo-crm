"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import styles from "./sale-detail.module.css";

export function SaleDetailView({ id, today }: { id: string; today: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [directory, setDirectory] = useState<SalesDirectory>({ clients: [], opportunities: [], responsibles: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void Promise.all([getSaleDetail(id), getClientes(), getOpportunities(), getSaleResponsibles()])
      .then(([data, clients, opportunities, responsibles]) => { if (active) { setDetail(data); setDirectory({ clients, opportunities, responsibles }); setError(""); } })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "No se pudo cargar el detalle."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, attempt]);
  function retry() { setLoading(true); setError(""); setAttempt(attempt + 1); }
  if (loading) return <p role="status" className={styles.state}>Cargando detalle de venta...</p>;
  if (error || !detail) return <div className={styles.state}><p role="alert">{error || "Venta no disponible."}</p><div><Button variant="outline" onClick={retry}>Reintentar</Button><Button asChild variant="ghost"><Link href="/ventas">Volver a Ventas</Link></Button></div></div>;
  const sale = detail.sale;
  const client = directory.clients.find((row) => row.id === sale.cliente_id);
  const opportunity = directory.opportunities.find((row) => row.id === sale.oportunidad_id);
  const owner = directory.responsibles.find((row) => row.id === sale.responsable_id);
  const fields = { Responsable: owner ? `${responsableName(owner)}${owner.activo ? "" : " (inactivo)"}` : "Sin asignar", "Fecha de venta": estimatedDate(sale.fecha_venta), "Fecha de pago": estimatedDate(sale.fecha_pago), "Método de pago": sale.metodo_pago || "Sin registrar", Referencia: sale.referencia_pago || "Sin referencia", Moneda: "PEN · Sol peruano", Creación: formatLeadDate(sale.created_at), Actualización: formatLeadDate(sale.updated_at) };
  return <div className={styles.page}>
    <Button asChild variant="ghost" className="-ml-3"><Link href="/ventas"><ArrowLeft aria-hidden="true" />Volver a Ventas</Link></Button>
    <header className={styles.hero}>
      <div className={styles.identity}><p>Operación comercial</p><h1>{sale.numero}</h1><SaleStateBadge state={sale.estado} /></div>
      <div className={styles.total}><span>Total de la venta</span><strong>{formatMoney(sale.total)}</strong><small>{sale.aplica_igv ? "Incluye IGV" : "Sin IGV"}</small></div>
      <div className={styles.actions}><SaleActions sale={sale} directory={directory} today={today} showDetail={false} onSaved={(saved) => setDetail({ ...detail, sale: saved })} onEdited={setDetail} onDeleted={() => router.push("/ventas")} /></div>
    </header>
    <section className={styles.info} aria-label="Datos de la venta">
      <div className={styles.relationships}><div><span>Cliente</span><Link href={`/clientes?buscar=${encodeURIComponent(sale.cliente_id)}`}>{client?.name ?? "Ver cliente"}</Link></div><div><span>Oportunidad</span>{opportunity ? <p>{opportunity.titulo} · {opportunity.etapa}</p> : <p>Sin oportunidad relacionada</p>}</div></div>
      <dl className={styles.metadata}>{Object.entries(fields).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {sale.estado === "Pagada" && <p className={styles.success}>Pago registrado. Los datos y los ítems están bloqueados para edición.</p>}
      {sale.estado === "Cancelada" && <div className={styles.danger}><p>Venta cancelada · {formatLeadDate(sale.cancelada_at)}</p><p>{sale.motivo_cancelacion}</p><small>Los datos originales se conservan y esta venta no cuenta como ingreso.</small></div>}
    </section>
    <section className={styles.items} aria-label="Ítems de la venta">
      <header><div><p>Desglose</p><h2>Productos y servicios</h2></div><span>{detail.items.length} {detail.items.length === 1 ? "ítem" : "ítems"}</span></header>
      <div className={styles.tableWrap}><table><caption className="sr-only">Ítems, cantidades e importes de la venta</caption><thead><tr>{["Descripción", "Cantidad", "Precio unitario", "Subtotal", "Descuento", "Importe neto"].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{detail.items.map((item) => <tr key={item.id}><th scope="row">{item.descripcion}</th><td data-label="Cantidad">{item.cantidad}</td><td data-label="Precio unitario">{formatMoney(item.precio_unitario)}</td><td data-label="Subtotal">{formatMoney(item.subtotal)}</td><td data-label="Descuento">{formatMoney(item.descuento)}</td><td data-label="Importe neto">{formatCents(toCents(item.subtotal) - toCents(item.descuento))}</td></tr>)}</tbody></table></div>
      <div className={styles.summary}><p>IGV {sale.aplica_igv ? "18% sobre el importe neto" : "no aplicado"}. Importes calculados al guardar.</p><SaleSummary amounts={storedAmounts(sale)} /></div>
    </section>
    <section className={styles.notes}><h2>Observaciones</h2><p>{sale.observaciones || "Sin observaciones"}</p></section>
  </div>;
}
