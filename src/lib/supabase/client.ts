import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";
import type { Database } from "./database.types";

// @supabase/ssr reutiliza el cliente del navegador y almacena la sesión en cookies.
export function getSupabaseClient() {
  const { url, key } = supabaseConfig();
  return createBrowserClient<Database>(url, key);
}
