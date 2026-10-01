import { Info } from "lucide-react";
import { DesktopSidebar } from "./sidebar";
import { Header } from "./header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return <><a href="#contenido" className="sr-only fixed left-4 top-4 z-[100] rounded-lg bg-blue-600 px-4 py-3 text-sm text-white focus:not-sr-only">Saltar al contenido</a><DesktopSidebar /><div className="min-h-svh lg:pl-60"><Header /><main id="contenido" tabIndex={-1} className="mx-auto max-w-[1600px] px-4 py-6 outline-none sm:px-8 sm:py-8 lg:px-9">{children}<footer className="mt-8 flex flex-col justify-between gap-3 border-t border-slate-200/70 pt-5 text-[11px] text-slate-500 sm:flex-row"><p className="flex items-start gap-1.5"><Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />Clientes, Leads, Oportunidades, Ventas y Tareas guardados en Supabase. Los módulos marcados «Pronto» todavía no están disponibles.</p><p className="whitespace-nowrap">Nexo CRM · Hecho para conectar</p></footer></main></div></>;
}
