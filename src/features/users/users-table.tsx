"use client";

import { Pencil, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { profileName, type Profile } from "@/features/auth/types";
import { getInitials } from "@/lib/format";
import { UserFormDialog } from "./user-form";
import { UserStatusDialog } from "./user-status";
import styles from "./users.module.css";

const dateFormat = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Lima" });

function Role({ role }: { role: Profile["rol"] }) {
  return <span className={styles.role} data-role={role}>{role === "Administrador" && <ShieldCheck aria-hidden="true" />}{role}</span>;
}

function Status({ active }: { active: boolean }) {
  return <span className={styles.status} data-active={active}>{active ? "Activo" : "Inactivo"}</span>;
}

function Actions({ user, actorId, onSaved, onReload }: { user: Profile; actorId: string; onSaved: (profile: Profile) => void; onReload: () => void }) {
  const name = profileName(user);
  return <div className={styles.actions}>
    <UserFormDialog user={user} onSaved={onSaved} onPartial={onReload}>
      <Button variant="ghost" aria-label={`Editar a ${name}`}><Pencil aria-hidden="true" />Editar</Button>
    </UserFormDialog>
    <UserStatusDialog user={user} self={user.id === actorId} onSaved={onSaved} />
  </div>;
}

export function UsersTable({ users, actorId, onSaved, onReload }: { users: Profile[]; actorId: string; onSaved: (profile: Profile) => void; onReload: () => void }) {
  return <>
    <div className={styles.desktopTable}>
      <table>
        <caption className="sr-only">Usuarios del equipo, permisos y estado de acceso</caption>
        <thead><tr><th scope="col">Usuario</th><th scope="col">Correo</th><th scope="col">Rol</th><th scope="col">Acceso</th><th scope="col">Alta</th><th scope="col">Acciones</th></tr></thead>
        <tbody>{users.map((user) => {
          const name = profileName(user);
          return <tr key={user.id}>
            <th scope="row"><div className={styles.identity}><span>{getInitials(name)}</span><div><strong title={name}>{name}</strong>{user.id === actorId && <small>Tu cuenta</small>}</div></div></th>
            <td className={styles.email}>{user.email}</td>
            <td><Role role={user.rol} /></td>
            <td><Status active={user.activo} /></td>
            <td className={styles.date}>{dateFormat.format(new Date(user.created_at))}</td>
            <td><Actions user={user} actorId={actorId} onSaved={onSaved} onReload={onReload} /></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    <div className={styles.mobileList}>
      {users.map((user) => {
        const name = profileName(user);
        return <article key={user.id}>
          <header><div className={styles.identity}><span>{getInitials(name)}</span><div><h3>{name}</h3><p>{user.email}</p>{user.id === actorId && <small>Tu cuenta</small>}</div></div><Status active={user.activo} /></header>
          <dl><div><dt>Rol</dt><dd><Role role={user.rol} /></dd></div><div><dt>Alta</dt><dd>{dateFormat.format(new Date(user.created_at))}</dd></div></dl>
          <Actions user={user} actorId={actorId} onSaved={onSaved} onReload={onReload} />
        </article>;
      })}
    </div>
  </>;
}
