import type { Profile } from "@/features/auth/types";

export const LEAD_ESTADOS = ["Nuevo", "Contactado", "Calificado", "No interesado", "Convertido"] as const;
export const LEAD_PRIORIDADES = ["Alta", "Media", "Baja"] as const;
export const LEAD_FUENTES = ["Web", "Referido", "Redes sociales", "Campaña", "Llamada", "Evento", "Otro"] as const;
export type LeadEstado = (typeof LEAD_ESTADOS)[number];
export type LeadPrioridad = (typeof LEAD_PRIORIDADES)[number];
export type LeadFuente = (typeof LEAD_FUENTES)[number];

export type Lead = {
  id: string;
  nombres: string;
  apellidos: string;
  empresa: string;
  correo: string;
  telefono: string;
  cargo: string;
  fuente: LeadFuente;
  estado: LeadEstado;
  prioridad: LeadPrioridad;
  responsable_id: string | null;
  notas: string;
  ultimo_contacto: string | null;
  proximo_seguimiento: string | null;
  convertido_cliente_id: string | null;
  created_at: string;
  updated_at: string;
};
export type NuevoLead = Omit<Lead, "id" | "created_at" | "updated_at" | "convertido_cliente_id">;
export type ActualizarLead = NuevoLead;
export type LeadResponsable = Pick<Profile, "id" | "nombres" | "apellidos" | "activo" | "rol">;
export type LeadConversion = {
  resultado: "creado" | "vinculado" | "ya_convertido" | "requiere_vinculo";
  cliente_id: string;
  cliente_nombre: string;
  cliente_correo: string;
};
export const leadName = (lead: Pick<Lead, "nombres" | "apellidos">) => `${lead.nombres} ${lead.apellidos}`.trim();
export const responsableName = (profile: LeadResponsable) => leadName(profile) || `Usuario ${profile.id.slice(0, 8)}`;
