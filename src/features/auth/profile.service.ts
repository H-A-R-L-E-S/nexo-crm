import { getSupabaseClient } from "@/lib/supabase/client";
import type { Profile } from "./types";

export async function updateProfileNames(nombres: string, apellidos: string): Promise<Profile> {
  const supabase = getSupabaseClient();
  const { data: { user }, error: sessionError } = await supabase.auth.getUser();
  if (sessionError || !user) throw new Error("Tu sesión terminó. Vuelve a iniciar sesión.");
  const { data, error } = await supabase.from("profiles")
    .update({ nombres: nombres.trim(), apellidos: apellidos.trim() })
    .eq("id", user.id).select("*").single();
  if (error) throw new Error("No se pudo actualizar tu perfil. Verifica tu conexión y tus permisos.");
  return data;
}
