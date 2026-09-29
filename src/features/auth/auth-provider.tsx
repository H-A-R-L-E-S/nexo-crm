"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Profile } from "./types";

const AuthContext = createContext<{ profile: Profile; setProfile: (profile: Profile) => void } | null>(null);

export function AuthProvider({ initialProfile, children }: { initialProfile: Profile; children: ReactNode }) {
  const [profile, setProfile] = useState(initialProfile);
  useEffect(() => {
    const supabase = getSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") window.location.replace("/login?motivo=sesion");
    });
    const validate = async () => {
      if (document.visibilityState !== "visible") return;
      const { error } = await supabase.auth.getUser();
      if (error && (error.status === 401 || error.status === 403 || error.name === "AuthSessionMissingError")) {
        window.location.replace("/login?motivo=sesion");
      }
    };
    document.addEventListener("visibilitychange", validate);
    return () => { subscription.unsubscribe(); document.removeEventListener("visibilitychange", validate); };
  }, []);
  return <AuthContext.Provider value={{ profile, setProfile }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth necesita AuthProvider.");
  return context;
}
