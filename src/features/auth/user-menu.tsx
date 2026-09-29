"use client";

import Link from "next/link";
import { Settings2, UserRound } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/format";
import { useAuth } from "./auth-provider";
import { profileName } from "./types";
import { LogoutButton } from "./logout-button";

export function UserMenu({ sidebar = false, onNavigate }: { sidebar?: boolean; onNavigate?: () => void }) {
  const { profile } = useAuth();
  const name = profileName(profile);
  return <DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={`Menú de ${name}`} className={sidebar ? "flex w-full items-center gap-3 border-t border-slate-100 p-5 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600" : "flex items-center gap-2.5 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500"}><span className="avatar-profile">{getInitials(name)}</span><span className={sidebar ? "min-w-0" : "hidden min-w-0 xl:block"}><span className="block max-w-36 truncate text-xs font-semibold text-slate-800">{name}</span><span className="mt-0.5 block text-[11px] text-slate-500">{profile.rol}</span></span></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-64"><DropdownMenuLabel className="overflow-hidden"><p className="truncate">{name}</p><p className="mt-1 truncate text-xs font-normal text-slate-500">{profile.email}</p></DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem asChild><Link href="/perfil" onClick={onNavigate}><UserRound />Mi perfil</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href="/configuracion" onClick={onNavigate}><Settings2 />Configuración</Link></DropdownMenuItem><DropdownMenuSeparator /><LogoutButton menu /></DropdownMenuContent></DropdownMenu>;
}

