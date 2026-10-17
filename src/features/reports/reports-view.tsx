"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getClientes } from "@/features/clients/services/clients.service";
import { getLeads } from "@/features/leads/services/leads.service";
import { getOpportunities } from "@/features/opportunities/services/opportunities.service";
import { getSales } from "@/features/sales/services/sales.service";
import { getTasks } from "@/features/tasks/services/tasks.service";
import { formatCents } from "@/features/opportunities/money";
import { reportMetrics, type ReportData, type ReportPeriod } from "./metrics";
import styles from "./reports.module.css";

const empty: ReportData = { clients: [], leads: [], opportunities: [], sales: [], tasks: [] };
const nf = new Intl.NumberFormat("es-PE");
function Distribution({ title, rows }: { title: string; rows: { name: string; value: number }[] }) {
  const headingId = useId();
  const maximum = Math.max(1, ...rows.map((row) => row.value));
  return <section className={styles.panel} aria-labelledby={headingId}><h2 id={headingId} className={styles.sectionTitle}>{title}</h2><div className={styles.bars}>{rows.map((row) => <div key={row.name} className={styles.barRow}><span>{row.name}</span><span className={styles.track} aria-hidden="true"><span style={{ width: `${row.value / maximum * 100}%` }} /></span><strong>{nf.format(row.value)}</strong></div>)}</div><div className="sr-only"><table><caption>{title}</caption><tbody>{rows.map((row) => <tr key={row.name}><th scope="row">{row.name}</th><td>{row.value}</td></tr>)}</tbody></table></div></section>;
}
function safeCsv(value: string | number) { const text = String(value); const safe = /^[=+\-@]/.test(text) ? `'${text}` : text; return `"${safe.replaceAll('"', '""')}"`; }

