import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { LoginForm } from "@/features/auth/login-form";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Iniciar sesión | Nexo CRM" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const configured = hasSupabaseConfig();
  if (configured) {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect("/");
  }
  const expired = (await searchParams).motivo === "sesion";
  return <main className="flex min-h-svh items-center justify-center px-5 py-12"><div className="w-full max-w-[420px]"><div className="mb-8 flex justify-center"><Brand /></div><section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9"><span className="mb-5 flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><ShieldCheck className="size-6" /></span><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Bienvenido a tu espacio</h1><p className="mt-2 text-sm leading-relaxed text-slate-500">Inicia sesión y sigue construyendo grandes relaciones.</p><LoginForm configured={configured} expired={expired} /></section><p className="mt-7 text-center text-xs text-slate-500">Nexo CRM · Hecho para conectar</p></div></main>;
}
