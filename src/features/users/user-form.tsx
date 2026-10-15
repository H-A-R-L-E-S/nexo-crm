"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Eye, EyeOff, Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { USER_ROLES } from "@/features/auth/roles";
import { useAuth } from "@/features/auth/auth-provider";
import type { Profile } from "@/features/auth/types";
import { createUserAction, editUserAction } from "./actions";
import { validateEditUser, validateNewUser } from "./validation";
import styles from "./users.module.css";

const selectClass = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500";

type Props = { user?: Profile; onSaved: (profile: Profile) => void; onPartial: () => void; children?: ReactNode };

export function UserFormDialog({ user, onSaved, onPartial, children }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  return <Dialog open={open} onOpenChange={(value) => { if (!pending) setOpen(value); }}><DialogTrigger asChild>{children ?? <Button className={styles.primaryAction}><Plus aria-hidden="true" />Nuevo usuario</Button>}</DialogTrigger><DialogContent className={styles.formDialog} showCloseButton={!pending}><DialogHeader className={styles.dialogHeader}><DialogTitle>{user ? "Editar usuario" : "Nuevo usuario"}</DialogTitle><DialogDescription>{user ? "Actualiza los datos y permisos de este miembro del equipo." : "Crea una cuenta para un nuevo miembro de tu equipo."}</DialogDescription></DialogHeader><UserForm user={user} pending={pending} setPending={setPending} onPartial={onPartial} onSaved={(profile) => { onSaved(profile); setOpen(false); }} onCancel={() => setOpen(false)} /></DialogContent></Dialog>;
}

function UserForm({ user, onSaved, onPartial, pending, setPending, onCancel }: Omit<Props, "children"> & { pending: boolean; setPending: (pending: boolean) => void; onCancel: () => void }) {
  const id = useId();
  const { profile } = useAuth();
  const self = user?.id === profile.id;
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [partial, setPartial] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || partial) return;
    const data = new FormData(event.currentTarget);
    setError("");
    const fields = { nombres: data.get("nombres"), apellidos: data.get("apellidos"), rol: self ? user.rol : data.get("rol"), activo: self ? user.activo : data.get("activo") === "true" };
    try {
      const input = user ? validateEditUser({ ...fields, id: user.id, updatedAt: user.updated_at }) : validateNewUser({ ...fields, email: data.get("email"), password: data.get("password"), passwordConfirmation: data.get("passwordConfirmation") });
      setPending(true);
      const result = user ? await editUserAction(input) : await createUserAction(input);
      if (!result.ok) {
        setError(result.error);
        if (result.partial) { setPartial(true); onPartial(); }
        return;
      }
      toast.success(user ? "Usuario actualizado" : "Usuario creado", { description: "Los permisos se guardaron correctamente." });
      onSaved(result.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar. Inténtalo nuevamente.");
    } finally {
      setPending(false);
    }
  }
  return <form onSubmit={submit} noValidate className={styles.userForm} aria-busy={pending}>
    <fieldset disabled={pending || partial}>
      <div className={styles.fieldGrid}><div className={styles.field}><Label htmlFor={`${id}-nombres`}>Nombres</Label><Input id={`${id}-nombres`} name="nombres" defaultValue={user?.nombres} maxLength={80} required autoComplete="off" /></div><div className={styles.field}><Label htmlFor={`${id}-apellidos`}>Apellidos</Label><Input id={`${id}-apellidos`} name="apellidos" defaultValue={user?.apellidos} maxLength={100} required autoComplete="off" /></div></div>
      <div className={styles.field}><Label htmlFor={`${id}-email`}>Correo electrónico</Label><Input id={`${id}-email`} name="email" type="email" defaultValue={user?.email} readOnly={Boolean(user)} maxLength={254} required autoComplete="off" className={user ? styles.readonly : ""} />{user && <p>El correo no se modifica desde esta pantalla.</p>}</div>
      {!user && <><div className={styles.field}><Label htmlFor={`${id}-password`}>Contraseña temporal</Label><div className={styles.password}><Input id={`${id}-password`} name="password" type={visible ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} required aria-describedby={`${id}-password-help`} /><Button type="button" variant="ghost" size="icon" aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff /> : <Eye />}</Button></div><p id={`${id}-password-help`}>Al menos 12 caracteres, con letras y números.</p></div><div className={styles.field}><Label htmlFor={`${id}-confirm`}>Confirmar contraseña</Label><Input id={`${id}-confirm`} name="passwordConfirmation" type={visible ? "text" : "password"} autoComplete="new-password" maxLength={128} required /></div></>}
      <div className={styles.fieldGrid}><div className={styles.field}><Label htmlFor={`${id}-rol`}>Rol</Label><select id={`${id}-rol`} name="rol" defaultValue={user?.rol ?? "Vendedor"} disabled={self} className={selectClass}>{USER_ROLES.map((role) => <option key={role}>{role}</option>)}</select></div><div className={styles.field}><Label htmlFor={`${id}-activo`}>Estado</Label><select id={`${id}-activo`} name="activo" defaultValue={String(user?.activo ?? true)} disabled={self} className={selectClass}><option value="true">Activo</option><option value="false">Inactivo</option></select></div></div>
    </fieldset>
    {self && <p className={styles.securityNote}>Para proteger tu acceso, no puedes cambiar tu propio rol ni desactivar tu cuenta.</p>}
    {!user && <p className={styles.formNote}>Comunica la contraseña al usuario por un canal seguro. No se envía un correo de invitación ni se exige su cambio automático en esta etapa.</p>}
    {error && <p role="alert" className={styles.formError}>{error}</p>}
    <div className={styles.formActions}><Button type="button" variant="outline" disabled={pending} onClick={onCancel}>{partial ? "Cerrar" : "Cancelar"}</Button><Button type="submit" disabled={pending || partial}>{pending ? <Loader2 className={styles.spinning} /> : <Save />}{pending ? "Guardando..." : user ? "Guardar cambios" : "Crear usuario"}</Button></div>
  </form>;
}
