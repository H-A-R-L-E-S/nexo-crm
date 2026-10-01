"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  GitBranch,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Pencil,
  Trash2,
  Search,
  SlidersHorizontal,
  UserRoundCheck,
  UserRoundPlus,
  UsersRound,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ClientFormDialog } from "./client-form";
import { useClients } from "./clients-provider";
import { OWNERS } from "./demo-data";
import type { Client, ClientStatus } from "./types";
import { useAuth } from "@/features/auth/auth-provider";
import { canDeleteClient } from "@/features/auth/roles";

const STATUS_STYLES: Record<ClientStatus, string> = {
  Activo: "border-emerald-100 bg-emerald-50 text-emerald-700",
  Prospecto: "border-amber-100 bg-amber-50 text-amber-700",
  Inactivo: "border-slate-200 bg-slate-100 text-slate-600",
};

const AVATAR_STYLES = [
  "bg-blue-50 text-blue-600",
  "bg-violet-50 text-violet-600",
  "bg-amber-50 text-amber-700",
  "bg-teal-50 text-teal-700",
];

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

function DeleteClientButton({ client }: { client: Client }) {
  const { profile } = useAuth();
  const { deleteClient } = useClients();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    if (deleting || !canDeleteClient(profile.rol)) return;
    setDeleting(true);
    try {
      await deleteClient(client.id);
      toast.success("Cliente eliminado", { description: client.name });
      setOpen(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudo eliminar el cliente.");
    } finally {
      setDeleting(false);
    }
  }

  if (!canDeleteClient(profile.rol)) return null;
  return <AlertDialog open={open} onOpenChange={setOpen}>
    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="size-9 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label={`Eliminar a ${client.name}`} title={`Eliminar a ${client.name}`}><Trash2 className="size-3.5" aria-hidden="true" /></Button></AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>Eliminar cliente</AlertDialogTitle><AlertDialogDescription>¿Eliminar a {client.name}? Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={deleting} onClick={(event) => { event.preventDefault(); void remove(); }}>{deleting ? "Eliminando..." : "Eliminar"}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

export function ClientsView({
  initialStatus,
  initialOwner,
  initialSearch,
}: {
  initialStatus?: ClientStatus;
  initialOwner?: string;
  initialSearch?: string;
}) {
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
      const matchesSearch = normalizeSearch(
        `${client.id} ${client.name} ${client.company} ${client.email} ${client.phone}`,
      ).includes(search);
      return (
        matchesSearch &&
        (!status || client.status === status) &&
        (!owner || client.owner === owner)
      );
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

  const selectClassName =
    "h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pr-9 pl-3 text-[13px] text-slate-600 outline-none transition-colors focus-visible:border-blue-500 focus-visible:ring-[3px] focus-visible:ring-blue-100 sm:w-auto";

  return (
    <div className="space-y-7">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 sm:text-[30px]">
            Clientes
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            Cada contacto, una oportunidad para conectar.
          </p>
        </div>
        <ClientFormDialog />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-5">
        {[
          { label: "Total de clientes", value: clients.length, icon: UsersRound, color: "bg-blue-50 text-blue-600" },
          { label: "Clientes activos", value: activeClients, icon: UserRoundCheck, color: "bg-emerald-50 text-emerald-600" },
          { label: "Prospectos", value: prospects, icon: UserRoundPlus, color: "bg-amber-50 text-amber-600" },
        ].map((metric) => (
          <div key={metric.label} className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white px-5 py-4 shadow-[0_2px_5px_0_rgba(15,23,42,0.015)]">
            <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", metric.color)}>
              <metric.icon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-medium text-slate-500">{metric.label}</p>
              <p className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">{metric.value}</p>
            </div>
          </div>
        ))}
      </div>

      <section aria-labelledby={`${id}-directory-title`} className="min-w-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_2px_5px_0_rgba(15,23,42,0.015)]">
        <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <h2 id={`${id}-directory-title`} className="text-sm font-semibold text-slate-900">Directorio de clientes</h2>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-500">{clients.length}</span>
          </div>
          <span className="hidden items-center gap-1.5 text-xs text-slate-500 md:flex">
            <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
            Datos de Supabase
          </span>
        </div>

        <div className="flex flex-col gap-3 px-5 py-5 sm:px-6 xl:flex-row">
          <div className="relative min-w-0 flex-1">
            <label htmlFor={`${id}-search`} className="sr-only">Buscar clientes</label>
            <Search className="pointer-events-none absolute top-3 left-3 size-4 text-slate-400" aria-hidden="true" />
            <Input
              id={`${id}-search`}
              type="search"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              placeholder="Buscar por nombre, empresa o correo…"
              className="h-10 rounded-lg border-slate-200 bg-slate-50/50 pr-3 pl-9 text-[13px] shadow-none"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <label htmlFor={`${id}-status-filter`} className="sr-only">Filtrar por estado</label>
              <SlidersHorizontal className="pointer-events-none absolute top-3 left-3 size-4 text-slate-400" aria-hidden="true" />
              <select
                id={`${id}-status-filter`}
                value={status}
                onChange={(event) => { setStatus(event.target.value as ClientStatus | ""); setPage(1); }}
                className={cn(selectClassName, "pl-9 sm:min-w-44")}
              >
                <option value="">Todos los estados</option>
                <option value="Activo">Activo</option>
                <option value="Prospecto">Prospecto</option>
                <option value="Inactivo">Inactivo</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-3 right-3 size-4 text-slate-400" aria-hidden="true" />
            </div>
            <div className="relative min-w-0 flex-1">
              <label htmlFor={`${id}-owner-filter`} className="sr-only">Filtrar por responsable</label>
              <select
                id={`${id}-owner-filter`}
                value={owner}
                onChange={(event) => { setOwner(event.target.value); setPage(1); }}
                className={cn(selectClassName, "sm:min-w-48")}
              >
                <option value="">Todos los responsables</option>
                {OWNERS.map((person) => <option key={person.name} value={person.name}>{person.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute top-3 right-3 size-4 text-slate-400" aria-hidden="true" />
            </div>
          </div>
        </div>

        {hasFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-2 sm:px-6">
            <p role="status" className="text-xs text-slate-500">
              {filteredClients.length} {filteredClients.length === 1 ? "cliente encontrado" : "clientes encontrados"}
            </p>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 gap-1.5 px-2 text-xs text-slate-600">
              <X className="size-3.5" aria-hidden="true" />
              Limpiar filtros
            </Button>
          </div>
        )}

        {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-t border-red-100 bg-red-50 px-6 py-4 text-sm text-red-700"><span>{error}</span><Button variant="outline" size="sm" onClick={() => void reload()}>Reintentar</Button></div>}
        {loading ? <div role="status" className="border-t border-slate-100 px-6 py-16 text-center text-sm text-slate-500">Cargando clientes...</div> : error ? null : visibleClients.length > 0 ? (
          <Table className="min-w-[850px]" tabIndex={0} aria-label="Directorio de clientes. Desplázate horizontalmente para ver todas las columnas.">
            <TableCaption className="sr-only">Clientes, información de contacto, estado y responsable.</TableCaption>
            <TableHeader className="border-t border-slate-100 bg-slate-50/80">
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead scope="col" className="h-11 pl-6 text-[11px] font-medium tracking-[0.07em] text-slate-500 uppercase">Cliente</TableHead>
                <TableHead scope="col" className="text-[11px] font-medium tracking-[0.07em] text-slate-500 uppercase">Empresa</TableHead>
                <TableHead scope="col" className="text-[11px] font-medium tracking-[0.07em] text-slate-500 uppercase">Estado</TableHead>
                <TableHead scope="col" className="text-[11px] font-medium tracking-[0.07em] text-slate-500 uppercase">Responsable</TableHead>
                <TableHead scope="col" className="w-20 pr-6 text-right"><span className="sr-only">Acciones</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleClients.map((client) => (
                <TableRow key={client.id} className="border-slate-100 transition-colors hover:bg-slate-50/65">
                  <TableCell className="py-4 pl-6">
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold", AVATAR_STYLES[client.name.charCodeAt(0) % AVATAR_STYLES.length])}>
                        {initials(client.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="max-w-64 truncate text-[13px] font-medium text-slate-800" title={client.name}>{client.name}</p>
                        <p className="mt-1 max-w-64 truncate text-xs text-slate-500" title={client.email}>{client.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                      <p className="max-w-44 truncate text-[13px] text-slate-700" title={client.company}>{client.company}</p>
                    </div>
                    <p className="mt-1.5 pl-5 text-xs tabular-nums text-slate-500">{client.phone}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium", STATUS_STYLES[client.status])}>
                      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-full bg-slate-100 text-[9px] font-semibold text-slate-500" aria-hidden="true">{initials(client.owner)}</span>
                      <span className="text-xs text-slate-600">{client.owner}</span>
                    </div>
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <div className="flex justify-end gap-1">
                    <Button asChild variant="ghost" size="icon" className="size-9 text-blue-600"><Link href={`/oportunidades?nueva=1&cliente=${encodeURIComponent(client.id)}`} aria-label={`Nueva oportunidad para ${client.name}`} title="Nueva oportunidad"><GitBranch className="size-3.5" /></Link></Button>
                    <ClientFormDialog client={client}>
                      <Button variant="ghost" size="icon" className="size-9 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600" aria-label={`Editar a ${client.name}`} title={`Editar a ${client.name}`}>
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </Button>
                    </ClientFormDialog>
                    <DeleteClientButton client={client} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center border-t border-slate-100 px-6 py-16 text-center">
            <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              {hasFilters ? <Search className="size-6" aria-hidden="true" /> : <CircleUserRound className="size-6" aria-hidden="true" />}
            </span>
            <h3 className="text-base font-semibold text-slate-800">{hasFilters ? "No encontramos clientes" : "Tu próxima relación empieza aquí"}</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              {hasFilters ? "Prueba con otra búsqueda o ajusta los filtros para encontrar a quien buscas." : "Registra tu primer cliente y empieza a construir tu cartera."}
            </p>
            <div className="mt-5">
              {hasFilters ? <Button variant="outline" onClick={clearFilters}>Ver todos los clientes</Button> : <ClientFormDialog />}
            </div>
          </div>
        )}

        <div className="flex flex-col items-start justify-between gap-4 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          <p className="text-xs text-slate-500" aria-live="polite" aria-atomic="true">
            Mostrando <span className="font-medium text-slate-700">{filteredClients.length ? startIndex + 1 : 0}–{Math.min(startIndex + pageSize, filteredClients.length)}</span> de <span className="font-medium text-slate-700">{filteredClients.length}</span> clientes
          </p>
          <div className="flex w-full flex-wrap items-center justify-between gap-4 sm:w-auto sm:justify-end">
            <div className="flex items-center gap-2">
              <label htmlFor={`${id}-page-size`} className="text-xs text-slate-500">Por página</label>
              <div className="relative">
                <select
                  id={`${id}-page-size`}
                  value={pageSize}
                  onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}
                  className="h-8 appearance-none rounded-md border border-slate-200 bg-white py-1 pr-6 pl-2 text-xs text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <option value={8}>8</option>
                  <option value={16}>16</option>
                  <option value={24}>24</option>
                </select>
                <ChevronDown className="pointer-events-none absolute top-2.5 right-1.5 size-3 text-slate-400" aria-hidden="true" />
              </div>
            </div>
            <nav aria-label="Paginación de clientes" className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="size-8 text-slate-500" aria-label="Página anterior" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Button>
              {pageNumbers(currentPage, totalPages).map((number) => typeof number === "number" ? (
                <Button key={number} variant="ghost" size="icon" className={cn("size-8 text-xs text-slate-500", number === currentPage && "bg-blue-50 font-semibold text-blue-700 hover:bg-blue-100 hover:text-blue-700")} aria-label={`Página ${number}`} aria-current={number === currentPage ? "page" : undefined} onClick={() => setPage(number)}>{number}</Button>
              ) : <span key={number} aria-hidden="true" className="px-1 text-xs text-slate-400">…</span>)}
              <Button variant="ghost" size="icon" className="size-8 text-slate-500" aria-label="Página siguiente" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </nav>
          </div>
        </div>
      </section>
    </div>
  );
}
