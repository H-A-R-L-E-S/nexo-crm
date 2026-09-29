import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/features/auth/auth-provider";
import { requireProfile } from "@/features/auth/server";
import { ClientsProvider } from "@/features/clients/clients-provider";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  return <AuthProvider initialProfile={profile}><ClientsProvider><AppShell>{children}</AppShell></ClientsProvider></AuthProvider>;
}
