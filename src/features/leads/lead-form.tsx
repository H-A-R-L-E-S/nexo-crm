"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import styles from "@/components/crm/directory.module.css";
import { useAuth } from "@/features/auth/auth-provider";
import { canManageLeads } from "./permissions";
import { fromLimaInput, toLimaInput } from "./dates";
import { createLead, updateLead } from "./services/leads.service";
import { LEAD_ESTADOS, LEAD_FUENTES, LEAD_PRIORIDADES, responsableName, type Lead, type LeadEstado, type LeadFuente, type LeadPrioridad, type LeadResponsable } from "./types";

type Props = { lead?: Lead; responsibles: LeadResponsable[]; onSaved: (lead: Lead) => void; children?: ReactNode; disabled?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void; onCloseAutoFocus?: (event: Event) => void };

export function LeadFormDialog({ lead, responsibles, onSaved, children, disabled, open: controlledOpen, onOpenChange, onCloseAutoFocus }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [pending, setPending] = useState(false);
  return <Dialog open={open} onOpenChange={(value) => { if (!pending) setOpen(value); }}>
    {controlledOpen === undefined && <DialogTrigger asChild>{children ?? <Button disabled={disabled} data-leads-create={lead ? undefined : ""}><Plus aria-hidden="true" />Nuevo lead</Button>}</DialogTrigger>}
    <DialogContent className={styles.dialog} showCloseButton={!pending} onCloseAutoFocus={onCloseAutoFocus}>
      <DialogHeader className={styles.dialogHeader}><DialogTitle>{lead ? "Editar lead" : "Nuevo lead"}</DialogTitle><DialogDescription>Los campos con * son obligatorios.</DialogDescription></DialogHeader>
      <LeadForm lead={lead} responsibles={responsibles} pending={pending} setPending={setPending} onSaved={(item) => { onSaved(item); setOpen(false); }} onCancel={() => setOpen(false)} />
    </DialogContent>
  </Dialog>;
}

