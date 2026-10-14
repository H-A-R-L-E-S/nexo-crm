"use client";

import { useEffect, useState } from "react";
import { CalendarDays, LayoutPanelLeft, List, RefreshCw, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActiveFilter, DirectoryEmpty, DirectoryHeader, DirectoryLoading } from "@/components/crm/directory";
import { responsableName } from "@/features/leads/types";
import { useOpportunities } from "./use-opportunities";
import { OpportunityFormDialog } from "./opportunity-form";
import { OpportunityActions, estimatedDate } from "./opportunity-actions";
import { StageBadge, StageControl } from "./opportunity-stage";
import { isClosed, OPPORTUNITY_STAGES, type Opportunity, type OpportunityStage } from "./types";
import { formatCents, formatMoney, toCents } from "./money";
import { opportunityStats } from "./stats";
import styles from "./opportunities.module.css";

const emptyFilters = { stage: "", owner: "", client: "", status: "", from: "", to: "" };
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function OpportunitiesView({ initialNow, initialClientId, initialLeadId, create = false, initialSearch = "" }: { initialNow: string; initialClientId?: string; initialLeadId?: string; create?: boolean; initialSearch?: string }) {
  const { items, directory, loading, loaded, error, reload, saved, removed } = useOpportunities();
  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const [selectedStage, setSelectedStage] = useState<OpportunityStage>("Nueva");
  const [query, setQuery] = useState(initialSearch);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [now, setNow] = useState(() => new Date(initialNow));
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(timer); }, []);
  const clientName = (id: string) => directory.clients.find((client) => client.id === id)?.name ?? "Cliente no disponible";
  const ownerName = (id: string | null) => { const owner = directory.responsibles.find((person) => person.id === id); return owner ? `${responsableName(owner)}${owner.activo ? "" : " (inactivo)"}` : "Sin asignar"; };
  const filtered = items.filter((item) => normalize(`${item.id} ${item.titulo} ${clientName(item.cliente_id)} ${item.origen}`).includes(normalize(query.trim())) && (!filters.stage || item.etapa === filters.stage) && (!filters.owner || (item.responsable_id ?? "none") === filters.owner) && (!filters.client || item.cliente_id === filters.client) && (!filters.status || isClosed(item.etapa) === (filters.status === "closed")) && (!filters.from || Boolean(item.fecha_cierre_estimada && item.fecha_cierre_estimada >= filters.from)) && (!filters.to || Boolean(item.fecha_cierre_estimada && item.fecha_cierre_estimada <= filters.to)));
  const stats = opportunityStats(items, now);
  const summary = [
    { label: "Oportunidades abiertas", value: String(stats.open), detail: "Nueva, Contacto, Propuesta y Negociación" },
    { label: "Ganadas este mes", value: String(stats.wonMonth), detail: "Según cierre real · Hora de Lima" },
    { label: "Tasa de cierre", value: `${stats.closeRate.toLocaleString("es-PE", { maximumFractionDigits: 1 })}%`, detail: `${stats.won} ganadas / ${stats.won + stats.lost} cerradas · Histórico` },
  ];
  const ready = loaded && !error;
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  const hasFilters = Boolean(query || Object.values(filters).some(Boolean));
  const mobileStage = filters.stage || selectedStage;
  const filterLabels: Record<keyof typeof emptyFilters, string> = { stage: "Etapa", owner: "Responsable", client: "Cliente", status: "Estado", from: "Desde", to: "Hasta" };
  function changeFilter(key: keyof typeof emptyFilters, value: string) { setFilters({ ...filters, [key]: value }); setPage(1); }
  function clearFilters() { setQuery(""); setFilters(emptyFilters); setPage(1); }
  function saveAndReveal(item: Opportunity) { saved(item); setSelectedStage(item.etapa); }
  const actions = (item: Opportunity) => <OpportunityActions item={item} directory={directory} onSaved={saveAndReveal} onDeleted={removed} />;
  function filterValue(key: keyof typeof emptyFilters) {
    if (key === "owner") return filters.owner === "none" ? "Sin asignar" : ownerName(filters.owner);
    if (key === "client") return clientName(filters.client);
    if (key === "status") return filters.status === "open" ? "Abiertas" : "Cerradas";
    if (key === "from" || key === "to") return estimatedDate(filters[key]);
    return filters[key];
  }
  function card(item: Opportunity, showStage = false) {
    return <article key={item.id} aria-label={item.titulo} className={styles.card} data-stage={item.etapa}>
      <div className={styles.cardIdentity}><h3>{item.titulo}</h3><p>{clientName(item.cliente_id)}</p></div>
      {showStage && <StageBadge stage={item.etapa} />}
      <p className={styles.cardValue}>{formatMoney(item.valor)}</p>
      <div className={styles.probability}><span>Probabilidad</span><strong>{item.probabilidad}%</strong></div>
      <div aria-hidden="true" className={styles.probabilityTrack}><span style={{ width: `${item.probabilidad}%` }} /></div>
      <div className={styles.cardMeta}><p><UserRound aria-hidden="true" /><span>{ownerName(item.responsable_id)}</span></p><p><CalendarDays aria-hidden="true" /><span>Cierre: {estimatedDate(item.fecha_cierre_estimada)}</span></p></div>
      <div className={styles.cardFooter}><StageControl item={item} onSaved={saveAndReveal} /><div className={styles.cardActions}>{actions(item)}</div></div>
    </article>;
  }

  return <div className={styles.page} data-opportunities-page>
    <DirectoryHeader title="Oportunidades" description="Cada propuesta, desde el primer contacto hasta el cierre." count={items.length} loading={!ready} actions={loaded ? <OpportunityFormDialog directory={directory} onSaved={saveAndReveal} initialClientId={initialClientId} initialLeadId={initialLeadId} defaultOpen={create} disabled={loading || Boolean(error)} /> : <Button disabled>Nueva oportunidad</Button>} />
    <section aria-label="Resumen comercial" className={styles.summary} aria-busy={loading}>
      <div className={styles.pipelineValue}><p>Valor del pipeline</p><p className={styles.total}>{ready ? formatCents(stats.pipeline) : <><span className={styles.metricSkeleton} aria-hidden="true" /><span className="sr-only">{error ? "No disponible" : "Cargando"}</span></>}</p><p className={styles.weighted}>{ready ? `Ponderado: ${formatCents(stats.weighted)}` : "Importe ponderado pendiente"}</p></div>
      <dl className={styles.metrics}>{summary.map((stat) => <div key={stat.label}><dt>{stat.label}</dt><dd>{ready ? stat.value : <><span className={styles.metricSkeleton} aria-hidden="true" /><span className="sr-only">{error ? "No disponible" : "Cargando"}</span></>}</dd><dd className={styles.metricDetail}>{ready ? stat.detail : "Esperando datos"}</dd></div>)}</dl>
    </section>
    <section aria-label="Filtros de oportunidades" className={styles.filters}>
      <div className={styles.searchRow}><div className={styles.search}><Search aria-hidden="true" /><Input aria-label="Buscar oportunidades" placeholder="Buscar por título, cliente u origen" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></div><Button variant="outline" disabled={loading} onClick={() => void reload()}><RefreshCw aria-hidden="true" />{loading ? "Cargando..." : "Actualizar"}</Button></div>
      <div className={styles.filterGrid}>
        <label><span>Etapa</span><select aria-label="Filtrar por etapa" value={filters.stage} onChange={(event) => changeFilter("stage", event.target.value)}><option value="">Todas las etapas</option>{OPPORTUNITY_STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select></label>
        <label><span>Responsable</span><select aria-label="Filtrar por responsable" value={filters.owner} onChange={(event) => changeFilter("owner", event.target.value)}><option value="">Todos los responsables</option><option value="none">Sin asignar</option>{directory.responsibles.map((person) => <option key={person.id} value={person.id}>{ownerName(person.id)}</option>)}</select></label>
        <label><span>Cliente</span><select aria-label="Filtrar por cliente" value={filters.client} onChange={(event) => changeFilter("client", event.target.value)}><option value="">Todos los clientes</option>{directory.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
        <label><span>Estado</span><select aria-label="Filtrar por estado" value={filters.status} onChange={(event) => changeFilter("status", event.target.value)}><option value="">Abiertas y cerradas</option><option value="open">Abiertas</option><option value="closed">Cerradas</option></select></label>
        <label><span>Cierre estimado desde</span><Input aria-label="Cierre estimado desde" type="date" value={filters.from} onChange={(event) => changeFilter("from", event.target.value)} /></label>
        <label><span>Cierre estimado hasta</span><Input aria-label="Cierre estimado hasta" type="date" value={filters.to} onChange={(event) => changeFilter("to", event.target.value)} /></label>
      </div>
      {hasFilters && <div className={styles.activeFilters} aria-label="Filtros activos">{query && <ActiveFilter label={`Búsqueda: ${query}`} onRemove={() => { setQuery(""); setPage(1); }} />}{(Object.keys(filters) as (keyof typeof emptyFilters)[]).filter((key) => filters[key]).map((key) => <ActiveFilter key={key} label={`${filterLabels[key]}: ${filterValue(key)}`} onRemove={() => changeFilter(key, "")} />)}<Button variant="ghost" size="sm" onClick={clearFilters}>Limpiar filtros</Button></div>}
      {filters.from && filters.to && filters.from > filters.to && <p role="alert" className={styles.filterWarning}>La fecha inicial debe ser anterior o igual a la final.</p>}
    </section>
    <section className={styles.workspace} aria-label="Oportunidades comerciales" aria-busy={loading}>
      <div className={styles.viewBar}><div role="group" aria-label="Vista de oportunidades" className={styles.viewSwitch}><Button variant="ghost" aria-pressed={view === "pipeline"} onClick={() => setView("pipeline")}><LayoutPanelLeft aria-hidden="true" />Pipeline</Button><Button variant="ghost" aria-pressed={view === "list"} onClick={() => setView("list")}><List aria-hidden="true" />Lista</Button></div><p role={ready ? "status" : undefined}>{ready ? `${filtered.length} oportunidades visibles · Indicadores globales` : error ? "Oportunidades no disponibles" : "Cargando oportunidades..."}</p></div>
      {error ? <div role="alert" className={styles.error}><h2>No pudimos cargar las oportunidades</h2><p>{error}</p><Button variant="outline" onClick={() => void reload()}>Reintentar</Button></div> : !loaded ? <DirectoryLoading label="Cargando oportunidades..." /> : <>
        {!filtered.length && <DirectoryEmpty title={items.length ? "Sin oportunidades para estos filtros" : "Todavía no hay oportunidades"} description={items.length ? "Prueba otra búsqueda o limpia los filtros." : "Crea una oportunidad para un cliente existente."} action={items.length ? <Button variant="outline" onClick={clearFilters}>Limpiar búsqueda</Button> : undefined} />}
        {view === "pipeline" ? <>
          <div className={styles.pipelineHelp}><p>Cambia la etapa desde cada tarjeta. Se guardará con la probabilidad sugerida.</p><span>Desplaza el tablero para ver todas las etapas</span></div>
          <div role="group" aria-label="Navegar etapas" className={styles.stageNav}>{OPPORTUNITY_STAGES.map((stage) => <button key={stage} type="button" data-stage={stage} aria-label={`Ver etapa ${stage}`} aria-pressed={mobileStage === stage} onClick={() => { setSelectedStage(stage); if (filters.stage) changeFilter("stage", stage); }}><span>{stage}</span><span>{filtered.filter((item) => item.etapa === stage).length}</span></button>)}</div>
          <div role="region" aria-label="Pipeline comercial" tabIndex={0} className={styles.pipeline}>
            <div className={styles.columns}>{OPPORTUNITY_STAGES.map((stage) => {
              const column = filtered.filter((item) => item.etapa === stage);
              const total = column.reduce((sum, item) => sum + toCents(item.valor), BigInt(0));
              return <section key={stage} aria-label={`Etapa ${stage}`} data-stage={stage} data-mobile-active={mobileStage === stage} className={styles.column}>
                <header className={styles.columnHeader}><div><h2>{stage}</h2><span className={styles.columnCount}>{column.length}</span></div><p>{formatCents(total)}</p></header>
                <div className={styles.columnBody}>{column.length ? column.map((item) => card(item)) : <p className={styles.emptyColumn}>Sin oportunidades en {stage.toLowerCase()}</p>}</div>
              </section>;
            })}</div>
          </div>
        </> : Boolean(filtered.length) && <>
          <div className={styles.tableWrap}><table className={styles.table}>
            <caption className="sr-only">Oportunidades con cliente, etapa, valor, probabilidad, responsable y cierre estimado</caption>
            <thead><tr>{["Oportunidad", "Cliente", "Etapa", "Valor", "Probabilidad", "Responsable", "Fecha estimada", "Acciones"].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead>
            <tbody>{rows.map((item) => <tr key={item.id}><th scope="row">{item.titulo}</th><td>{clientName(item.cliente_id)}</td><td><StageBadge stage={item.etapa} /><StageControl item={item} onSaved={saveAndReveal} /></td><td className={styles.tableValue}>{formatMoney(item.valor)}</td><td>{item.probabilidad}%</td><td>{ownerName(item.responsable_id)}</td><td>{estimatedDate(item.fecha_cierre_estimada)}</td><td>{actions(item)}</td></tr>)}</tbody>
          </table></div>
          <div className={styles.mobileList} aria-label="Lista de oportunidades">{rows.map((item) => card(item, true))}</div>
          <div className={styles.pagination}><p>Página {currentPage} de {pageCount}</p><div><Button variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</Button><Button variant="outline" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Siguiente</Button></div></div>
        </>}
      </>}
    </section>
    <p className={styles.footnote}>Importes en soles · Ganada y Perdida son etapas cerradas.</p>
  </div>;
}
