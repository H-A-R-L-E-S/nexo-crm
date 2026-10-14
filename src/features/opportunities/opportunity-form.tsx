"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import directoryStyles from "@/components/crm/directory.module.css";
import styles from "./opportunities-dialog.module.css";
import { useAuth } from "@/features/auth/auth-provider";
import { canManageOpportunities } from "./permissions";
import { leadName, responsableName } from "@/features/leads/types";
import { createOpportunity, updateOpportunity } from "./services/opportunities.service";
import { isClosed, OPPORTUNITY_STAGES, STAGE_PROBABILITY, type Opportunity, type OpportunityStage } from "./types";
import type { OpportunityDirectory } from "./use-opportunities";

export const selectStyle = directoryStyles.select;
type Props = { item?: Opportunity; directory: OpportunityDirectory; onSaved: (item: Opportunity) => void; initialClientId?: string; initialLeadId?: string; defaultOpen?: boolean; children?: ReactNode; disabled?: boolean };
export function OpportunityFormDialog(props: Props) {
  const [open, setOpen] = useState(props.defaultOpen ?? false);
  const [pending, setPending] = useState(false);
  return <Dialog open={open} onOpenChange={(value) => { if (!pending) setOpen(value); }}>
    <DialogTrigger asChild>{props.children ?? <Button disabled={props.disabled} className={styles.createButton}><Plus aria-hidden="true" />Nueva oportunidad</Button>}</DialogTrigger>
    <DialogContent className={`${directoryStyles.dialog} ${styles.dialog}`} showCloseButton={!pending}>
      <DialogHeader className={directoryStyles.dialogHeader}>
        <DialogTitle>{props.item ? "Editar oportunidad" : "Nueva oportunidad"}</DialogTitle>
        <DialogDescription>Asocia una propuesta a un cliente. Los campos con * son obligatorios.</DialogDescription>
      </DialogHeader>
      <OpportunityForm {...props} pending={pending} setPending={setPending} onCancel={() => setOpen(false)} onSaved={(item) => { props.onSaved(item); setOpen(false); }} />
    </DialogContent>
  </Dialog>;
}
function OpportunityForm({ item, directory, initialClientId, initialLeadId, onSaved, pending, setPending, onCancel }: Props & { pending: boolean; setPending: (value: boolean) => void; onCancel: () => void }) {
  const id = useId();
  const { profile } = useAuth();
  const manage = canManageOpportunities(profile.rol);
  const initialLead = directory.leads.find((lead) => lead.id === initialLeadId && lead.estado === "Convertido");
  const preselectedClient = initialLead?.convertido_cliente_id ?? initialClientId;
  const [clientId, setClientId] = useState(item?.cliente_id ?? (directory.clients.some((client) => client.id === preselectedClient) ? preselectedClient! : ""));
  const [leadId, setLeadId] = useState(item?.lead_id ?? initialLead?.id ?? "");
  const [stage, setStage] = useState<OpportunityStage>(item?.etapa ?? "Nueva");
  const [probability, setProbability] = useState(String(item?.probabilidad ?? 10));
  const [error, setError] = useState("");
  const owner = item ? item.responsable_id ?? "" : profile.id;
  const inactive = directory.responsibles.find((person) => person.id === owner && !person.activo);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return; setError("");
    const form = new FormData(event.currentTarget);
    const field = (name: string) => String(form.get(name) ?? "").trim();
    try {
      const responsible = manage ? field("responsable_id") : owner;
      if (!responsible && !item) throw new Error("Selecciona un responsable activo.");
      if (!probability.trim()) throw new Error("Ingresa una probabilidad entre 0 y 100.");
      const input = { titulo: field("titulo"), cliente_id: clientId, lead_id: leadId || null, responsable_id: responsible || null, etapa: stage, valor: field("valor"), probabilidad: Number(probability), fecha_cierre_estimada: field("fecha_cierre_estimada") || null, descripcion: field("descripcion"), origen: field("origen") };
      setPending(true);
      const saved = item ? await updateOpportunity(item.id, input, item.updated_at) : await createOpportunity(input);
      onSaved(saved); toast.success(item ? "Oportunidad actualizada" : "Oportunidad creada");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar la oportunidad."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} noValidate className={`${directoryStyles.form} ${styles.form}`} aria-busy={pending} aria-describedby={error ? `${id}-error` : undefined}>
    <fieldset disabled={pending} className={directoryStyles.formSection}>
      <legend>Oportunidad y cliente</legend>
      <div className={directoryStyles.formGrid}>
        <div className={directoryStyles.fieldWide}><Label htmlFor={`${id}-title`}>Título *</Label><Input id={`${id}-title`} name="titulo" defaultValue={item?.titulo ?? ""} maxLength={160} required /></div>
        <div className={directoryStyles.field}>
          <Label htmlFor={`${id}-client`}>Cliente *</Label>
          <select id={`${id}-client`} className={selectStyle} value={clientId} onChange={(event) => { setClientId(event.target.value); setLeadId(""); }} required><option value="">Selecciona un cliente</option>{directory.clients.map((client) => <option key={client.id} value={client.id}>{client.name}{client.company ? ` · ${client.company}` : ""}</option>)}</select>
          {!directory.clients.length && <p className={directoryStyles.formHelp}>Primero registra un cliente en Clientes.</p>}
        </div>
        <div className={directoryStyles.field}>
          <Label htmlFor={`${id}-lead`}>Lead relacionado</Label>
          <select id={`${id}-lead`} value={leadId} onChange={(event) => setLeadId(event.target.value)} className={selectStyle} aria-describedby={`${id}-lead-help`}><option value="">Sin lead relacionado</option>{directory.leads.filter((lead) => lead.estado === "Convertido" && lead.convertido_cliente_id === clientId).map((lead) => <option key={lead.id} value={lead.id}>{leadName(lead)}</option>)}</select>
          <p id={`${id}-lead-help`} className={directoryStyles.formHelp}>Leads convertidos al cliente seleccionado.</p>
        </div>
      </div>
    </fieldset>
    <fieldset disabled={pending} className={directoryStyles.formSection}>
      <legend>Información comercial</legend>
      <div className={directoryStyles.formGrid}>
        <div className={directoryStyles.field}>
          <Label htmlFor={`${id}-value`}>Valor estimado (S/) *</Label>
          <Input id={`${id}-value`} name="valor" inputMode="decimal" placeholder="0.00" defaultValue={item?.valor ?? ""} required aria-describedby={`${id}-value-help`} />
          <p id={`${id}-value-help`} className={directoryStyles.formHelp}>Hasta dos decimales, sin separadores de miles.</p>
        </div>
        <div className={directoryStyles.field}>
          <Label htmlFor={`${id}-stage`}>Etapa *</Label>
          <select id={`${id}-stage`} className={selectStyle} value={stage} onChange={(event) => { const next = event.target.value as OpportunityStage; setStage(next); setProbability(String(STAGE_PROBABILITY[next])); }}>{OPPORTUNITY_STAGES.map((value) => <option key={value}>{value}</option>)}</select>
        </div>
        <div className={directoryStyles.field}>
          <Label htmlFor={`${id}-probability`}>Probabilidad (%) *</Label>
          <Input id={`${id}-probability`} type="number" min={0} max={100} step={1} value={probability} onChange={(event) => setProbability(event.target.value)} disabled={isClosed(stage)} required aria-describedby={`${id}-probability-help`} />
          <p id={`${id}-probability-help`} className={directoryStyles.formHelp}>Sugerida al cambiar etapa; editable mientras esté abierta.</p>
        </div>
        <div className={directoryStyles.field}>
          <Label htmlFor={`${id}-owner`}>Responsable *</Label>
          <select id={`${id}-owner`} name="responsable_id" defaultValue={owner} disabled={!manage} className={selectStyle} required><option value="">Selecciona un responsable</option>{inactive && <option value={inactive.id}>{responsableName(inactive)} (inactivo)</option>}{directory.responsibles.filter((person) => person.activo).map((person) => <option key={person.id} value={person.id}>{responsableName(person)}</option>)}</select>
        </div>
      </div>
    </fieldset>
    <fieldset disabled={pending} className={directoryStyles.formSection}>
      <legend>Cierre y contexto</legend>
      <div className={directoryStyles.formGrid}>
        <div className={directoryStyles.field}><Label htmlFor={`${id}-date`}>Fecha de cierre estimada</Label><Input id={`${id}-date`} name="fecha_cierre_estimada" type="date" defaultValue={item?.fecha_cierre_estimada ?? ""} /></div>
        <div className={directoryStyles.field}><Label htmlFor={`${id}-origin`}>Origen</Label><Input id={`${id}-origin`} name="origen" defaultValue={item?.origen ?? (initialLead ? initialLead.fuente : "")} maxLength={100} /></div>
        <div className={directoryStyles.fieldWide}><Label htmlFor={`${id}-description`}>Descripción</Label><Textarea id={`${id}-description`} name="descripcion" defaultValue={item?.descripcion ?? ""} maxLength={3000} rows={3} /></div>
      </div>
    </fieldset>
    {!manage && <p className={directoryStyles.formHelp}>Las oportunidades nuevas se asignan a ti. Administrador y Gerente pueden reasignarlas.</p>}
    {error && <p id={`${id}-error`} role="alert" className={directoryStyles.dangerNotice}>{error}</p>}
    <div className={`${directoryStyles.formActions} ${styles.formActions}`}>
      <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>Cancelar</Button>
      <Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}{pending ? item ? "Guardando cambios..." : "Creando..." : item ? "Guardar cambios" : "Crear oportunidad"}</Button>
    </div>
  </form>;
}
