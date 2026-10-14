"use client";
import { useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { updateOpportunity } from "./services/opportunities.service";
import { OPPORTUNITY_STAGES, opportunityInput, STAGE_PROBABILITY, type Opportunity, type OpportunityStage } from "./types";
import styles from "./opportunities.module.css";
export function StageBadge({ stage }: { stage: OpportunityStage }) { return <Badge variant="outline" data-stage={stage} className={styles.stageBadge}>{stage}</Badge>; }
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
      Array.from(document.querySelectorAll<HTMLSelectElement>(`[data-opportunity-stage="${item.id}"]`)).find((select) => select.getClientRects().length > 0)?.focus();
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cambiar la etapa."); }
    finally { setPending(false); }
  }
  return <div className={styles.stageControl}><select data-opportunity-stage={item.id} aria-label={`Cambiar etapa: ${item.titulo}`} aria-busy={pending} disabled={pending} value={item.etapa} onChange={(event) => void change(event.target.value as OpportunityStage)}>{OPPORTUNITY_STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select>{pending && <p role="status">Guardando etapa...</p>}{error && <p role="alert">{error}</p>}</div>;
}
