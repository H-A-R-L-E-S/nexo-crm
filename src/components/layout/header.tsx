"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CheckCheck, ChevronRight, Search } from "lucide-react";
import { MobileNavigation } from "./sidebar";
import { ThemeSwitcher } from "./theme-switcher";
import { UserMenu } from "@/features/auth/user-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <header className="crm-header border-b border-border px-4 sm:px-6 lg:px-9">
      <div className="mx-auto flex min-h-14 max-w-[1408px] flex-wrap items-center gap-x-2 gap-y-1 py-2 sm:flex-nowrap sm:gap-x-3">
        <div className="flex min-w-0 items-center gap-2"><MobileNavigation /><span className="hidden text-xs text-muted-foreground xl:block">Mi empresa</span><ChevronRight className="hidden size-3.5 text-muted-foreground xl:block" aria-hidden="true" /><span className="text-sm font-medium">{{ "/clientes": "Clientes", "/leads": "Leads", "/oportunidades": "Oportunidades", "/ventas": "Ventas", "/tareas": "Tareas", "/perfil": "Mi perfil", "/configuracion": "Configuración", "/configuracion/usuarios": "Usuarios" }[pathname] ?? (pathname.startsWith("/ventas/") ? "Detalle de venta" : pathname.startsWith("/tareas/") ? "Detalle de tarea" : "Resumen")}</span></div>
        <form role="search" aria-label="Búsqueda de clientes" onSubmit={search} className="relative order-last w-full sm:order-none sm:ml-auto sm:w-[min(30vw,300px)]">
          <Input aria-label="Buscar en Nexo" placeholder="Buscar clientes..." value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 rounded-md bg-muted pl-3 pr-11 text-sm shadow-none" />
          <Button type="submit" variant="ghost" size="icon" aria-label="Ejecutar búsqueda" className="absolute right-0 top-0 size-9 text-muted-foreground"><Search className="size-4" aria-hidden="true" /></Button>
        </form>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0 sm:gap-2">
          <ThemeSwitcher />
          <Dialog>
            <DialogTrigger asChild><Button variant="ghost" size="icon" className="header-control relative" aria-label="Notificaciones"><Bell className="size-[18px]" aria-hidden="true" />{!read && <span className="absolute right-2 top-1.5 size-1.5 rounded-full bg-primary ring-2 ring-background" />}</Button></DialogTrigger>
            <DialogContent className="p-6 sm:max-w-md"><DialogHeader><DialogTitle>Notificaciones</DialogTitle><DialogDescription>{read ? "No tienes avisos pendientes en esta sesión." : "Una notificación de demostración."}</DialogDescription></DialogHeader><div className="border-b border-slate-200 pb-4"><p className="text-sm font-semibold">Te damos la bienvenida a Nexo CRM</p><p className="mt-2 text-sm leading-relaxed text-slate-600">Explora tu cartera y registra un cliente desde el resumen.</p><p className="mt-3 text-xs text-slate-600">Notificación de demostración</p></div><Button variant="outline" className="h-11" disabled={read} onClick={() => setRead(true)}><CheckCheck />{read ? "Todas leídas" : "Marcar como leída"}</Button></DialogContent>
          </Dialog>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
