"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActiveFilter, DirectoryEmpty, DirectoryHeader, DirectoryLoading, DirectorySummary, DirectoryToolbar } from "@/components/crm/directory";
import styles from "@/components/crm/directory.module.css";
import { useAuth } from "@/features/auth/auth-provider";
import { useLeads } from "./use-leads";
import { canManageLeads } from "./permissions";
import { isPendingFollowup } from "./dates";
import { LEAD_ESTADOS, LEAD_FUENTES, LEAD_PRIORIDADES, leadName, responsableName } from "./types";
import { LeadFormDialog } from "./lead-form";
import { LeadDetail } from "./lead-detail";
import { LeadActions } from "./lead-actions";
import { FollowupLabel, LeadPriorityBadge, LeadStateBadge } from "./lead-badges";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const pageSize = 10;

export function LeadsView({ initialNow, initialSearch = "" }: { initialNow: string; initialSearch?: string }) {
  const { profile } = useAuth();
  const { leads, responsibles, loading, error, reload, saved, removed } = useLeads();
  const [now, setNow] = useState(() => new Date(initialNow));
  const [query, setQuery] = useState(initialSearch);
  const [filters, setFilters] = useState({ estado: "", prioridad: "", fuente: "", responsable: "" });
  const [page, setPage] = useState(1);
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(timer); }, []);
  const filtered = leads.filter((lead) => normalize(`${lead.id} ${lead.nombres} ${lead.apellidos} ${lead.empresa} ${lead.correo} ${lead.telefono}`).includes(normalize(query.trim())) && (!filters.estado || lead.estado === filters.estado) && (!filters.prioridad || lead.prioridad === filters.prioridad) && (!filters.fuente || lead.fuente === filters.fuente) && (!filters.responsable || (lead.responsable_id ?? "none") === filters.responsable));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const stats = [{ label: "Total de leads", value: leads.length }, { label: "Nuevos", value: leads.filter((lead) => lead.estado === "Nuevo").length }, { label: "Calificados", value: leads.filter((lead) => lead.estado === "Calificado").length }, { label: "Seguimientos pendientes", value: leads.filter((lead) => isPendingFollowup(lead, now)).length, detail: "Hoy y vencidos · Leads abiertos · Lima" }];
  const filterOptions = [
    { key: "estado", label: "Estado", values: LEAD_ESTADOS.map((value) => ({ value, label: value })) },
    { key: "prioridad", label: "Prioridad", values: LEAD_PRIORIDADES.map((value) => ({ value, label: value })) },
    { key: "fuente", label: "Fuente", values: LEAD_FUENTES.map((value) => ({ value, label: value })) },
    { key: "responsable", label: "Responsable", values: [{ value: "none", label: "Sin asignar" }, ...responsibles.map((person) => ({ value: person.id, label: `${responsableName(person)}${person.activo ? "" : " (inactivo)"}` }))] },
  ] as const;
  function clear() { setQuery(""); setFilters({ estado: "", prioridad: "", fuente: "", responsable: "" }); setPage(1); }
  const hasFilters = Boolean(query || Object.values(filters).some(Boolean));

  return <div className={styles.page}>
    <DirectoryHeader title="Leads" description="Contactos, calificación y próximos seguimientos." count={leads.length} loading={(loading && !leads.length) || Boolean(error)} actions={<LeadFormDialog responsibles={responsibles} onSaved={saved} disabled={loading || Boolean(error)} />} />
    <DirectorySummary items={stats} loading={loading && !leads.length} error={Boolean(error)} />
    <section aria-label="Listado de leads" className={styles.section} aria-busy={loading}>
      <DirectoryToolbar label="Buscar y filtrar leads">
        <div className={styles.search}><Search aria-hidden="true" /><Input aria-label="Buscar leads" placeholder="Buscar nombre, empresa, correo o teléfono" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></div>
        <div className={styles.filters}>{filterOptions.map((filter) => <label key={filter.key} className={styles.filter}>
          <span>{filter.label}</span><select aria-label={`Filtrar por ${filter.label.toLowerCase()}`} className={styles.select} value={filters[filter.key]} onChange={(event) => { setFilters({ ...filters, [filter.key]: event.target.value }); setPage(1); }}>
            <option value="">Todos</option>{filter.values.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>)}</div>
        <Button variant="ghost" onClick={() => void reload()} disabled={loading}>{loading ? "Cargando..." : "Actualizar"}</Button>
      </DirectoryToolbar>
      {hasFilters && <div className={styles.activeFilters} aria-label="Filtros activos">
        {query && <ActiveFilter label={`Búsqueda: ${query}`} onRemove={() => { setQuery(""); setPage(1); }} />}
        {filterOptions.filter((filter) => filters[filter.key]).map((filter) => <ActiveFilter key={filter.key} label={`${filter.label}: ${filter.values.find((item) => item.value === filters[filter.key])?.label ?? filters[filter.key]}`} onRemove={() => { setFilters({ ...filters, [filter.key]: "" }); setPage(1); }} />)}
        <Button variant="ghost" size="sm" onClick={clear}>Limpiar filtros</Button>
      </div>}
      {error ? <div role="alert" className={styles.formError}><p>{error}</p><Button onClick={() => void reload()} variant="outline">Reintentar</Button></div>
        : loading && !leads.length ? <DirectoryLoading label="Cargando leads..." />
          : !filtered.length ? <DirectoryEmpty title={leads.length ? "Sin resultados" : "Todavía no hay leads"} description={leads.length ? "Prueba otro nombre, empresa o contacto, o limpia los filtros." : "Registra un contacto para calificarlo y programar su seguimiento."} />
            : <>
              <div className={styles.tableWrap} data-leads-table><table className={styles.table}>
                <caption className="sr-only">Leads con estado, información comercial y próximo seguimiento</caption>
                <colgroup><col style={{ width: "24%" }} /><col style={{ width: "12%" }} /><col style={{ width: "16%" }} /><col style={{ width: "9%" }} /><col style={{ width: "14%" }} /><col style={{ width: "16%" }} /><col style={{ width: "4rem" }} /></colgroup>
                <thead><tr>{["Lead", "Estado", "Empresa / fuente", "Prioridad", "Responsable", "Próximo seguimiento", "Acciones"].map((label) => <th key={label} scope="col">{label === "Acciones" ? <span className="sr-only">Acciones</span> : label}</th>)}</tr></thead>
                <tbody>{rows.map((lead) => {
                  const owner = responsibles.find((person) => person.id === lead.responsable_id);
                  return <tr key={lead.id}>
                    <th scope="row"><LeadDetail lead={lead} owner={owner}><button type="button" className={styles.name} title={leadName(lead)}>{leadName(lead)}</button></LeadDetail><p className={styles.secondary} title={lead.correo}>{lead.correo || "Sin correo"}</p></th>
                    <td><LeadStateBadge state={lead.estado} /></td>
                    <td><p className={styles.company} title={lead.empresa}>{lead.empresa || "Sin empresa"}</p><p className={styles.secondary}>{lead.fuente}</p></td>
                    <td><LeadPriorityBadge priority={lead.prioridad} /></td>
                    <td><p className={styles.company} title={owner ? responsableName(owner) : undefined}>{owner ? responsableName(owner) : "Sin asignar"}</p>{owner && !owner.activo && <p className="text-xs text-[var(--status-prospect)]">Inactivo</p>}</td>
                    <td><FollowupLabel lead={lead} now={now} /></td>
                    <td><LeadActions lead={lead} owner={owner} responsibles={responsibles} onSaved={saved} onDeleted={removed} canDelete={canManageLeads(profile.rol)} /></td>
                  </tr>;
                })}</tbody>
              </table></div>
              <ul className={styles.mobileList} data-leads-mobile aria-label="Leads">{rows.map((lead) => {
                const owner = responsibles.find((person) => person.id === lead.responsable_id);
                return <li key={lead.id} className={styles.mobileRow} aria-label={leadName(lead)}>
                  <div className={styles.rowTop}><div className={styles.rowIdentity}><div><LeadDetail lead={lead} owner={owner}><button type="button" className={styles.name}>{leadName(lead)}</button></LeadDetail><p className={styles.secondary}>{lead.empresa || "Sin empresa"}{lead.cargo ? ` · ${lead.cargo}` : ""}</p></div></div><LeadActions lead={lead} owner={owner} responsibles={responsibles} onSaved={saved} onDeleted={removed} canDelete={canManageLeads(profile.rol)} /></div>
                  <div className={styles.rowMeta}><LeadStateBadge state={lead.estado} /><LeadPriorityBadge priority={lead.prioridad} /></div>
                  <dl className={styles.rowDetails}>
                    <div><dt>Correo</dt><dd>{lead.correo || "Sin correo"}</dd></div><div><dt>Teléfono</dt><dd>{lead.telefono || "Sin registrar"}</dd></div>
                    <div><dt>Fuente</dt><dd>{lead.fuente}</dd></div><div><dt>Responsable</dt><dd>{owner ? `${responsableName(owner)}${owner.activo ? "" : " (inactivo)"}` : "Sin asignar"}</dd></div>
                    <div className="col-span-full"><dt>Próximo seguimiento</dt><dd><FollowupLabel lead={lead} now={now} /></dd></div>
                  </dl>
                </li>;
              })}</ul>
              <div className={styles.pagination}><p role="status">{filtered.length} leads · Página {currentPage} de {pages}</p><div className={styles.paginationControls}><Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</Button><Button variant="outline" size="sm" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Siguiente</Button></div></div>
            </>}
    </section><p className={styles.formHelp}>Fechas y seguimientos en hora de Lima.</p>
  </div>;
}