export function ReportsView() {
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [data, setData] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const load = useCallback(async () => {
    setLoading(true); setErrors([]);
    const results = await Promise.allSettled([getClientes(), getLeads(), getOpportunities(), getSales(), getTasks()]);
    const names = ["clientes", "leads", "oportunidades", "ventas", "tareas"];
    setData({ clients: results[0].status === "fulfilled" ? results[0].value : [], leads: results[1].status === "fulfilled" ? results[1].value : [], opportunities: results[2].status === "fulfilled" ? results[2].value : [], sales: results[3].status === "fulfilled" ? results[3].value : [], tasks: results[4].status === "fulfilled" ? results[4].value : [] });
    setErrors(results.flatMap((result, index) => result.status === "rejected" ? [`No se pudo cargar ${names[index]}.`] : [])); setLoading(false);
  }, []);
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load(); }); return () => { active = false; }; }, [load]);
  const metrics = useMemo(() => reportMetrics(data, period), [data, period]);
  const exportCsv = () => {
    const rows = [["Indicador", "Valor", "Periodo"], ["Clientes nuevos", metrics.clients.new, metrics.bounds.label], ["Leads registrados", metrics.leads.total, metrics.bounds.label], ["Oportunidades", metrics.opportunities.total, metrics.bounds.label], ["Ventas registradas", formatCents(metrics.sales.registered), metrics.bounds.label], ["Importe cobrado", formatCents(metrics.sales.paid), metrics.bounds.label], ["Importe pendiente", formatCents(metrics.sales.pending), metrics.bounds.label]];
    const blob = new Blob(["\uFEFF" + rows.map((row) => row.map(safeCsv).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `nexo-reporte-${metrics.bounds.start}-${metrics.bounds.end}.csv`; link.click(); URL.revokeObjectURL(link.href);
  };
  if (loading) return <div role="status" className={styles.state}><p>Cargando datos autorizados del reporte…</p><div className={styles.skeleton} aria-hidden="true" /></div>;
  const noData = Object.values(data).every((rows) => rows.length === 0);
  return <div className={styles.page}>
    <header className={styles.heading}><div><h1>Reportes</h1><p>Una lectura verificable de cartera, pipeline, cobros y seguimiento.</p></div><div className={styles.actions}><label>Período<select value={period} onChange={(event) => setPeriod(event.target.value as ReportPeriod)}><option value="month">Mes actual</option><option value="previous">Mes anterior</option><option value="quarter">Últimos 3 meses</option><option value="year">Año actual</option></select></label><Button variant="outline" onClick={exportCsv} disabled={noData}><Download aria-hidden="true" />Exportar CSV</Button></div></header>
    {errors.length > 0 && <div role="alert" className={styles.warning}><div><strong>Reporte parcial</strong><p>{errors.join(" ")} Las cifras restantes conservan su alcance autorizado.</p></div><Button variant="outline" onClick={() => void load()}><RefreshCw aria-hidden="true" />Reintentar</Button></div>}
    {noData ? <section className={styles.state}><h2>Sin datos disponibles</h2><p>No hay operaciones visibles para tu sesión o las consultas no pudieron completarse.</p></section> : <>
      <section aria-labelledby="executive-heading"><div className={styles.sectionHeading}><div><h2 id="executive-heading">Resumen ejecutivo</h2><p>{metrics.bounds.label}: {metrics.bounds.start} a {metrics.bounds.end}</p></div></div><div className={styles.metrics}>
        <article><span>Importe cobrado</span><strong>{formatCents(metrics.sales.paid)}</strong><small>Ventas pagadas por fecha de pago</small></article><article><span>Pipeline abierto</span><strong>{formatCents(metrics.opportunities.pipeline)}</strong><small>Oportunidades abiertas creadas en el período</small></article><article><span>Valor ponderado</span><strong>{formatCents(metrics.opportunities.weighted)}</strong><small>Valor × probabilidad vigente</small></article><article><span>Importe pendiente</span><strong>{formatCents(metrics.sales.pending)}</strong><small>Ventas pendientes del período</small></article>
      </div></section>
      <section className={styles.facts} aria-label="Indicadores comerciales"><div><span>Clientes totales</span><strong>{nf.format(metrics.clients.total)}</strong><small>{metrics.clients.active} activos · {metrics.clients.prospects} prospectos</small></div><div><span>Altas de clientes</span><strong>{nf.format(metrics.clients.new)}</strong><small>{metrics.bounds.label}</small></div><div><span>Leads registrados</span><strong>{nf.format(metrics.leads.total)}</strong><small>{metrics.leads.converted} convertidos con cliente</small></div><div><span>Oportunidades</span><strong>{nf.format(metrics.opportunities.total)}</strong><small>{metrics.opportunities.won} ganadas · {metrics.opportunities.lost} perdidas</small></div><div><span>Ventas registradas</span><strong>{nf.format(metrics.sales.total)}</strong><small>{formatCents(metrics.sales.registered)} emitido/no cancelado</small></div><div><span>Tareas abiertas</span><strong>{nf.format(metrics.tasks.pending)}</strong><small>{metrics.tasks.overdue} vencidas · {metrics.tasks.upcoming} próximas</small></div></section>
      <div className={styles.grid}><Distribution title="Leads por estado" rows={metrics.leadStates} /><Distribution title="Oportunidades por etapa" rows={metrics.opportunityStages} /></div>
      <section className={styles.panel}><h2 className={styles.sectionTitle}>Lectura operativa</h2><div className={styles.operational}><div><span>Tareas completadas</span><strong>{metrics.tasks.completed}</strong><small>Completadas en el período</small></div><div><span>Tareas vencidas</span><strong>{metrics.tasks.overdue}</strong><small>Abiertas con vencimiento anterior a hoy en Lima</small></div><div><span>Seguimientos próximos</span><strong>{metrics.tasks.upcoming}</strong><small>Tareas abiertas con vencimiento desde hoy</small></div></div></section>
    </>}
  </div>;
}
