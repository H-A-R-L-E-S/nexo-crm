import type { Metadata } from "next";
import { requireProfile } from "@/features/auth/server";
import { canDeleteClient } from "@/features/auth/roles";

export const metadata: Metadata = { title: "Configuración | Nexo CRM" };
export default async function SettingsPage() {
  const profile = await requireProfile();
  return <div className="space-y-7"><div><h1 className="text-2xl font-semibold tracking-tight">Configuración</h1><p className="mt-2 text-sm text-slate-500">Preferencias actuales de tu espacio de trabajo.</p></div><section className="max-w-2xl rounded-xl border bg-white p-6 shadow-sm"><dl className="divide-y text-sm">{[["Idioma", "Español (Perú)"], ["Moneda", "Sol peruano · S/"], ["Almacenamiento", "Supabase"], ["Tu rol", profile.rol], ["Permisos de clientes", canDeleteClient(profile.rol) ? "Leer, crear, editar y eliminar" : "Leer, crear y editar"]].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-3 py-4"><dt className="text-slate-500">{label}</dt><dd className="font-medium">{value}</dd></div>)}</dl><p className="mt-4 text-xs leading-relaxed text-slate-500">La administración de usuarios y las preferencias editables del equipo se incorporarán en una siguiente etapa.</p></section></div>;
}
