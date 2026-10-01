import type { Profile } from "@/features/auth/types";

export const OPPORTUNITY_STAGES = ["Nueva", "Contacto", "Propuesta", "Negociación", "Ganada", "Perdida"] as const;
export type OpportunityStage = typeof OPPORTUNITY_STAGES[number];
export const STAGE_PROBABILITY: Record<OpportunityStage, number> = { Nueva: 10, Contacto: 25, Propuesta: 50, Negociación: 75, Ganada: 100, Perdida: 0 };
export type Opportunity = {
  id: string; titulo: string; cliente_id: string; lead_id: string | null;
  responsable_id: string | null; etapa: OpportunityStage;
  /** Decimal exacto en soles; nunca hacer aritmética con parseFloat. */
  valor: string; probabilidad: number; fecha_cierre_estimada: string | null;
  descripcion: string; origen: string; cerrada_at: string | null;
  created_at: string; updated_at: string;
};
export type CreateOpportunity = Omit<Opportunity, "id" | "created_at" | "updated_at" | "cerrada_at">;
export type UpdateOpportunity = CreateOpportunity;
export type OpportunityRow = Omit<Opportunity, "valor"> & { valor: string | number; valor_decimal: string };
export type OpportunityResponsible = Pick<Profile, "id" | "nombres" | "apellidos" | "rol" | "activo">;
export const isClosed = (stage: OpportunityStage) => stage === "Ganada" || stage === "Perdida";
export function opportunityInput(item: Opportunity): CreateOpportunity {
  return { titulo: item.titulo, cliente_id: item.cliente_id, lead_id: item.lead_id, responsable_id: item.responsable_id, etapa: item.etapa, valor: item.valor, probabilidad: item.probabilidad, fecha_cierre_estimada: item.fecha_cierre_estimada, descripcion: item.descripcion, origen: item.origen };
}
