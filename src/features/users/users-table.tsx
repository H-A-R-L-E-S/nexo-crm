"use client";

import { Pencil, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { profileName, type Profile } from "@/features/auth/types";
import { getInitials } from "@/lib/format";
import { UserFormDialog } from "./user-form";
import { UserStatusDialog } from "./user-status";

const dateFormat = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Lima" });
const roles = { Administrador: "border-blue-100 bg-blue-50 text-blue-700", Gerente: "border-violet-100 bg-violet-50 text-violet-700", Vendedor: "border-slate-200 bg-slate-50 text-slate-600" };

export function UsersTable({ users, actorId, onSaved, onReload }: { users: Profile[]; actorId: string; onSaved: (profile: Profile) => void; onReload: () => void }) {
  return <Table><TableCaption className="sr-only">Usuarios del equipo y sus permisos de acceso</TableCaption><TableHeader><TableRow className="bg-slate-50/70 hover:bg-slate-50/70"><TableHead className="pl-6">Usuario</TableHead><TableHead>Correo</TableHead><TableHead>Rol</TableHead><TableHead>Estado</TableHead><TableHead>Fecha de creación</TableHead><TableHead className="pr-6 text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>{users.map((user) => <TableRow key={user.id}><TableCell className="py-4 pl-6"><div className="flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">{getInitials(profileName(user))}</span><div className="min-w-0"><p className="max-w-48 truncate font-medium text-slate-800" title={profileName(user)}>{profileName(user)}</p>{user.id === actorId && <p className="mt-0.5 text-[11px] text-slate-500">Tú</p>}</div></div></TableCell><TableCell className="text-slate-500">{user.email}</TableCell><TableCell><Badge variant="outline" className={`gap-1.5 font-medium ${roles[user.rol]}`}>{user.rol === "Administrador" && <ShieldCheck className="size-3" />}{user.rol}</Badge></TableCell><TableCell><Badge variant="outline" className={user.activo ? "border-emerald-100 bg-emerald-50 font-medium text-emerald-700" : "border-slate-200 bg-slate-100 font-medium text-slate-500"}><span className="mr-1 size-1.5 rounded-full bg-current" />{user.activo ? "Activo" : "Inactivo"}</Badge></TableCell><TableCell className="text-xs text-slate-500">{dateFormat.format(new Date(user.created_at))}</TableCell><TableCell className="pr-6"><div className="flex justify-end gap-1"><UserFormDialog user={user} onSaved={onSaved} onPartial={onReload}><Button variant="ghost" size="icon" aria-label={`Editar a ${profileName(user)}`} className="text-slate-500"><Pencil className="size-4" /></Button></UserFormDialog><UserStatusDialog user={user} self={user.id === actorId} onSaved={onSaved} /></div></TableCell></TableRow>)}</TableBody></Table>;
}
