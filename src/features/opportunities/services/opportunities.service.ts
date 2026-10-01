import { getSupabaseClient } from "@/lib/supabase/client";
import { validateOpportunity } from "../validation";
import type { CreateOpportunity, Opportunity, UpdateOpportunity, OpportunityResponsible } from "../types";

// Alias del decimal generado en PostgreSQL: el contrato entrega dinero como texto exacto.
const selection = "id,titulo,cliente_id,lead_id,responsable_id,etapa,valor:valor_decimal,probabilidad,fecha_cierre_estimada,descripcion,origen,cerrada_at,created_at,updated_at";
function fail(error: { code?: string; message: string }): never {
  if (error.code === "42501") throw new Error("No tienes permiso para esta operación. Comprueba tu sesión y rol.");
  if (error.code === "22023") throw new Error(error.message);
  if (error.code === "23503") throw new Error("Revisa las relaciones comerciales de la oportunidad. El cliente, lead o responsable puede no estar disponible, o existen ventas asociadas que deben conservarse.");
  if (error.code === "23514" || error.code === "22003") throw new Error("Revisa el importe, la probabilidad y los campos obligatorios.");
  if (error.code === "PGRST301" || error.code === "PGRST303") {
    window.location.replace("/login?motivo=sesion");
    throw new Error("Tu sesión terminó. Inicia sesión nuevamente.");
  }
  throw new Error("No se pudo completar la operación de oportunidades. Revisa la conexión y que opportunities.sql esté aplicado.");
}
export async function getOpportunities(): Promise<Opportunity[]> {
  const rows: Opportunity[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await getSupabaseClient().from("oportunidades").select(selection).order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
    if (error) fail(error);
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
export async function getOpportunityById(id: string): Promise<Opportunity | null> {
  const { data, error } = await getSupabaseClient().from("oportunidades").select(selection).eq("id", id).maybeSingle();
  if (error) fail(error);
  return data;
}
export async function getOpportunityResponsibles(): Promise<OpportunityResponsible[]> {
  const { data, error } = await getSupabaseClient().rpc("opportunity_responsibles");
  if (error) fail(error);
  return data;
}
export async function createOpportunity(input: CreateOpportunity): Promise<Opportunity> {
  const { data, error } = await getSupabaseClient().from("oportunidades").insert(validateOpportunity(input)).select(selection).single();
  if (error) fail(error);
  return data;
}
export async function updateOpportunity(id: string, input: UpdateOpportunity, updatedAt: string): Promise<Opportunity> {
  const { data, error } = await getSupabaseClient().from("oportunidades").update(validateOpportunity(input)).eq("id", id).eq("updated_at", updatedAt).select(selection).maybeSingle();
  if (error) fail(error);
  if (!data) throw new Error("La oportunidad cambió o ya no está disponible. Actualiza antes de editarla.");
  return data;
}
export async function deleteOpportunity(id: string): Promise<void> {
  const { data, error } = await getSupabaseClient().from("oportunidades").delete().eq("id", id).select("id");
  if (error) fail(error);
  if (!data.length) throw new Error("No se eliminó la oportunidad. Actualiza la lista y comprueba tus permisos.");
}
