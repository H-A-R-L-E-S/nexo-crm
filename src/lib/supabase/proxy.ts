import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseConfig, supabaseConfig } from "./config";
import type { Database } from "./database.types";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const login = request.nextUrl.pathname === "/login";
  function finish(destination?: string) {
    const result = destination ? NextResponse.redirect(new URL(destination, request.url)) : response;
    if (destination) response.cookies.getAll().forEach((cookie) => result.cookies.set(cookie));
    result.headers.set("Cache-Control", "private, no-store, max-age=0");
    return result;
  }
  if (!hasSupabaseConfig()) return finish(login ? undefined : "/login");
  const { url, key } = supabaseConfig();
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // Valida contra Auth; nunca se autoriza confiando en getSession() o en la cookie sola.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !login) {
    const hadSession = request.cookies.getAll().some(({ name }) => name.startsWith("sb-"));
    return finish(hadSession ? "/login?motivo=sesion" : "/login");
  }
  if (user && login) return finish("/");
  return finish();
}