function LeadForm({ lead, responsibles, onSaved, pending, setPending, onCancel }: Props & { pending: boolean; setPending: (value: boolean) => void; onCancel: () => void }) {
  const id = useId();
  const { profile } = useAuth();
  const manage = canManageLeads(profile.rol);
  const [error, setError] = useState("");
  const owner = lead ? lead.responsable_id ?? "" : manage ? "" : profile.id;
  const inactiveOwner = responsibles.find((person) => person.id === owner && !person.activo);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    const form = new FormData(event.currentTarget);
    const field = (name: string) => String(form.get(name) ?? "").trim();
    try {
      const input = {
        nombres: field("nombres"), apellidos: field("apellidos"), empresa: field("empresa"), correo: field("correo"), telefono: field("telefono"), cargo: field("cargo"),
        fuente: field("fuente") as LeadFuente, estado: (lead?.estado === "Convertido" ? "Convertido" : field("estado")) as LeadEstado, prioridad: field("prioridad") as LeadPrioridad,
        responsable_id: manage ? field("responsable_id") || null : owner || null,
        notas: field("notas"), ultimo_contacto: fromLimaInput(field("ultimo_contacto")), proximo_seguimiento: fromLimaInput(field("proximo_seguimiento")),
      };
      setPending(true);
      const saved = lead ? await updateLead(lead.id, input, lead.updated_at) : await createLead(input);
      toast.success(lead ? "Lead actualizado" : "Lead creado");
      onSaved(saved);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar el lead."); }
    finally { setPending(false); }
  }
  const fields = [
    { name: "nombres", label: "Nombres *", max: 80, required: true }, { name: "apellidos", label: "Apellidos", max: 100 },
    { name: "empresa", label: "Empresa", max: 100 }, { name: "correo", label: "Correo", max: 254, type: "email" },
    { name: "telefono", label: "Teléfono *", max: 30, type: "tel", required: true }, { name: "cargo", label: "Cargo", max: 100 },
  ] as const;
  function renderField(field: typeof fields[number]) {
    return <div key={field.name} className={styles.field}><Label htmlFor={`${id}-${field.name}`}>{field.label}</Label><Input id={`${id}-${field.name}`} name={field.name} defaultValue={lead?.[field.name] ?? ""} type={"type" in field ? field.type : "text"} maxLength={field.max} required={"required" in field && field.required} /></div>;
  }
  return <form onSubmit={submit} noValidate className={styles.form} aria-busy={pending} aria-describedby={error ? `${id}-error` : undefined}>
    <fieldset disabled={pending} className={styles.formSection}><legend>Contacto</legend><div className={styles.formGrid}>
      {fields.filter((field) => ["nombres", "apellidos", "correo", "telefono"].includes(field.name)).map(renderField)}
    </div></fieldset>
    <fieldset disabled={pending} className={styles.formSection}><legend>Información comercial</legend><div className={styles.formGrid}>
      {fields.filter((field) => ["empresa", "cargo"].includes(field.name)).map(renderField)}
      <div className={styles.field}><Label htmlFor={`${id}-fuente`}>Fuente *</Label><select id={`${id}-fuente`} name="fuente" defaultValue={lead?.fuente ?? "Web"} className={styles.select}>{LEAD_FUENTES.map((value) => <option key={value}>{value}</option>)}</select></div>
      <div className={styles.field}><Label htmlFor={`${id}-estado`}>Estado *</Label><select id={`${id}-estado`} name="estado" defaultValue={lead?.estado ?? "Nuevo"} disabled={lead?.estado === "Convertido"} className={styles.select}>{LEAD_ESTADOS.filter((state) => state !== "Convertido" || lead?.estado === "Convertido").map((value) => <option key={value}>{value}</option>)}</select></div>
      <div className={styles.field}><Label htmlFor={`${id}-prioridad`}>Prioridad *</Label><select id={`${id}-prioridad`} name="prioridad" defaultValue={lead?.prioridad ?? "Media"} className={styles.select}>{LEAD_PRIORIDADES.map((value) => <option key={value}>{value}</option>)}</select></div>
      <div className={styles.field}><Label htmlFor={`${id}-responsable`}>Responsable</Label><select id={`${id}-responsable`} name="responsable_id" defaultValue={owner} disabled={!manage} aria-describedby={!manage ? `${id}-assignment` : undefined} className={styles.select}><option value="">Sin asignar</option>{inactiveOwner && <option value={inactiveOwner.id}>{responsableName(inactiveOwner)} (inactivo)</option>}{responsibles.filter((person) => person.activo).map((person) => <option key={person.id} value={person.id}>{responsableName(person)}</option>)}</select></div>
    </div>{!manage && <p id={`${id}-assignment`} className={styles.formHelp}>Los leads nuevos se asignan a tu cuenta. Administrador y Gerente pueden reasignarlos.</p>}</fieldset>
    <fieldset disabled={pending} className={styles.formSection}><legend>Seguimiento</legend><div className={styles.formGrid}>
      <div className={styles.field}><Label htmlFor={`${id}-ultimo`}>Último contacto</Label><Input id={`${id}-ultimo`} name="ultimo_contacto" type="datetime-local" defaultValue={toLimaInput(lead?.ultimo_contacto ?? null)} aria-describedby={`${id}-timezone`} /></div>
      <div className={styles.field}><Label htmlFor={`${id}-proximo`}>Próximo seguimiento</Label><Input id={`${id}-proximo`} name="proximo_seguimiento" type="datetime-local" defaultValue={toLimaInput(lead?.proximo_seguimiento ?? null)} aria-describedby={`${id}-timezone`} /></div>
      <div className={`${styles.field} ${styles.fieldWide}`}><Label htmlFor={`${id}-notas`}>Notas</Label><Textarea id={`${id}-notas`} name="notas" defaultValue={lead?.notas ?? ""} maxLength={1500} rows={3} /></div>
    </div><p id={`${id}-timezone`} className={styles.formHelp}>Fechas en hora de Lima (UTC−5).</p></fieldset>
    {lead?.estado === "Convertido" && <p className={styles.notice}>Este lead ya está convertido. Los cambios aquí no modifican los datos del cliente vinculado.</p>}
    {error && <p id={`${id}-error`} role="alert" className={styles.formError}>{error}</p>}
    <div className={styles.formActions}><Button type="button" variant="outline" disabled={pending} onClick={onCancel}>Cancelar</Button><Button disabled={pending} type="submit">{pending && <Loader2 aria-hidden="true" className="animate-spin" />}{pending ? lead ? "Guardando cambios..." : "Creando..." : lead ? "Guardar cambios" : "Crear lead"}</Button></div>
  </form>;
}
