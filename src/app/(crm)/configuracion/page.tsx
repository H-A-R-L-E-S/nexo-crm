import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, UsersRound } from "lucide-react";
import { requireProfile } from "@/features/auth/server";
import { canDeleteClient, isAdmin } from "@/features/auth/roles";

export const metadata: Metadata = { title: "Configuración | Nexo CRM" };
export default async function SettingsPage() {
  const profile = await requireProfile();
  return (
    <div className="space-y-7">
      <div><h1 className="text-2xl font-semibold tracking-tight">Configuración</h1><p className="mt-2 text-sm text-slate-500">Preferencias actuales de tu espacio de trabajo.</p></div>
      {isAdmin(profile.rol) && <Link href="/configuracion/usuarios" className="flex max-w-2xl items-center gap-4 rounded-xl border border-blue-100 bg-white p-6 shadow-sm transition-colors hover:bg-blue-50/50 focus-visible:outline-2 focus-visible:outline-blue-600"><span className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><UsersRound className="size-5" /></span><span className="flex-1"><span className="block font-semibold">Usuarios</span><span className="mt-1 block text-sm text-slate-500">Administra los miembros y permisos de tu equipo.</span></span><ArrowRight className="size-5 text-blue-600" /></Link>}
      <section className="max-w-2xl rounded-xl border bg-white p-6 shadow-sm">
        <dl className="divide-y text-sm">{[["Idioma", "Español (Perú)"], ["Moneda", "Sol peruano · S/"], ["Almacenamiento", "Supabase"], ["Tu rol", profile.rol], ["Permisos de clientes", canDeleteClient(profile.rol) ? "Leer, crear, editar y eliminar" : "Leer, crear y editar"]].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-3 py-4"><dt className="text-slate-500">{label}</dt><dd className="font-medium">{value}</dd></div>)}</dl>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">Las preferencias editables del espacio de trabajo se incorporarán en una siguiente etapa.</p>
      </section>
    </div>
  );
}
