"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isAdmin, isUserRole } from "./roles";
import type { Profile } from "./types";

const AuthContext = createContext<{ profile: Profile; setProfile: (profile: Profile) => void } | null>(null);

export function AuthProvider({ initialProfile, children }: { initialProfile: Profile; children: ReactNode }) {
  const [profile, setProfile] = useState(initialProfile);
  const pathname = usePathname();
  useEffect(() => {
    const supabase = getSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") window.location.replace("/login?motivo=sesion");
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const supabase = getSupabaseClient();
    let cancelled = false;
    let running = false;
    const validate = async () => {
      if (document.visibilityState !== "visible") return;
      if (running) return;
      running = true;
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (cancelled) return;
        if (error && (error.status === 401 || error.status === 403 || error.name === "AuthSessionMissingError")) {
          window.location.replace("/login?motivo=sesion");
          return;
        }
        if (error || !user) return;
        const { data: current, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
        if (cancelled || profileError) return;
        if (!current?.activo || !isUserRole(current.rol)) {
          window.location.replace("/acceso-restringido");
          return;
        }
        if (pathname.startsWith("/configuracion/usuarios") && !isAdmin(current.rol)) {
          window.location.replace("/acceso-restringido?motivo=permisos");
          return;
        }
        setProfile((previous) => previous.updated_at === current.updated_at && previous.rol === current.rol ? previous : current);
      } finally {
        running = false;
      }
    };
    void validate();
    const interval = window.setInterval(() => void validate(), 60_000);
    document.addEventListener("visibilitychange", validate);
    return () => { cancelled = true; window.clearInterval(interval); document.removeEventListener("visibilitychange", validate); };
  }, [pathname]);
  return <AuthContext.Provider value={{ profile, setProfile }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth necesita AuthProvider.");
  return context;
}
