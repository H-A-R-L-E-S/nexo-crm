"use client";
import { useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { updateOpportunity } from "./services/opportunities.service";
import { OPPORTUNITY_STAGES, opportunityInput, STAGE_PROBABILITY, type Opportunity, type OpportunityStage } from "./types";
export const stageColors: Record<OpportunityStage, string> = { Nueva: "border-blue-100 bg-blue-50 text-blue-700", Contacto: "border-violet-100 bg-violet-50 text-violet-700", Propuesta: "border-cyan-100 bg-cyan-50 text-cyan-700", Negociación: "border-amber-100 bg-amber-50 text-amber-700", Ganada: "border-emerald-100 bg-emerald-50 text-emerald-700", Perdida: "border-slate-200 bg-slate-100 text-slate-500" };
export function StageBadge({ stage }: { stage: OpportunityStage }) { return <Badge variant="outline" className={stageColors[stage]}>{stage}</Badge>; }
export function StageControl({ item, onSaved }: { item: Opportunity; onSaved: (item: Opportunity) => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function change(stage: OpportunityStage) {
    if (pending || stage === item.etapa) return;
    setPending(true); setError("");
    try {
      const saved = await updateOpportunity(item.id, { ...opportunityInput(item), etapa: stage, probabilidad: STAGE_PROBABILITY[stage] }, item.updated_at);
      // El selector debe estar montado y habilitado antes de restaurar su foco.
      flushSync(() => { setPending(false); onSaved(saved); });
      toast.success(`Oportunidad en ${stage}`);
      // La tarjeta cambia de columna y se monta de nuevo; conserva el foco del teclado.
      document.querySelector<HTMLSelectElement>(`[data-opportunity-stage="${item.id}"]`)?.focus();
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cambiar la etapa."); }
    finally { setPending(false); }
  }
  return <div className="min-w-32"><select data-opportunity-stage={item.id} aria-label={`Cambiar etapa: ${item.titulo}`} disabled={pending} value={item.etapa} onChange={(event) => void change(event.target.value as OpportunityStage)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs focus-visible:outline-blue-600 disabled:opacity-60">{OPPORTUNITY_STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select>{pending && <p role="status" className="mt-1 text-xs text-slate-500">Guardando etapa...</p>}{error && <p role="alert" className="mt-1 max-w-64 whitespace-normal text-xs text-red-700">{error}</p>}</div>;
}
