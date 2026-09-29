import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isUserRole } from "./roles";

// Cache limitada a la petición de render: no comparte usuarios entre sesiones.
export const getCurrentProfile = cache(async () => {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?motivo=sesion");
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { profile: error ? null : profile, error: Boolean(error) };
});

export const requireProfile = cache(async () => {
  const { profile } = await getCurrentProfile();
  if (!profile || !profile.activo || !isUserRole(profile.rol)) redirect("/acceso-restringido");
  return profile;
});
