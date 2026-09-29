"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getInitials } from "@/lib/format";
import { useAuth } from "./auth-provider";
import { profileName } from "./types";
import { updateProfileNames } from "./profile.service";

export function ProfileForm() {
  const { profile, setProfile } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const names = String(form.get("nombres") ?? "").trim();
    const surnames = String(form.get("apellidos") ?? "").trim();
    if (!names || names.length > 80 || !surnames || surnames.length > 100) {
      setError("Ingresa tus nombres (hasta 80 caracteres) y apellidos (hasta 100 caracteres).");
      return;
    }
    setError("");
    setPending(true);
    try {
      const updated = await updateProfileNames(names, surnames);
      setProfile(updated);
      toast.success("Perfil actualizado");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el perfil.");
    } finally {
      setPending(false);
    }
  }
  return <section className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="mb-7 flex items-center gap-4"><span className="flex size-14 items-center justify-center rounded-full bg-indigo-50 text-lg font-semibold text-indigo-700">{getInitials(profileName(profile))}</span><div className="min-w-0"><h2 className="truncate font-semibold">{profileName(profile)}</h2><p className="mt-1 text-sm text-slate-500">{profile.rol}</p></div></div><form onSubmit={save} className="space-y-6" aria-busy={pending}><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="profile-names">Nombres</Label><Input id="profile-names" name="nombres" defaultValue={profile.nombres} autoComplete="given-name" required maxLength={80} disabled={pending} /></div><div className="space-y-2"><Label htmlFor="profile-surnames">Apellidos</Label><Input id="profile-surnames" name="apellidos" defaultValue={profile.apellidos} autoComplete="family-name" required maxLength={100} disabled={pending} /></div></div><dl className="space-y-4 rounded-lg bg-slate-50 p-4 text-sm"><div><dt className="text-xs text-slate-500">Correo electrónico</dt><dd className="mt-1 break-all">{profile.email}</dd></div><div className="flex gap-14"><div><dt className="text-xs text-slate-500">Rol</dt><dd className="mt-1">{profile.rol}</dd></div><div><dt className="text-xs text-slate-500">Estado</dt><dd className="mt-1 text-emerald-700">{profile.activo ? "Activo" : "Inactivo"}</dd></div></div></dl><p className="text-xs leading-relaxed text-slate-500">Puedes editar tus nombres y apellidos. Para cambiar el correo, el rol o el estado de tu cuenta, contacta al administrador.</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<Button type="submit" disabled={pending} className="h-10">{pending ? <Loader2 className="animate-spin" /> : <Save />}{pending ? "Guardando..." : "Guardar cambios"}</Button></form></section>;
}
