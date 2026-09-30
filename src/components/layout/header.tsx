"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CheckCheck, Search } from "lucide-react";
import { MobileNavigation } from "./sidebar";
import { UserMenu } from "@/features/auth/user-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [read, setRead] = useState(false);
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(query.trim() ? `/clientes?buscar=${encodeURIComponent(query.trim())}` : "/clientes");
  }
  return (
    <header className="border-b border-slate-200/80 bg-white px-4 sm:px-8 lg:px-9">
      <div className="flex min-h-[76px] flex-wrap items-center gap-x-4 gap-y-2 py-3">
        <div className="flex shrink-0 items-center gap-3"><MobileNavigation /><span className="text-sm font-semibold text-slate-800">{{ "/clientes": "Clientes", "/perfil": "Mi perfil", "/configuracion": "Configuración", "/configuracion/usuarios": "Usuarios" }[pathname] ?? "Resumen"}</span></div>
        <form role="search" onSubmit={search} className="relative order-last w-full sm:order-none sm:ml-auto sm:w-[min(30vw,320px)]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input aria-label="Buscar en Nexo" placeholder="Buscar clientes..." value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-xs outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </form>
        <div className="ml-auto flex items-center gap-3 sm:ml-1 sm:gap-5">
          <Dialog>
            <DialogTrigger asChild><Button variant="ghost" size="icon" className="relative text-slate-500" aria-label="Notificaciones"><Bell className="size-[19px]" />{!read && <span className="absolute right-2 top-1.5 size-1.5 rounded-full bg-blue-600 ring-2 ring-white" />}</Button></DialogTrigger>
            <DialogContent className="p-6 sm:max-w-md"><DialogHeader><DialogTitle>Notificaciones</DialogTitle><DialogDescription>{read ? "Estás al día con tu espacio." : "Una novedad en tu espacio de demostración."}</DialogDescription></DialogHeader><div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4"><p className="text-sm font-semibold">Te damos la bienvenida a Nexo CRM</p><p className="mt-2 text-xs leading-relaxed text-slate-500">Tu cartera de demostración está lista. Crea tu primer cliente para conocer cómo funciona.</p><p className="mt-3 text-[11px] text-slate-400">Notificación de demostración</p></div><Button variant="outline" disabled={read} onClick={() => setRead(true)}><CheckCheck />{read ? "Todas leídas" : "Marcar como leída"}</Button></DialogContent>
          </Dialog>
          <span className="h-7 w-px bg-slate-200" aria-hidden="true" />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
