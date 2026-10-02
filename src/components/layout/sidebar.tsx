"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CalendarDays, ChartNoAxesCombined, CheckSquare, CircleHelp, GitBranch, LayoutDashboard, Menu, Settings2, ShoppingBag, UsersRound, UserRoundSearch } from "lucide-react";
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
  { label: "Oportunidades", href: "/oportunidades", icon: GitBranch },
  { label: "Ventas", href: "/ventas", icon: ShoppingBag },
  { label: "Tareas", href: "/tareas", icon: CheckSquare },
  { label: "Calendario", icon: CalendarDays },
  { label: "Reportes", icon: ChartNoAxesCombined },
];

const subscribeToHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { profile } = useAuth();
  const pathname = usePathname();
  const [panel, setPanel] = useState<WorkspacePanel | null>(null);
  return (
    <>
      <div className="px-6 pb-5 pt-6"><Brand /></div>
      <div className="mx-5 mb-5 flex items-center gap-3 border-b border-slate-200 pb-5">
        <Building2 className="size-5 shrink-0 text-slate-600" aria-hidden="true" />
        <div><p className="text-sm font-medium text-slate-800">Mi empresa</p><p className="mt-0.5 text-xs text-slate-600">Espacio de trabajo</p></div>
      </div>
      <nav aria-label="Navegación principal" className="space-y-1 px-4">
        <p className="mb-2 px-3 text-xs font-medium text-slate-600">Gestión comercial</p>
        {navigation.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (Boolean(href) && href !== "/" && pathname.startsWith(`${href}/`));
          const className = cn("flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors active:bg-blue-100", active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900");
          return href ? <Link key={label} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={className}><Icon className="size-[18px]" aria-hidden="true" />{label}{active && <span className="ml-auto size-1.5 rounded-full bg-blue-600" />}</Link>
            : <button key={label} type="button" className={className} onClick={() => setPanel({ kind: "module", name: label })}><Icon className="size-[18px]" aria-hidden="true" />{label}<span className="ml-auto text-xs font-normal text-slate-600">Pronto</span></button>;
        })}
      </nav>
      <div className="mt-auto px-4 pb-3 pt-6">
        <div className="mb-3 border-t border-slate-200" />
        <Link href="/configuracion" onClick={onNavigate} aria-current={pathname === "/configuracion" ? "page" : undefined} className={cn("sidebar-utility", pathname === "/configuracion" && "bg-blue-50 text-blue-700")}><Settings2 className="size-[17px]" aria-hidden="true" />Configuración</Link>
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
  const hydrated = useSyncExternalStore(subscribeToHydration, clientHydrated, serverHydrated);
  return <Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="ghost" disabled={!hydrated} className="min-h-11 gap-2 px-2 lg:hidden" aria-label="Abrir navegación"><Menu className="size-5" /><span className="text-xs">Menú</span></Button></SheetTrigger><SheetContent side="left" className="w-[min(19rem,calc(100vw-2rem))] gap-0 overflow-y-auto p-0"><SheetHeader className="sr-only"><SheetTitle>Navegación de Nexo CRM</SheetTitle><SheetDescription>Accede a los módulos de tu espacio de trabajo.</SheetDescription></SheetHeader><SidebarContent onNavigate={() => setOpen(false)} /></SheetContent></Sheet>;
}
