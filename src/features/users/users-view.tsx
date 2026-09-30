"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Search, ShieldCheck, UserRound, UserRoundCog, UserRoundX, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-provider";
import { USER_ROLES, type UserRole } from "@/features/auth/roles";
import type { Profile } from "@/features/auth/types";
import { listUsersAction } from "./actions";
import { UserFormDialog } from "./user-form";
import { UsersTable } from "./users-table";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const filterClass = "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

export function UsersView() {
  const { profile, setProfile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const version = useRef(0);

  const reload = useCallback(async () => {
    const requestVersion = ++version.current;
    setLoading(true); setError("");
    try {
      const result = await listUsersAction();
      if (requestVersion !== version.current) return;
      if (result.ok) setUsers(result.data); else setError(result.error);
    } catch {
      if (requestVersion === version.current) setError("No se pudo cargar el equipo. Inténtalo nuevamente.");
    } finally {
      if (requestVersion === version.current) setLoading(false);
    }
  }, []);
  useEffect(() => { queueMicrotask(() => void reload()); }, [reload]);

  function saved(updated: Profile) {
    ++version.current;
    setLoading(false);
    setUsers((current) => current.some((user) => user.id === updated.id) ? current.map((user) => user.id === updated.id ? updated : user) : [updated, ...current]);
    if (updated.id === profile.id) setProfile(updated);
  }
  const filtered = users.filter((user) => (!role || user.rol === role) && (!status || String(user.activo) === status) && normalize(`${user.nombres} ${user.apellidos} ${user.email}`).includes(normalize(query.trim())));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  const summary = [
    { label: "Usuarios totales", value: users.length, icon: UsersRound },
    { label: "Administradores", value: users.filter((user) => user.rol === "Administrador").length, icon: ShieldCheck },
    { label: "Gerentes", value: users.filter((user) => user.rol === "Gerente").length, icon: UserRoundCog },
    { label: "Vendedores", value: users.filter((user) => user.rol === "Vendedor").length, icon: UserRound },
    { label: "Usuarios inactivos", value: users.filter((user) => !user.activo).length, icon: UserRoundX },
  ];
  return <div className="space-y-7"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="mb-2 text-xs font-medium text-blue-600">Configuración / Equipo</p><h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1><p className="mt-2 text-sm text-slate-500">Administra los miembros y permisos de tu equipo.</p></div><UserFormDialog onSaved={(user) => { saved(user); setQuery(""); setRole(""); setStatus(""); setPage(1); }} onPartial={() => void reload()} /></div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{summary.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-2"><p className="text-xs font-medium text-slate-500">{label}</p><Icon className="size-4 shrink-0 text-blue-500" aria-hidden="true" /></div><p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900">{loading || error ? "—" : value}</p></div>)}</div>
    <section aria-label="Equipo" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 p-5 sm:flex-row sm:flex-wrap sm:items-center"><div className="relative flex-1 sm:min-w-56"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" aria-hidden="true" /><Input aria-label="Buscar usuarios" placeholder="Buscar por nombre o correo..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} className="h-10 pl-9" /></div><select aria-label="Filtrar por rol" value={role} onChange={(event) => { setRole(event.target.value as UserRole | ""); setPage(1); }} className={filterClass}><option value="">Todos los roles</option>{USER_ROLES.map((role) => <option key={role}>{role}</option>)}</select><select aria-label="Filtrar por estado" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className={filterClass}><option value="">Todos los estados</option><option value="true">Activo</option><option value="false">Inactivo</option></select><Button variant="outline" className="h-10" disabled={loading} onClick={() => void reload()} aria-label="Actualizar usuarios"><RefreshCw className={loading ? "animate-spin" : ""} /><span className="sm:sr-only">Actualizar</span></Button></div>
      {loading ? <div role="status" className="space-y-4 border-t p-6"><p className="text-sm text-slate-500">Cargando usuarios...</p>{[1, 2, 3].map((item) => <div key={item} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div> : error ? <div className="border-t p-8 text-center"><p role="alert" className="mb-4 text-sm text-red-700">{error}</p><Button variant="outline" onClick={() => void reload()}>Reintentar</Button></div> : filtered.length ? <UsersTable users={rows} actorId={profile.id} onSaved={saved} onReload={() => void reload()} /> : <div className="border-t px-6 py-14 text-center"><UsersRound className="mx-auto mb-3 size-8 text-slate-300" /><h2 className="font-semibold">{users.length ? "No encontramos usuarios" : "Tu equipo todavía no tiene miembros"}</h2><p className="mt-2 text-sm text-slate-500">{users.length ? "Prueba con otra búsqueda o ajusta los filtros." : "Registra un usuario para empezar a construir tu equipo."}</p>{users.length > 0 && <Button variant="outline" className="mt-4" onClick={() => { setQuery(""); setRole(""); setStatus(""); setPage(1); }}>Limpiar filtros</Button>}</div>}
      {!loading && !error && <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4"><p aria-live="polite" className="text-xs text-slate-500">Mostrando {filtered.length ? (currentPage - 1) * 10 + 1 : 0}–{Math.min(currentPage * 10, filtered.length)} de {filtered.length} usuarios</p><nav aria-label="Paginación de usuarios" className="flex items-center gap-3"><Button variant="outline" size="icon" aria-label="Página anterior" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft /></Button><span className="text-xs text-slate-500">Página {currentPage} de {pages}</span><Button variant="outline" size="icon" aria-label="Página siguiente" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}><ChevronRight /></Button></nav></div>}
    </section><p className="text-xs leading-relaxed text-slate-500">Los usuarios inactivos conservan sus datos e historial. No se eliminan cuentas desde este módulo.</p>
  </div>;
}
