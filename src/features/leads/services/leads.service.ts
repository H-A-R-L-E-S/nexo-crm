import { getSupabaseClient } from "@/lib/supabase/client";
import type { ActualizarLead, Lead, LeadConversion, LeadResponsable, NuevoLead } from "../types";
import { validateLead } from "../validation";

function fail(error: { code?: string; message: string }): never {
  if (["42501", "22023", "P0002"].includes(error.code ?? "")) throw new Error(error.code === "42501" ? "No tienes permiso para esta operación. Verifica tu sesión y rol." : error.message);
  if (error.code === "PGRST301" || error.code === "PGRST303") {
    window.location.replace("/login?motivo=sesion");
    throw new Error("Tu sesión terminó. Inicia sesión nuevamente.");
  }
  if (error.code === "23514") throw new Error("Los datos no son válidos. Usa la acción Convertir a cliente para registrar una conversión.");
  throw new Error("No se pudo completar la operación de leads. Revisa tu conexión y que la migración esté aplicada.");
}
export async function getLeads(): Promise<Lead[]> {
  const result: Lead[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await getSupabaseClient().from("leads").select("*").order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
    if (error) fail(error);
    result.push(...data);
    if (data.length < 500) return result;
  }
}
export async function getLeadById(id: string): Promise<Lead | null> {
  const { data, error } = await getSupabaseClient().from("leads").select("*").eq("id", id).maybeSingle();
  if (error) fail(error);
  return data;
}
export async function getLeadResponsibles(): Promise<LeadResponsable[]> {
  const { data, error } = await getSupabaseClient().rpc("lead_responsibles");
  if (error) fail(error);
  return data;
}
export async function createLead(input: NuevoLead): Promise<Lead> {
  const { data, error } = await getSupabaseClient().from("leads").insert(validateLead(input)).select("*").single();
  if (error) fail(error);
  return data;
}
export async function updateLead(id: string, input: ActualizarLead, updatedAt: string): Promise<Lead> {
  const { data, error } = await getSupabaseClient().from("leads").update(validateLead(input)).eq("id", id).eq("updated_at", updatedAt).select("*").maybeSingle();
  if (error) fail(error);
  if (!data) throw new Error("Este lead cambió o ya no está disponible. Actualiza la lista antes de editarlo.");
  return data;
}
export async function deleteLead(id: string): Promise<void> {
  const { data, error } = await getSupabaseClient().from("leads").delete().eq("id", id).select("id");
  if (error) fail(error);
  if (!data.length) throw new Error("No se eliminó el lead. Verifica tus permisos y actualiza la lista.");
}
export async function convertLead(id: string, apellidos: string, correo: string, existingId: string | null = null): Promise<LeadConversion> {
  const { data, error } = await getSupabaseClient().rpc("convert_lead", { p_lead_id: id, p_apellidos: apellidos.trim(), p_correo: correo.trim().toLowerCase(), p_existing_client_id: existingId }).single();
  if (error) fail(error);
  return data;
}
