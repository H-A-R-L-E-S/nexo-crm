"use client";

import { useEffect, useState } from "react";
import { Pencil, Search, UserRoundSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewTaskLink } from "@/features/tasks/task-link";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/features/auth/auth-provider";
import { useLeads } from "./use-leads";
import { canManageLeads } from "./permissions";
import { isPendingFollowup } from "./dates";
import { LEAD_ESTADOS, LEAD_FUENTES, LEAD_PRIORIDADES, leadName, responsableName } from "./types";
import { LeadFormDialog } from "./lead-form";
import { LeadConvertDialog } from "./lead-convert";
import { LeadDetail } from "./lead-detail";
import { LeadDelete } from "./lead-delete";
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
  const stats = [{ label: "Total de leads", value: leads.length }, { label: "Nuevos", value: leads.filter((lead) => lead.estado === "Nuevo").length }, { label: "Calificados", value: leads.filter((lead) => lead.estado === "Calificado").length }, { label: "Seguimientos pendientes", value: leads.filter((lead) => isPendingFollowup(lead, now)).length }];
  const filterOptions = [
    { key: "estado", label: "Estado", values: LEAD_ESTADOS.map((value) => ({ value, label: value })) },
    { key: "prioridad", label: "Prioridad", values: LEAD_PRIORIDADES.map((value) => ({ value, label: value })) },
    { key: "fuente", label: "Fuente", values: LEAD_FUENTES.map((value) => ({ value, label: value })) },
    { key: "responsable", label: "Responsable", values: [{ value: "none", label: "Sin asignar" }, ...responsibles.map((person) => ({ value: person.id, label: `${responsableName(person)}${person.activo ? "" : " (inactivo)"}` }))] },
  ] as const;
  function clear() { setQuery(""); setFilters({ estado: "", prioridad: "", fuente: "", responsable: "" }); setPage(1); }
  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Leads</h1><p className="mt-2 text-sm text-slate-500">Convierte nuevos contactos en relaciones comerciales.</p></div><LeadFormDialog responsibles={responsibles} onSaved={saved} disabled={loading || Boolean(error)} /></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-xs font-medium text-slate-500">{stat.label}</p><p className="mt-3 text-2xl font-semibold">{loading && !leads.length ? "—" : error ? "—" : stat.value}</p>{stat.label === "Seguimientos pendientes" && <p className="mt-2 text-[11px] text-slate-500">Hoy y vencidos · Leads abiertos · Lima</p>}</div>)}</div>
    <section aria-label="Listado de leads" className="min-w-0 rounded-xl border border-slate-200 bg-white"><div className="space-y-4 border-b border-slate-100 p-4 sm:p-5"><div className="flex flex-wrap gap-3"><div className="relative min-w-0 flex-1"><Search aria-hidden="true" className="absolute left-3 top-3 size-4 text-slate-400" /><Input aria-label="Buscar leads" placeholder="Buscar por nombre, empresa, correo o teléfono..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} className="h-10 min-w-48 pl-9" /></div><Button variant="outline" onClick={() => void reload()} disabled={loading}>{loading ? "Cargando..." : "Actualizar"}</Button></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{filterOptions.map((filter) => <label key={filter.key} className="space-y-1 text-xs text-slate-500"><span>{filter.label}</span><select aria-label={`Filtrar por ${filter.label.toLowerCase()}`} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-blue-600" value={filters[filter.key]} onChange={(event) => { setFilters({ ...filters, [filter.key]: event.target.value }); setPage(1); }}><option value="">Todos</option>{filter.values.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>)}<Button className="self-end" variant="ghost" onClick={clear}>Limpiar filtros</Button></div></div>
      {error ? <div role="alert" className="p-8 text-center"><p className="text-sm text-red-700">{error}</p><Button onClick={() => void reload()} variant="outline" className="mt-4">Reintentar</Button></div> : loading && !leads.length ? <p role="status" className="p-12 text-center text-sm text-slate-500">Cargando leads...</p> : !filtered.length ? <div className="p-12 text-center"><UserRoundSearch className="mx-auto mb-3 size-8 text-slate-400" /><h2 className="font-semibold">{leads.length ? "Sin resultados" : "Todavía no hay leads"}</h2><p className="mt-2 text-sm text-slate-500">{leads.length ? "Prueba otra búsqueda o limpia los filtros." : "Registra tu primer contacto con Nuevo lead."}</p></div> : <><Table><TableHeader><TableRow>{["Lead", "Empresa", "Fuente", "Estado", "Prioridad", "Responsable", "Próximo seguimiento", "Acciones"].map((label) => <TableHead key={label} className="px-4 text-xs">{label}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map((lead) => {
        const owner = responsibles.find((person) => person.id === lead.responsable_id);
        return <TableRow key={lead.id}><TableCell className="max-w-64 px-4 py-4"><p className="truncate font-medium" title={leadName(lead)}>{leadName(lead)}</p><p className="mt-1 truncate text-xs text-slate-500" title={lead.correo}>{lead.correo || "Sin correo"}</p></TableCell><TableCell className="max-w-40 truncate px-4 text-xs" title={lead.empresa}>{lead.empresa || "Sin empresa"}</TableCell><TableCell className="px-4 text-xs">{lead.fuente}</TableCell><TableCell className="px-4"><LeadStateBadge state={lead.estado} /></TableCell><TableCell className="px-4"><LeadPriorityBadge priority={lead.prioridad} /></TableCell><TableCell className="px-4 text-xs">{owner ? responsableName(owner) : "Sin asignar"}{owner && !owner.activo && <span className="block text-amber-700">Inactivo</span>}</TableCell><TableCell className="px-4"><FollowupLabel lead={lead} now={now} /></TableCell><TableCell className="px-3"><div className="flex"><NewTaskLink type="Lead" id={lead.id} label={leadName(lead)} /><LeadDetail lead={lead} owner={owner} /><LeadFormDialog lead={lead} responsibles={responsibles} onSaved={saved}><Button variant="ghost" size="icon" aria-label={`Editar lead: ${leadName(lead)}`} title="Editar lead"><Pencil className="size-4" /></Button></LeadFormDialog><LeadConvertDialog lead={lead} onSaved={saved} />{canManageLeads(profile.rol) && <LeadDelete lead={lead} onDeleted={removed} />}</div></TableCell></TableRow>;
      })}</TableBody></Table><div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4"><p role="status" className="text-xs text-slate-500">{filtered.length} leads · Página {currentPage} de {pages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</Button><Button variant="outline" size="sm" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Siguiente</Button></div></div></>}
    </section><p className="text-xs text-slate-400">Los cambios se guardan en Supabase. Las fechas se muestran en hora de Lima.</p></div>;
}
