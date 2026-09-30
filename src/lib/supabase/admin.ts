import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";
import type { Database } from "./database.types";

// No se conecta a las cookies del usuario y no se importa desde componentes cliente.
// El llamador debe verificar sesión y rol ANTES de obtener este cliente privilegiado.
export function getSupabaseAdminClient() {
  const { url } = supabaseConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("La creación de usuarios aún no está configurada. Contacta al responsable del sistema.");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
