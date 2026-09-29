import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resumen | Nexo CRM",
  description: "Nexo CRM: un espacio para conectar con tus clientes.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">
        {children}
        <Toaster theme="light" position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
