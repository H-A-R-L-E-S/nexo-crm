"use client";

import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function LogoutButton({ menu = false }: { menu?: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const { error } = await getSupabaseClient().auth.signOut({ scope: "local" });
      if (error) throw error;
      window.location.replace("/login");
    } catch {
      setError("No se pudo cerrar la sesión. Inténtalo de nuevo.");
      setPending(false);
    }
  }
  const content = <>{pending ? <Loader2 className="animate-spin" /> : <LogOut />}{pending ? "Cerrando sesión..." : "Cerrar sesión"}</>;
  return <>{menu ? <DropdownMenuItem disabled={pending} onSelect={(event) => { event.preventDefault(); void logout(); }}>{content}</DropdownMenuItem> : <Button variant="ghost" className="w-full justify-start text-slate-600" onClick={logout} disabled={pending}>{content}</Button>}{error && <p role="alert" className="px-2 py-1 text-xs text-red-700">{error}</p>}</>;
}
