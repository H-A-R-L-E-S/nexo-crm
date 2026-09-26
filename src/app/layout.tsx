import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { ClientsProvider } from "@/features/clients/clients-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resumen | Nexo CRM",
  description: "Nexo CRM: un espacio para conectar con tus clientes. Demostración con datos ficticios.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">
        <ClientsProvider>
          <AppShell>{children}</AppShell>
          <Toaster theme="light" position="bottom-right" richColors closeButton />
        </ClientsProvider>
      </body>
    </html>
  );
}
