"use client";
import { useEffect, useState } from "react";
import { RefreshCw, Search, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { responsableName } from "@/features/leads/types";
import { limaDay } from "@/features/leads/dates";
import { estimatedDate } from "@/features/opportunities/opportunity-actions";
import { formatCents, formatMoney } from "@/features/opportunities/money";
import { useSales } from "./use-sales";
import { SaleFormDialog } from "./sale-form";
import { SaleActions, SaleStateBadge } from "./sale-actions";
import { salesStats } from "./stats";
import { PAYMENT_METHODS, SALE_STATES } from "./types";
import styles from "./sales.module.css";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const emptyFilters = { state: "", client: "", owner: "", method: "", from: "", to: "" };
export function SalesView({ initialNow, initialOpportunityId, create = false }: { initialNow: string; initialOpportunityId?: string; create?: boolean }) {
  const { sales, directory, loading, loaded, error, reload, saved, removed } = useSales();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [now, setNow] = useState(() => new Date(initialNow));
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(timer); }, []);
  const clientName = (id: string) => directory.clients.find((client) => client.id === id)?.name ?? "Cliente no disponible";
  const ownerName = (id: string | null) => { const person = directory.responsibles.find((owner) => owner.id === id); return person ? `${responsableName(person)}${person.activo ? "" : " (inactivo)"}` : "Sin asignar"; };
  const filtered = sales.filter((sale) => normalize(`${sale.numero} ${clientName(sale.cliente_id)} ${sale.referencia_pago}`).includes(normalize(query.trim())) && (!filters.state || sale.estado === filters.state) && (!filters.client || sale.cliente_id === filters.client) && (!filters.owner || (sale.responsable_id ?? "none") === filters.owner) && (!filters.method || (sale.metodo_pago || "none") === filters.method) && (!filters.from || sale.fecha_venta >= filters.from) && (!filters.to || sale.fecha_venta <= filters.to));
  const stats = salesStats(sales, now);
  const summary = [{ label: "Ventas registradas", value: String(stats.total), detail: "No canceladas · Incluye borradores" }, { label: "Pendiente de cobro", value: formatCents(stats.pending), detail: `${stats.pendingCount} ventas pendientes` }, { label: "Ventas este mes", value: String(stats.month), detail: "Fecha de venta · Lima" }];
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * 10, current * 10);
  const activeEntries = (Object.keys(filters) as (keyof typeof filters)[]).filter((key) => filters[key]);
  const hasFilters = Boolean(query || activeEntries.length);
  function change(key: keyof typeof emptyFilters, value: string) { setFilters((currentFilters) => ({ ...currentFilters, [key]: value })); setPage(1); }
  function clear() { setFilters(emptyFilters); setQuery(""); setPage(1); }
  const filterLabel = (key: keyof typeof filters) => ({ state: "Estado", client: "Cliente", owner: "Responsable", method: "Pago", from: "Desde", to: "Hasta" })[key];
  const filterValue = (key: keyof typeof filters) => key === "client" ? clientName(filters[key]) : key === "owner" ? ownerName(filters[key] === "none" ? null : filters[key]) : filters[key] === "none" ? "Sin registrar" : filters[key];
  const actions = (sale: typeof sales[number]) => <SaleActions sale={sale} directory={directory} today={limaDay(now)} onSaved={saved} onDeleted={removed} />;
  return <div className={styles.page} data-sales-page>
    <header className={styles.header}><div><p className={styles.eyebrow}>Operaciones comerciales</p><h1>Ventas</h1><p>Controla importes, cobros y estado de cada operación.</p></div>{loaded ? <SaleFormDialog directory={directory} today={limaDay(now)} onSaved={(detail) => saved(detail.sale)} initialOpportunityId={initialOpportunityId} defaultOpen={create} disabled={loading || Boolean(error)} /> : <Button disabled>Nueva venta</Button>}</header>
    <section aria-label="Resumen de ventas" className={styles.summary} aria-busy={loading}><div className={styles.revenue}><p>Ingresos pagados</p><strong>{loaded && !error ? formatCents(stats.paid) : "—"}</strong><span>Histórico de ventas Pagadas</span></div><dl>{summary.map((metric) => <div key={metric.label}><dt>{metric.label}</dt><dd>{loaded && !error ? metric.value : "—"}</dd><dd>{metric.detail}</dd></div>)}</dl></section>
    <section aria-label="Filtros de ventas" className={styles.filters}><div className={styles.searchRow}><div className={styles.search}><Search aria-hidden="true" /><Input aria-label="Buscar ventas" placeholder="Número, cliente o referencia" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></div><Button variant="outline" disabled={loading} onClick={() => void reload()}><RefreshCw aria-hidden="true" />{loading ? "Cargando..." : "Actualizar"}</Button></div>
      <div className={styles.filterGrid}>
        <label><span>Estado</span><select aria-label="Filtrar por estado" value={filters.state} onChange={(event) => change("state", event.target.value)}><option value="">Todos los estados</option>{SALE_STATES.map((state) => <option key={state}>{state}</option>)}</select></label>
        <label><span>Responsable</span><select aria-label="Filtrar por responsable" value={filters.owner} onChange={(event) => change("owner", event.target.value)}><option value="">Todos</option><option value="none">Sin asignar</option>{directory.responsibles.map((person) => <option key={person.id} value={person.id}>{ownerName(person.id)}</option>)}</select></label>
        <label><span>Cliente</span><select aria-label="Filtrar por cliente" value={filters.client} onChange={(event) => change("client", event.target.value)}><option value="">Todos los clientes</option>{directory.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
        <label><span>Método de pago</span><select aria-label="Filtrar por método de pago" value={filters.method} onChange={(event) => change("method", event.target.value)}><option value="">Todos</option><option value="none">Sin registrar</option>{PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}</select></label>
        <label><span>Fecha desde</span><Input type="date" aria-label="Fecha desde" value={filters.from} onChange={(event) => change("from", event.target.value)} /></label><label><span>Fecha hasta</span><Input type="date" aria-label="Fecha hasta" value={filters.to} onChange={(event) => change("to", event.target.value)} /></label>
      </div>
      {hasFilters && <div className={styles.activeFilters} aria-label="Filtros activos">{query && <button type="button" onClick={() => setQuery("")}>Búsqueda: {query}<X aria-hidden="true" /></button>}{activeEntries.map((key) => <button key={key} type="button" onClick={() => change(key, "")}>{filterLabel(key)}: {filterValue(key)}<X aria-hidden="true" /></button>)}<Button variant="ghost" size="sm" onClick={clear}>Limpiar filtros</Button></div>}
      {filters.from && filters.to && filters.from > filters.to && <p role="alert" className={styles.warning}>La fecha inicial debe ser anterior o igual a la final.</p>}
    </section>
    <section aria-label="Listado de ventas" className={styles.workspace} aria-busy={loading}><div className={styles.listHeader}><div><h2>Operaciones</h2><p>{loaded ? `${filtered.length} ventas visibles · indicadores globales` : "Preparando el listado"}</p></div></div>
      {error ? <div role="alert" className={styles.state}><h2>No pudimos cargar las ventas</h2><p>{error}</p><Button variant="outline" onClick={() => void reload()}>Reintentar</Button></div> : !loaded ? <div role="status" className={styles.state}>Cargando ventas...</div> : !filtered.length ? <div className={styles.state}><ShoppingBag aria-hidden="true" /><h2>{sales.length ? "Sin ventas para estos filtros" : "Todavía no hay ventas"}</h2><p>{sales.length ? "Prueba otra búsqueda o limpia los filtros." : "Registra tu primera venta o créala desde una oportunidad Ganada."}</p></div> : <>
        <div className={styles.tableWrap}><table className={styles.table}><caption className="sr-only">Ventas con cliente, fecha, estado, total, responsable, método de pago y acciones</caption><thead><tr>{["Número", "Cliente", "Fecha", "Estado", "Total", "Responsable", "Método de pago", "Acciones"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{rows.map((sale) => <tr key={sale.id}><th scope="row">{sale.numero}</th><td data-label="Cliente" title={clientName(sale.cliente_id)}>{clientName(sale.cliente_id)}</td><td data-label="Fecha">{estimatedDate(sale.fecha_venta)}</td><td data-label="Estado"><SaleStateBadge state={sale.estado} /></td><td data-label="Total" className={styles.amount}>{formatMoney(sale.total)}</td><td data-label="Responsable">{ownerName(sale.responsable_id)}</td><td data-label="Método de pago">{sale.metodo_pago || "Sin registrar"}</td><td data-label="Acciones">{actions(sale)}</td></tr>)}</tbody></table></div>
        <div className={styles.pagination}><p role="status">{filtered.length} ventas · Página {current} de {pages}</p><div><Button variant="outline" disabled={current === 1} onClick={() => setPage(current - 1)}>Anterior</Button><Button variant="outline" disabled={current === pages} onClick={() => setPage(current + 1)}>Siguiente</Button></div></div>
      </>}</section><p className={styles.footnote}>Importes en soles · Los indicadores no cambian al filtrar.</p>
  </div>;
}
