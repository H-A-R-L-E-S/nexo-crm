"use client";

import { useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, GitBranch, ListTodo, MoreHorizontal, Pencil, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ActiveFilter, DirectoryEmpty, DirectoryHeader, DirectoryLoading, DirectorySummary, DirectoryToolbar } from "@/components/crm/directory";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-provider";
import { canDeleteClient } from "@/features/auth/roles";
import { cn } from "@/lib/utils";
import { ClientFormDialog } from "./client-form";
import { useClients } from "./clients-provider";
import type { Client, ClientStatus } from "./types";
import styles from "@/components/crm/directory.module.css";

function normalizeSearch(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts.length > 1 ? parts.at(-1)?.[0] ?? "" : ""}`.toUpperCase();
}

function pageNumbers(currentPage: number, totalPages: number) {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const visible = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const result: (number | string)[] = [];
  for (const [index, page] of visible.entries()) {
    if (index > 0 && page - visible[index - 1] > 1) result.push(`gap-${page}`);
    result.push(page);
  }
  return result;
}

function ClientActions({ client }: { client: Client }) {
  const { profile } = useAuth();
  const { deleteClient } = useClients();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function restoreFocus(event: Event) {
    event.preventDefault();
    const target = triggerRef.current ?? document.querySelector<HTMLButtonElement>("main button");
    target?.focus();
  }

  async function remove() {
    if (deleting || !canDeleteClient(profile.rol)) return;
    setDeleting(true);
    try {
      await deleteClient(client.id);
      toast.success("Cliente eliminado", { description: client.name });
      setConfirmingDelete(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudo eliminar el cliente.");
    } finally {
      setDeleting(false);
    }
  }

  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button ref={triggerRef} variant="ghost" size="icon" className={styles.menuTrigger} aria-label={`Acciones de ${client.name}`} title={`Acciones de ${client.name}`}>
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={styles.menu} onCloseAutoFocus={(event) => { if (editing || confirmingDelete) event.preventDefault(); }}>
        <DropdownMenuItem className={styles.menuItem} aria-label={`Editar a ${client.name}`} onSelect={() => setEditing(true)}>
          <Pencil className="size-4" aria-hidden="true" />Editar cliente
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={styles.menuItem}>
          <Link href={`/oportunidades?nueva=1&cliente=${encodeURIComponent(client.id)}`} aria-label={`Nueva oportunidad para ${client.name}`}>
            <GitBranch className="size-4" aria-hidden="true" />Nueva oportunidad
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={styles.menuItem}>
          <Link href={`/tareas?nueva=1&relacion=${encodeURIComponent("Cliente")}&registro=${encodeURIComponent(client.id)}`} aria-label={`Nueva tarea: ${client.name}`}>
            <ListTodo className="size-4" aria-hidden="true" />Nueva tarea
          </Link>
        </DropdownMenuItem>
        {canDeleteClient(profile.rol) && <>
          <DropdownMenuSeparator />
          <DropdownMenuItem className={styles.menuItem} variant="destructive" aria-label={`Eliminar a ${client.name}`} onSelect={() => setConfirmingDelete(true)}>
            <Trash2 className="size-4" aria-hidden="true" />Eliminar cliente
          </DropdownMenuItem>
        </>}
      </DropdownMenuContent>
    </DropdownMenu>
    <ClientFormDialog client={client} open={editing} onOpenChange={setEditing} onCloseAutoFocus={restoreFocus} hideTrigger />
    <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
      <AlertDialogContent className={styles.compactDialog} onCloseAutoFocus={restoreFocus}>
        <AlertDialogHeader className={styles.dialogHeader}>
          <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
          <AlertDialogDescription>¿Eliminar a {client.name}? Esta acción no se puede deshacer.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={styles.formActions}>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={deleting} onClick={(event) => { event.preventDefault(); void remove(); }}>{deleting ? "Eliminando..." : "Eliminar"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

function ClientState({ status }: { status: ClientStatus }) {
  return <span className={styles.status} data-status={status}>{status}</span>;
}

export function ClientsView({ initialStatus, initialOwner, initialSearch }: { initialStatus?: ClientStatus; initialOwner?: string; initialSearch?: string }) {
  const { clients, loading, error, reload } = useClients();
  const [query, setQuery] = useState(initialSearch ?? "");
  const [status, setStatus] = useState<ClientStatus | "">(initialStatus ?? "");
  const [owner, setOwner] = useState(initialOwner ?? "");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const id = useId();

  const filteredClients = useMemo(() => {
    const search = normalizeSearch(query.trim());
    return clients.filter((client) => {
      const matchesSearch = normalizeSearch(`${client.id} ${client.name} ${client.company} ${client.email} ${client.phone}`).includes(search);
      return matchesSearch && (!status || client.status === status) && (!owner || client.owner === owner);
    });
  }, [clients, query, status, owner]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleClients = filteredClients.slice(startIndex, startIndex + pageSize);
  const hasFilters = Boolean(query || status || owner);
  const activeClients = clients.filter((client) => client.status === "Activo").length;
  const prospects = clients.filter((client) => client.status === "Prospecto").length;

  function clearFilters() {
    setQuery("");
    setStatus("");
    setOwner("");
    setPage(1);
  }

  return <div className={styles.page}>
    <DirectoryHeader title="Clientes" description="Tu cartera, contactos y responsables en un solo directorio." count={error ? undefined : clients.length} loading={loading} actions={<ClientFormDialog />} />
    <DirectorySummary loading={loading} error={Boolean(error)} items={[
      { label: "Total de clientes", value: clients.length },
      { label: "Clientes activos", value: activeClients },
      { label: "Prospectos", value: prospects },
    ]} />

    <section aria-label="Directorio de clientes" className={styles.section}>
      <DirectoryToolbar label="Búsqueda y filtros de clientes">
        <div className={styles.search}>
          <label htmlFor={`${id}-search`} className="sr-only">Buscar clientes</label>
          <Search className="size-4" aria-hidden="true" />
          <Input id={`${id}-search`} type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar por nombre, empresa o correo…" />
        </div>
        <div className={styles.filters}>
          <div className={styles.filter}>
            <label htmlFor={`${id}-status-filter`} className="sr-only">Filtrar por estado</label>
            <select id={`${id}-status-filter`} value={status} onChange={(event) => { setStatus(event.target.value as ClientStatus | ""); setPage(1); }} className={styles.select}>
              <option value="">Todos los estados</option>
              <option value="Activo">Activo</option>
              <option value="Prospecto">Prospecto</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
          <div className={styles.filter}>
            <label htmlFor={`${id}-owner-filter`} className="sr-only">Filtrar por responsable</label>
            <select id={`${id}-owner-filter`} value={owner} onChange={(event) => { setOwner(event.target.value); setPage(1); }} className={styles.select}>
              <option value="">Todos los responsables</option>
              {[...new Set(clients.map((client) => client.owner))].sort((a, b) => a.localeCompare(b, "es")).map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        </div>
      </DirectoryToolbar>

      {hasFilters && <div className={styles.activeFilters}>
        {query && <ActiveFilter label={`Búsqueda: ${query}`} onRemove={() => { setQuery(""); setPage(1); }} />}
        {status && <ActiveFilter label={`Estado: ${status}`} onRemove={() => { setStatus(""); setPage(1); }} />}
        {owner && <ActiveFilter label={`Responsable: ${owner}`} onRemove={() => { setOwner(""); setPage(1); }} />}
        <Button variant="ghost" size="sm" onClick={clearFilters}>Limpiar filtros</Button>
      </div>}

      {error && <div role="alert" className={cn(styles.dangerNotice, "flex flex-wrap items-center justify-between gap-3")}><span>{error}</span><Button variant="outline" size="sm" onClick={() => void reload()}>Reintentar</Button></div>}
      {loading ? <DirectoryLoading label="Cargando clientes..." /> : error ? null : visibleClients.length > 0 ? <>
        <div className={styles.tableWrap}>
          <table className={styles.table} aria-label="Directorio de clientes">
            <caption className="sr-only">Clientes, información de contacto, estado y responsable.</caption>
            <thead><tr>
              <th scope="col" className="w-[29%]">Cliente</th>
              <th scope="col" className="w-[27%]">Contacto</th>
              <th scope="col" className="w-[14%]">Estado</th>
              <th scope="col" className="w-[23%]">Responsable</th>
              <th scope="col" className="w-[7%]"><span className="sr-only">Acciones</span></th>
            </tr></thead>
            <tbody>{visibleClients.map((client) => <tr key={client.id}>
              <td><div className={styles.rowIdentity}>
                <span aria-hidden="true" className={styles.avatar}>{initials(client.name)}</span>
                <div className="min-w-0">
                  <p className={styles.name} title={client.name}>{client.name}</p>
                  <p className={styles.secondary} title={client.company}>{client.company || "Sin empresa"}</p>
                </div>
              </div></td>
              <td><p className={styles.secondary} title={client.email}>{client.email}</p><p className={cn(styles.secondary, "tabular-nums")} title={client.phone}>{client.phone}</p></td>
              <td><ClientState status={client.status} /></td>
              <td><p className={styles.secondary} title={client.owner}>{client.owner}</p></td>
              <td className="text-right"><ClientActions client={client} /></td>
            </tr>)}</tbody>
          </table>
        </div>
        <ul className={styles.mobileList} aria-label="Lista de clientes">{visibleClients.map((client) => <li className={styles.mobileRow} key={client.id}>
          <div className={styles.rowTop}>
            <div className={styles.rowIdentity}>
              <span aria-hidden="true" className={styles.avatar}>{initials(client.name)}</span>
              <div className="min-w-0"><p className={styles.name}>{client.name}</p><p className={styles.company}>{client.company || "Sin empresa"}</p></div>
            </div>
            <ClientActions client={client} />
          </div>
          <div className={styles.rowMeta}><ClientState status={client.status} /></div>
          <dl className={styles.rowDetails}>
            <div><dt>Correo</dt><dd>{client.email}</dd></div>
            <div><dt>Teléfono</dt><dd className="tabular-nums">{client.phone}</dd></div>
            <div><dt>Responsable</dt><dd>{client.owner}</dd></div>
          </dl>
        </li>)}</ul>
      </> : <DirectoryEmpty title={hasFilters ? "No encontramos clientes" : "Tu cartera todavía está vacía"} description={hasFilters ? "Prueba con otra búsqueda o ajusta los filtros para encontrar a quien buscas." : "Registra tu primer cliente para guardar su contacto y asignar un responsable."} action={hasFilters ? <Button variant="outline" onClick={clearFilters}>Ver todos los clientes</Button> : <ClientFormDialog><Button variant="outline">Registrar primer cliente</Button></ClientFormDialog>} />}

      {!loading && !error && <div className={styles.pagination}>
        <p role="status" className={styles.secondary}>Mostrando <span className="tabular-nums">{filteredClients.length ? startIndex + 1 : 0}–{Math.min(startIndex + pageSize, filteredClients.length)}</span> de <span className="tabular-nums">{filteredClients.length}</span> clientes</p>
        <div className={styles.paginationControls}>
          <div className={styles.pageSize}>
            <label htmlFor={`${id}-page-size`}>Por página</label>
            <div className={styles.filter}>
              <select id={`${id}-page-size`} value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className={styles.select}>
                <option value={8}>8</option><option value={16}>16</option><option value={24}>24</option>
              </select>
            </div>
          </div>
          <nav aria-label="Paginación de clientes">
            <Button variant="ghost" size="icon" aria-label="Página anterior" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft className="size-4" aria-hidden="true" /></Button>
            {pageNumbers(currentPage, totalPages).map((number) => typeof number === "number" ? <Button key={number} variant="ghost" size="icon" aria-label={`Página ${number}`} aria-current={number === currentPage ? "page" : undefined} onClick={() => setPage(number)}>{number}</Button> : <span key={number} aria-hidden="true">…</span>)}
            <Button variant="ghost" size="icon" aria-label="Página siguiente" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}><ChevronRight className="size-4" aria-hidden="true" /></Button>
          </nav>
        </div>
      </div>}
    </section>
  </div>;
}
