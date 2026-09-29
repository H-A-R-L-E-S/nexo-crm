"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ configured, expired }: { configured: boolean; expired: boolean }) {
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !configured) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const email = String(fields.get("email") ?? "").trim();
    const password = String(fields.get("password") ?? "");
    const validation = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? undefined : "Ingresa un correo electrónico válido.",
      password: password.length > 0 ? undefined : "Ingresa tu contraseña.",
    };
    setErrors(validation);
    setError("");
    if (validation.email || validation.password) {
      (form.elements.namedItem(validation.email ? "email" : "password") as HTMLInputElement).focus();
      return;
    }
    setPending(true);
    try {
      const { error: authError } = await getSupabaseClient().auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.code === "invalid_credentials" ? "El correo o la contraseña no son correctos." : authError.code === "email_not_confirmed" ? "Tu correo aún no está confirmado. Contacta al administrador." : authError.status === 429 ? "Demasiados intentos. Espera unos minutos antes de volver a intentarlo." : "No pudimos iniciar sesión. Revisa tu conexión o consulta al administrador.");
        setPending(false);
        return;
      }
      // Nueva petición completa: servidor valida cookies y perfil antes de mostrar el CRM.
      window.location.replace("/");
    } catch {
      setError("No se pudo conectar con el servicio. Inténtalo nuevamente.");
      setPending(false);
    }
  }
  return <form onSubmit={submit} noValidate className="mt-8 space-y-5" aria-busy={pending}>
    {expired && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Tu sesión terminó. Inicia sesión para continuar.</p>}
    {!configured && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">La conexión con Supabase aún no está configurada. Consulta al administrador.</p>}
    <div className="space-y-2"><Label htmlFor="email">Correo electrónico</Label><Input id="email" name="email" type="email" autoComplete="username" placeholder="nombre@tuempresa.com" required maxLength={254} disabled={pending} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} className="h-11 bg-white" />{errors.email && <p id="email-error" className="text-xs text-red-700">{errors.email}</p>}</div>
    <div className="space-y-2"><Label htmlFor="password">Contraseña</Label><div className="relative"><Input id="password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" required disabled={pending} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : undefined} className="h-11 bg-white pr-12" /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 text-slate-500" aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff /> : <Eye />}</Button></div>{errors.password && <p id="password-error" className="text-xs text-red-700">{errors.password}</p>}</div>
    {error && <p role="alert" className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <Button type="submit" disabled={pending || !configured} className="h-11 w-full gap-2">{pending ? <Loader2 className="animate-spin" /> : null}{pending ? "Iniciando sesión..." : "Iniciar sesión"}{!pending && <ArrowRight className="size-4" />}</Button>
    <p className="text-center text-xs leading-relaxed text-slate-500">¿Necesitas acceso o recuperar tu contraseña?<br />Contacta al administrador de tu equipo.</p>
  </form>;
}
