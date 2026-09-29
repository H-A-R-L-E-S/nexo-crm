import type { Metadata } from "next";
import { requireProfile } from "@/features/auth/server";
import { ProfileForm } from "@/features/auth/profile-form";

export const metadata: Metadata = { title: "Mi perfil | Nexo CRM" };
export default async function ProfilePage() {
  await requireProfile();
  return <div className="space-y-7"><div><h1 className="text-2xl font-semibold tracking-tight">Mi perfil</h1><p className="mt-2 text-sm text-slate-500">Tu información personal y acceso a Nexo CRM.</p></div><ProfileForm /></div>;
}
