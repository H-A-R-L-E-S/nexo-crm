"use client";

import { useState, type FormEvent } from "react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import styles from "@/components/crm/directory.module.css";
import { useClients } from "@/features/clients/clients-provider";
import { convertLead, getLeadById } from "./services/leads.service";
import { leadName, type Lead, type LeadConversion } from "./types";

type Props = {
  lead: Lead;
  onSaved: (lead: Lead) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
};

export function LeadConvertDialog({ lead, onSaved, open: controlledOpen, onOpenChange, onCloseAutoFocus }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [pending, setPending] = useState(false);
  if (lead.estado === "Convertido") return null;
  return <Dialog open={open} onOpenChange={(value) => { if (!pending) setOpen(value); }}>
    {controlledOpen === undefined && <DialogTrigger asChild><Button variant="ghost" size="icon" aria-label={`Convertir a cliente: ${leadName(lead)}`} title="Convertir a cliente" className="text-[var(--link)]"><ArrowRightLeft aria-hidden="true" /></Button></DialogTrigger>}
    <DialogContent className={styles.compactDialog} showCloseButton={!pending} onCloseAutoFocus={onCloseAutoFocus}>
      <DialogHeader className={styles.dialogHeader}><DialogTitle>Convertir a cliente</DialogTitle><DialogDescription>{leadName(lead)} conservará su historial como lead y quedará vinculado a su cliente.</DialogDescription></DialogHeader>
      <ConversionForm lead={lead} pending={pending} setPending={setPending} onCancel={() => setOpen(false)} onSaved={(saved) => { onSaved(saved); setOpen(false); }} />
    </DialogContent>
  </Dialog>;
}

function ConversionForm({ lead, pending, setPending, onCancel, onSaved }: { lead: Lead; pending: boolean; setPending: (value: boolean) => void; onCancel: () => void; onSaved: (lead: Lead) => void }) {
  const { reload } = useClients();
  const [surname, setSurname] = useState(lead.apellidos);
  const [email, setEmail] = useState(lead.correo);
  const [candidate, setCandidate] = useState<LeadConversion | null>(null);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    if (!surname.trim() || surname.trim().length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Completa los apellidos y un correo válido para registrar el cliente."); return;
    }
    setPending(true);
    try {
      const result = await convertLead(lead.id, surname, email, candidate?.cliente_id ?? null);
      if (result.resultado === "requiere_vinculo") { setCandidate(result); return; }
      const saved = await getLeadById(lead.id);
      if (!saved) throw new Error("La conversión se completó. Actualiza la lista para comprobar el lead.");
      toast.success(result.resultado === "creado" ? "Lead convertido a cliente" : "Lead vinculado al cliente", { description: result.cliente_nombre });
      await reload();
      onSaved(saved);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo convertir el lead."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} noValidate className={styles.form} aria-busy={pending} aria-describedby={error ? `convert-error-${lead.id}` : undefined}>
    <p id={`convert-help-${lead.id}`} className={styles.formHelp}>Clientes requiere apellidos y correo. Si falta alguno, complétalo aquí. Se guardará junto con la conversión.</p>
    <fieldset disabled={pending} className={styles.formSection}><legend>Datos del cliente</legend><div className={styles.formGrid}>
      <div className={`${styles.field} ${styles.fieldWide}`}><Label htmlFor={`convert-surname-${lead.id}`}>Apellidos</Label><Input id={`convert-surname-${lead.id}`} value={surname} onChange={(event) => { setSurname(event.target.value); setCandidate(null); }} maxLength={100} aria-required="true" aria-describedby={`convert-help-${lead.id}${error ? ` convert-error-${lead.id}` : ""}`} /></div>
      <div className={`${styles.field} ${styles.fieldWide}`}><Label htmlFor={`convert-email-${lead.id}`}>Correo del cliente</Label><Input id={`convert-email-${lead.id}`} type="email" value={email} onChange={(event) => { setEmail(event.target.value); setCandidate(null); }} maxLength={254} aria-required="true" aria-describedby={`convert-help-${lead.id}${error ? ` convert-error-${lead.id}` : ""}`} /></div>
    </div></fieldset>
    {candidate && <div role="status" className={styles.notice}><p className="font-semibold">Ya existe un cliente con este correo</p><p className="mt-2">{candidate.cliente_nombre}</p><p className="mt-1 text-xs">{candidate.cliente_correo}</p><p className="mt-3 text-xs leading-relaxed">Puedes vincular este lead al cliente existente. No se sobrescribirán sus datos ni se creará un duplicado.</p></div>}
    {error && <p id={`convert-error-${lead.id}`} role="alert" className={styles.formError}>{error}</p>}
    <div className={styles.formActions}><Button type="button" variant="outline" disabled={pending} onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={pending}>{pending && <Loader2 aria-hidden="true" className="animate-spin" />}{pending ? "Convirtiendo..." : candidate ? "Vincular al cliente existente" : "Convertir a cliente"}</Button></div>
  </form>;
}
