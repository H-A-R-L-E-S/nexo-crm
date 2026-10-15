"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Search, UsersRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-provider";
import { USER_ROLES, type UserRole } from "@/features/auth/roles";
import type { Profile } from "@/features/auth/types";
import { listUsersAction } from "./actions";
import { UserFormDialog } from "./user-form";
import { UsersTable } from "./users-table";
import styles from "./users.module.css";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

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
    setLoading(true);
    setError("");
    try {
      const result = await listUsersAction();
      if (requestVersion !== version.current) return;
      if (result.ok) setUsers(result.data);
      else setError(result.error);
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
    setUsers((current) => current.some((user) => user.id === updated.id)
      ? current.map((user) => user.id === updated.id ? updated : user)
      : [updated, ...current]);
    if (updated.id === profile.id) setProfile(updated);
  }

  function clearFilters() {
    setQuery("");
    setRole("");
    setStatus("");
    setPage(1);
  }

  const filtered = users.filter((user) =>
    (!role || user.rol === role)
    && (!status || String(user.activo) === status)
    && normalize(`${user.nombres} ${user.apellidos} ${user.email}`).includes(normalize(query.trim()))
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  const active = users.filter((user) => user.activo).length;
  const inactive = users.length - active;
  const roles = USER_ROLES.map((name) => ({ name, count: users.filter((user) => user.rol === name).length }));
  const hasFilters = Boolean(query || role || status);

  return <main className={styles.page} data-users-page>
    <header className={styles.header}>
      <div>
        <p className={styles.context}>Configuración · Equipo</p>
        <h1>Usuarios</h1>
        <p>Administra quién entra a Nexo y qué responsabilidad tiene dentro del equipo.</p>
      </div>
      <UserFormDialog onSaved={(user) => { saved(user); clearFilters(); }} onPartial={() => void reload()} />
    </header>

    <section aria-label="Indicadores del equipo" className={styles.summary} aria-busy={loading}>
      <div className={styles.teamTotal}>
        <p>Equipo registrado</p>
        <strong>{loading || error ? "–" : users.length}</strong>
        <span>{loading || error ? "Consultando el directorio" : `${active} con acceso · ${inactive} sin acceso`}</span>
      </div>
      <dl className={styles.roleSummary}>
        {roles.map(({ name, count }) => <div key={name}>
          <dt>{name === "Administrador" ? "Administradores" : `${name}s`}</dt>
          <dd>{loading || error ? "–" : count}</dd>
        </div>)}
      </dl>
    </section>

    <section aria-label="Directorio del equipo" className={styles.workspace} aria-busy={loading}>
      <div className={styles.workspaceHeader}>
        <div>
          <h2>Directorio del equipo</h2>
          <p>{loading ? "Preparando usuarios y permisos" : `${filtered.length} ${filtered.length === 1 ? "persona visible" : "personas visibles"} · indicadores globales`}</p>
        </div>
        <Button variant="outline" disabled={loading} onClick={() => void reload()} aria-label="Actualizar usuarios">
          <RefreshCw className={loading ? styles.spinning : ""} aria-hidden="true" />
          {loading ? "Actualizando" : "Actualizar"}
        </Button>
      </div>

      <div className={styles.filters}>
        <div className={styles.search}>
          <Search aria-hidden="true" />
          <Input aria-label="Buscar usuarios" placeholder="Buscar nombre o correo" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
        </div>
        <label><span>Rol</span><select aria-label="Filtrar por rol" value={role} onChange={(event) => { setRole(event.target.value as UserRole | ""); setPage(1); }}><option value="">Todos los roles</option>{USER_ROLES.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label><span>Acceso</span><select aria-label="Filtrar por estado" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Todos los estados</option><option value="true">Activo</option><option value="false">Inactivo</option></select></label>
      </div>

      {hasFilters && <div className={styles.activeFilters} aria-label="Filtros activos">
        {query && <button type="button" onClick={() => { setQuery(""); setPage(1); }}>Búsqueda: {query}<X aria-hidden="true" /></button>}
        {role && <button type="button" onClick={() => { setRole(""); setPage(1); }}>Rol: {role}<X aria-hidden="true" /></button>}
        {status && <button type="button" onClick={() => { setStatus(""); setPage(1); }}>Acceso: {status === "true" ? "Activo" : "Inactivo"}<X aria-hidden="true" /></button>}
        <Button variant="ghost" size="sm" onClick={clearFilters}>Limpiar filtros</Button>
      </div>}

      {loading ? <div role="status" className={styles.loadingState}>
        <p>Cargando usuarios y permisos...</p>
        {[1, 2, 3].map((item) => <span key={item} />)}
      </div> : error ? <div className={styles.state} role="alert">
        <h2>No pudimos cargar el equipo</h2><p>{error}</p><Button variant="outline" onClick={() => void reload()}>Reintentar</Button>
      </div> : filtered.length ? <UsersTable users={rows} actorId={profile.id} onSaved={saved} onReload={() => void reload()} /> : <div className={styles.state}>
        <UsersRound aria-hidden="true" />
        <h2>{users.length ? "No encontramos usuarios" : "Tu equipo todavía no tiene miembros"}</h2>
        <p>{users.length ? "Prueba otra búsqueda o ajusta los filtros." : "Registra un usuario para empezar a construir tu equipo."}</p>
      </div>}

      {!loading && !error && <footer className={styles.pagination}>
        <p aria-live="polite">Mostrando {filtered.length ? (currentPage - 1) * 10 + 1 : 0}–{Math.min(currentPage * 10, filtered.length)} de {filtered.length}</p>
        <nav aria-label="Paginación de usuarios">
          <Button variant="outline" aria-label="Página anterior" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft aria-hidden="true" /><span>Anterior</span></Button>
          <span>Página {currentPage} de {pages}</span>
          <Button variant="outline" aria-label="Página siguiente" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}><span>Siguiente</span><ChevronRight aria-hidden="true" /></Button>
        </nav>
      </footer>}
    </section>
    <p className={styles.footnote}>Las cuentas inactivas conservan sus datos e historial. Este módulo no elimina usuarios.</p>
  </main>;
}
