import { DesktopSidebar } from "./sidebar";
import { Header } from "./header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="crm-shell">
      <a href="#contenido" className="sr-only fixed left-4 top-4 z-[100] rounded-lg bg-blue-600 px-4 py-3 text-sm text-white focus:not-sr-only">Saltar al contenido</a>
      <DesktopSidebar />
      <div className="min-h-svh min-w-0 lg:pl-56">
        <Header />
        <main id="contenido" tabIndex={-1} className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-9 lg:py-8">
          {children}
          <footer className="mt-10 border-t border-border pt-4 text-xs text-muted-foreground">Nexo CRM · Hecho para conectar</footer>
        </main>
      </div>
    </div>
  );
}
