import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/features/auth/server";
import { isUserRole } from "@/features/auth/roles";
import { LogoutButton } from "@/features/auth/logout-button";
import { Brand } from "@/components/layout/brand";

export default async function RestrictedPage() {
  const { profile } = await getCurrentProfile();
  if (profile?.activo && isUserRole(profile.rol)) redirect("/");
  return <main className="mx-auto flex min-h-svh max-w-lg flex-col justify-center gap-6 px-6"><Brand /><section className="rounded-xl border bg-white p-7"><h1 className="text-xl font-semibold">Tu acceso necesita revisión</h1><p className="my-4 text-sm leading-relaxed text-slate-500">No pudimos cargar un perfil activo para tu cuenta. Contacta al administrador para verificar el perfil, su estado y la configuración de permisos.</p><Link href="/" className="mb-5 inline-block text-sm text-blue-700 underline">Volver a comprobar acceso</Link><LogoutButton /></section></main>;
}
