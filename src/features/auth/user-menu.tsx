"use client";

import Link from "next/link";
import { ChevronsUpDown, Settings2, UserRound } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/format";
import { useAuth } from "./auth-provider";
import { profileName } from "./types";
import { LogoutButton } from "./logout-button";

export function UserMenu({ sidebar = false, onNavigate }: { sidebar?: boolean; onNavigate?: () => void }) {
  const { profile } = useAuth();
  const name = profileName(profile);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={`Menú de ${name}`} className={sidebar ? "flex w-full items-center gap-2.5 border-t border-border px-4 py-4 text-left transition-colors hover:bg-muted" : "flex min-h-9 min-w-9 items-center justify-center rounded-md p-0.5 text-left transition-colors hover:bg-muted"}>
          <span className="avatar-profile">{getInitials(name)}</span>
          {sidebar && <><span className="min-w-0 flex-1"><span className="block break-words text-xs font-medium text-foreground">{name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{profile.rol}</span></span><ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /></>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side={sidebar ? "top" : "bottom"} sideOffset={8} className="w-64 max-w-[calc(100vw-2rem)] p-1.5">
        <DropdownMenuLabel className="px-2 py-2.5"><p className="break-words text-sm font-medium text-foreground">{name}</p><p className="mt-1 break-all text-xs font-normal text-muted-foreground">{profile.email}</p><p className="mt-1 text-xs font-normal text-muted-foreground">{profile.rol}</p></DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href="/perfil" onClick={onNavigate}><UserRound />Mi perfil</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/configuracion" onClick={onNavigate}><Settings2 />Configuración</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <LogoutButton menu />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

