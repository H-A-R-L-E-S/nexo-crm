"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { canSelectResponsible, createResponsibleSearchIndex, responsibleName, responsibleOptionState, searchResponsibleIndex } from "./responsible-presentation";
import type { Client, ClientActor, ClientResponsible } from "./types";
import styles from "./responsible-selector.module.css";

export type ResponsibleSelectorProps = {
  id: string;
  value: string | null;
  currentClient?: Client;
  actor: ClientActor;
  items: readonly ClientResponsible[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onChange: (id: string | null) => void;
  errorMessage?: string;
  readOnly?: boolean;
};

export function ResponsibleSelector({
  id, value, currentClient, actor, items, loading, error, onRetry, onChange, errorMessage, readOnly = false,
}: ResponsibleSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const currentOwnerId = currentClient ? currentClient.ownerId : undefined;
  const selected = items.find((person) => person.id === value);
  const current = items.find((person) => person.id === currentOwnerId);
  const lockedByRole = !actor.activo || !["Administrador", "Gerente", "Vendedor"].includes(actor.rol)
    || (actor.rol === "Vendedor" && Boolean(currentClient));
  const disabled = readOnly || lockedByRole || loading || Boolean(error);
  const searchIndex = useMemo(() => createResponsibleSearchIndex(items), [items]);
  const matches = useMemo(() => searchResponsibleIndex(searchIndex, query), [searchIndex, query]);
  const options = matches.slice(0, 100);
  const selectable = options.filter((person) => canSelectResponsible(actor, person, currentOwnerId));
  const activeOption = !disabled && open && options.find((person) => person.id === activeId && canSelectResponsible(actor, person, currentOwnerId));
  const changed = Boolean(currentClient) && value !== currentOwnerId;
  const descriptionIds = [`${id}-help`, currentClient ? `${id}-current` : "", errorMessage ? `${id}-error` : ""].filter(Boolean).join(" ");

  useEffect(() => {
    if (activeOption) listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [activeOption]);

  function choose(person: ClientResponsible) {
    if (disabled || !canSelectResponsible(actor, person, currentOwnerId)) return;
    onChange(person.id);
    inputRef.current?.focus();
    setOpen(false);
    setQuery("");
    setActiveId(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setQuery("");
      setActiveId(null);
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) && (open || event.key.startsWith("Arrow"))) {
      event.preventDefault();
      setOpen(true);
      const index = selectable.findIndex((person) => person.id === activeId);
      const next = event.key === "Home" ? 0 : event.key === "End" ? selectable.length - 1
        : event.key === "ArrowDown" ? (index + 1) % selectable.length
          : index < 0 ? selectable.length - 1 : (index - 1 + selectable.length) % selectable.length;
      setActiveId(selectable[next]?.id ?? null);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeOption) choose(activeOption);
      else setOpen(true);
    }
  }

  return (
    <div className={styles.field} aria-busy={loading} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setQuery(""); setActiveId(null); }
    }}>
      <label htmlFor={id} className={styles.label}>Responsable{!currentClient && <span aria-hidden="true"> *</span>}</label>
      {currentClient && <div id={`${id}-current`} className={styles.current}>
        <p className={styles.caption}>Asignación actual</p>
        <p className={styles.name}>{current ? responsibleName(current) : currentClient.owner || "Sin nombre histórico"}</p>
        <p className={styles.context}>{currentOwnerId === null ? "Pendiente de vincular" : current ? `${current.rol} · ${responsibleOptionState(current)}` : "Referencia vinculada conservada"}</p>
        {currentOwnerId && <p className={styles.identifier}>UUID: {currentOwnerId}</p>}
        {currentOwnerId && currentClient.owner && <p className={styles.context}>Texto histórico: {currentClient.owner}</p>}
      </div>}
      <div className={styles.search}>
        <Search aria-hidden="true" className={styles.searchIcon} />
        <input type="hidden" name="ownerId" value={value ?? ""} />
        <input
          ref={inputRef} id={id} name="ownerSearch" role="combobox" type="text" autoComplete="off" spellCheck={false}
          aria-autocomplete="list" aria-expanded={open && !disabled} aria-controls={`${id}-options`}
          aria-activedescendant={activeOption ? `${id}-option-${activeOption.id}` : undefined}
          aria-invalid={Boolean(errorMessage)} aria-describedby={descriptionIds} aria-required={!currentClient}
          className={styles.input} disabled={disabled} value={open ? query : selected ? responsibleName(selected) : ""}
          placeholder="Buscar por nombre, rol o UUID"
          onFocus={() => { setOpen(true); setQuery(""); }} onClick={() => setOpen(true)}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveId(null); }} onKeyDown={handleKeyDown}
        />
      </div>
      <p id={`${id}-help`} className={styles.help}>
        {lockedByRole ? actor.activo ? "Tu rol permite conservar la asignación actual, pero no cambiarla." : "Tu perfil debe estar activo para asignar responsables."
          : readOnly ? "La selección de responsables está temporalmente deshabilitada."
            : currentClient ? "Puedes conservar esta asignación al editar otros campos." : actor.rol === "Vendedor" ? "Solo puedes seleccionarte a ti mismo con un perfil activo y completo." : "Selecciona un usuario activo con nombres y apellidos completos."}
      </p>
      {loading && <p className={styles.state} role="status">Cargando responsables…</p>}
      {error && <div className={styles.errorState} role="alert">
        <p>No se pudieron cargar los responsables. {error}</p>
        <button type="button" className={styles.retry} onClick={onRetry} disabled={loading}>Reintentar</button>
      </div>}
      {!loading && !error && !lockedByRole && items.length === 0 && <p className={styles.state} role="status">No hay responsables disponibles para tu sesión. Solicita a un administrador que revise los perfiles y permisos.</p>}
      <ul ref={listRef} id={`${id}-options`} role="listbox" aria-label="Responsables reales" className={styles.options} hidden={!open || disabled || options.length === 0}>
        {options.map((person) => {
          const allowed = canSelectResponsible(actor, person, currentOwnerId);
          const isCurrent = person.id === currentOwnerId;
          return <li key={person.id} id={`${id}-option-${person.id}`} role="option" data-responsible-id={person.id}
            aria-selected={person.id === value} aria-disabled={!allowed} data-active={activeOption && person.id === activeOption.id ? "true" : undefined}
            className={styles.option} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(person)}
            onPointerMove={() => { if (allowed) setActiveId(person.id); }}>
            <span className={styles.name}>{responsibleName(person)}</span>
            <span className={styles.context}>{person.rol} · {responsibleOptionState(person)}{isCurrent ? " · Asignación actual" : !allowed ? " · No asignable" : ""}</span>
            <span className={styles.identifier}>UUID: {person.id}</span>
          </li>;
        })}
      </ul>
      {open && !disabled && matches.length > options.length && <p className={styles.help} role="status">Se muestran {options.length} de {matches.length} responsables. Refina la búsqueda para encontrar una persona.</p>}
      {open && !disabled && items.length > 0 && options.length === 0 && <p role="status" className={styles.state}>No hay coincidencias. Busca por nombre, rol o UUID.</p>}
      {open && !disabled && options.length > 0 && selectable.length === 0 && <p role="status" className={styles.help}>Los perfiles mostrados no se pueden asignar. Revisa su estado y tus permisos.</p>}
      {!open && selected && (!currentClient || changed) && <div className={styles.selection} role="status">
        <p className={styles.caption}>Responsable seleccionado</p>
        <p className={styles.name}>{responsibleName(selected)}</p>
        <p className={styles.context}>{selected.rol} · {responsibleOptionState(selected)}</p>
        <p className={styles.identifier}>UUID: {selected.id}</p>
      </div>}
      {changed && !disabled && <button type="button" className={styles.preserve} onClick={() => { onChange(currentOwnerId ?? null); inputRef.current?.focus(); setOpen(false); setQuery(""); setActiveId(null); }}>Conservar asignación actual</button>}
      {errorMessage && <p id={`${id}-error`} className={styles.error} role="alert">{errorMessage}</p>}
    </div>
  );
}
