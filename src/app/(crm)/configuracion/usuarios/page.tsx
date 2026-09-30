import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProfile } from "@/features/auth/server";
import { isAdmin } from "@/features/auth/roles";
import { UsersView } from "@/features/users/users-view";

export const metadata: Metadata = { title: "Usuarios | Nexo CRM" };
export default async function UsersPage() {
  const profile = await requireProfile();
  if (!isAdmin(profile.rol)) redirect("/acceso-restringido?motivo=permisos");
  return <UsersView />;
}
