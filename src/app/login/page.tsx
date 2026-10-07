import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/login-form";
import { LoginScene } from "@/features/auth/login-scene";
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
  return <LoginScene><LoginForm configured={configured} expired={expired} /></LoginScene>;
}
