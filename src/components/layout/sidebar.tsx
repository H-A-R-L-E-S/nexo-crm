"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CalendarDays, ChartNoAxesCombined, CheckSquare, CircleHelp, GitBranch, LayoutDashboard, Menu, Settings2, ShoppingBag, Sparkles, UsersRound, UserRoundSearch } from "lucide-react";
import { Brand } from "./brand";
import { WorkspaceDialog, type WorkspacePanel } from "./workspace-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/features/auth/user-menu";
import { useAuth } from "@/features/auth/auth-provider";
import { isAdmin } from "@/features/auth/roles";

const navigation = [
  { label: "Resumen", href: "/", icon: LayoutDashboard },
  { label: "Clientes", href: "/clientes", icon: UsersRound },
  { label: "Leads", href: "/leads", icon: UserRoundSearch },
  { label: "Oportunidades", icon: GitBranch },
  { label: "Ventas", icon: ShoppingBag },
  { label: "Tareas", icon: CheckSquare },
  { label: "Calendario", icon: CalendarDays },
  { label: "Reportes", icon: ChartNoAxesCombined },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { profile } = useAuth();
  const pathname = usePathname();
  const [panel, setPanel] = useState<WorkspacePanel | null>(null);
  return (
    <>
      <div className="px-6 pb-7 pt-7"><Brand /></div>
      <div className="mx-4 mb-7 flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
        <span className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600"><Building2 className="size-[18px]" aria-hidden="true" /></span>
        <div><p className="text-xs font-semibold text-slate-800">Mi empresa</p><p className="mt-0.5 text-[11px] text-slate-500">Espacio de demostración</p></div>
      </div>
      <nav aria-label="Navegación principal" className="space-y-1 px-4">
        <p className="mb-3 px-3 text-[10px] font-semibold tracking-[1.5px] text-slate-400">ESPACIO DE TRABAJO</p>
        {navigation.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          const className = cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600", active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900");
          return href ? <Link key={label} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={className}><Icon className="size-[18px]" aria-hidden="true" />{label}{active && <span className="ml-auto size-1.5 rounded-full bg-blue-600" />}</Link>
            : <button key={label} type="button" className={className} onClick={() => setPanel({ kind: "module", name: label })}><Icon className="size-[18px]" aria-hidden="true" />{label}<span className="ml-auto text-[9px] font-normal text-slate-400">Pronto</span></button>;
        })}
      </nav>
      <div className="mt-auto px-4 pb-4 pt-7">
        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/65 p-3.5"><div className="flex items-center gap-2 text-xs font-semibold text-blue-800"><Sparkles className="size-4" aria-hidden="true" />Tu siguiente gran conexión</div><p className="mt-2 text-[11px] leading-relaxed text-slate-500">Cada relación es una nueva posibilidad. Empieza con tus clientes.</p></div>
        <Link href="/configuracion" onClick={onNavigate} aria-current={pathname === "/configuracion" ? "page" : undefined} className="sidebar-utility"><Settings2 className="size-[17px]" aria-hidden="true" />Configuración</Link>
        {isAdmin(profile.rol) && <Link href="/configuracion/usuarios" onClick={onNavigate} aria-current={pathname === "/configuracion/usuarios" ? "page" : undefined} className={cn("sidebar-utility", pathname === "/configuracion/usuarios" && "bg-blue-50 text-blue-700")}><UsersRound className="size-[17px]" aria-hidden="true" />Usuarios</Link>}
        <button type="button" onClick={() => setPanel({ kind: "help" })} className="sidebar-utility"><CircleHelp className="size-[17px]" aria-hidden="true" />Ayuda</button>
      </div>
      <UserMenu sidebar onNavigate={onNavigate} />
      <WorkspaceDialog panel={panel} onClose={() => setPanel(null)} />
    </>
  );
}

export function DesktopSidebar() {
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col overflow-y-auto border-r border-slate-200/80 bg-white lg:flex"><SidebarContent /></aside>;
}

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  return <Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir navegación"><Menu className="size-5" /></Button></SheetTrigger><SheetContent side="left" className="w-[280px] gap-0 overflow-y-auto p-0"><SheetHeader className="sr-only"><SheetTitle>Navegación de Nexo CRM</SheetTitle><SheetDescription>Accede a los módulos de tu espacio de trabajo.</SheetDescription></SheetHeader><SidebarContent onNavigate={() => setOpen(false)} /></SheetContent></Sheet>;
}
