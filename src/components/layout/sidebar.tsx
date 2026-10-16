"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CalendarDays, ChartNoAxesCombined, CheckSquare, CircleHelp, GitBranch, LayoutDashboard, Menu, Settings2, ShoppingBag, UsersRound, UserRoundSearch } from "lucide-react";
import { Brand } from "./brand";
import { WorkspaceDialog, type WorkspacePanel } from "./workspace-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  { label: "Calendario", href: "/calendario", icon: CalendarDays },
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
      <div className="px-5 pb-6 pt-5"><Brand /></div>
      <div className="mx-5 mb-6 flex items-center gap-2.5">
        <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0"><p className="text-sm font-medium text-foreground">Mi empresa</p><p className="mt-0.5 text-xs text-muted-foreground">Espacio de trabajo</p></div>
      </div>
      <nav aria-label="Navegación principal" className="space-y-0.5 px-3">
        {navigation.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (Boolean(href) && href !== "/" && pathname.startsWith(`${href}/`));
          return <div key={label}>
            {label === "Clientes" && <p className="sidebar-section mt-6">Gestión comercial</p>}
            {label === "Calendario" && <p className="sidebar-section mt-6">Herramientas</p>}
            {href ? <Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className="sidebar-link"><Icon className="size-4 shrink-0" strokeWidth={active ? 2 : 1.75} aria-hidden="true" />{label}</Link>
              : <button type="button" className="sidebar-link" onClick={() => setPanel({ kind: "module", name: label })}><Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />{label}<span className="ml-auto text-xs text-muted-foreground">Pronto</span></button>}
          </div>;
        })}
      </nav>
      <div className="mt-auto px-3 pb-3 pt-8">
        <Link href="/configuracion" onClick={onNavigate} aria-current={pathname === "/configuracion" ? "page" : undefined} className="sidebar-utility"><Settings2 className="size-4" aria-hidden="true" />Configuración</Link>
        {isAdmin(profile.rol) && <Link href="/configuracion/usuarios" onClick={onNavigate} aria-current={pathname === "/configuracion/usuarios" ? "page" : undefined} className="sidebar-utility"><UsersRound className="size-4" aria-hidden="true" />Usuarios</Link>}
        <button type="button" onClick={() => setPanel({ kind: "help" })} className="sidebar-utility"><CircleHelp className="size-4" aria-hidden="true" />Ayuda</button>
      </div>
      <UserMenu sidebar onNavigate={onNavigate} />
      <WorkspaceDialog panel={panel} onClose={() => setPanel(null)} />
    </>
  );
}

export function DesktopSidebar() {
  return <aside className="crm-sidebar fixed inset-y-0 left-0 z-30 hidden w-56 flex-col overflow-y-auto border-r border-border lg:flex"><SidebarContent /></aside>;
}

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const hydrated = useSyncExternalStore(subscribeToHydration, clientHydrated, serverHydrated);
  return <Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="ghost" disabled={!hydrated} className="min-h-11 gap-2 px-2 lg:hidden" aria-label="Abrir navegación"><Menu className="size-5" aria-hidden="true" /><span className="text-xs">Menú</span></Button></SheetTrigger><SheetContent side="left" className="crm-sidebar w-[min(19rem,calc(100vw-2rem))] gap-0 overflow-y-auto p-0"><SheetHeader className="sr-only"><SheetTitle>Navegación de Nexo CRM</SheetTitle><SheetDescription>Accede a los módulos de tu espacio de trabajo.</SheetDescription></SheetHeader><SidebarContent onNavigate={() => setOpen(false)} /></SheetContent></Sheet>;
}
