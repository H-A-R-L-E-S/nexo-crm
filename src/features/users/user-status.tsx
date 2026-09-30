"use client";

import { useState } from "react";
import { UserRoundCheck, UserRoundX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { profileName, type Profile } from "@/features/auth/types";
import { setUserStatusAction } from "./actions";

export function UserStatusDialog({ user, self, onSaved }: { user: Profile; self: boolean; onSaved: (profile: Profile) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const action = user.activo ? "Inactivar" : "Activar";
  async function confirm() {
    if (pending || self) return;
    setPending(true); setError("");
    try {
      const result = await setUserStatusAction({ id: user.id, activo: !user.activo, updatedAt: user.updated_at });
      if (!result.ok) { setError(result.error); return; }
      onSaved(result.data);
      toast.success(result.data.activo ? "Usuario activado" : "Usuario inactivado");
      setOpen(false);
    } catch { setError("No se pudo cambiar el estado. Inténtalo nuevamente."); }
    finally { setPending(false); }
  }
  return <AlertDialog open={open} onOpenChange={(value) => { if (!pending) { setOpen(value); setError(""); } }}><AlertDialogTrigger asChild><Button variant="ghost" size="icon" disabled={self} aria-label={`${action} a ${profileName(user)}`} title={self ? "No puedes desactivar tu propia cuenta" : `${action} usuario`} className={user.activo ? "text-slate-500 hover:text-amber-700" : "text-emerald-700"}>{user.activo ? <UserRoundX /> : <UserRoundCheck />}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{action} usuario</AlertDialogTitle><AlertDialogDescription>{user.activo ? `${profileName(user)} perderá el acceso al CRM. Sus datos e historial se conservarán.` : `${profileName(user)} podrá volver a acceder al CRM con el rol ${user.rol}.`}</AlertDialogDescription></AlertDialogHeader>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<AlertDialogFooter><AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={pending} onClick={(event) => { event.preventDefault(); void confirm(); }}>{pending ? "Guardando..." : `${action} usuario`}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
