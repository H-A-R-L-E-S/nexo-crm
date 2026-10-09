"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import styles from "@/components/crm/directory.module.css";
import { deleteLead } from "./services/leads.service";
import { leadName, type Lead } from "./types";

type Props = {
  lead: Lead;
  onDeleted: (id: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
};

export function LeadDelete({ lead, onDeleted, open: controlledOpen, onOpenChange, onCloseAutoFocus }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    if (pending) return;
    setPending(true); setError("");
    try { await deleteLead(lead.id); onDeleted(lead.id); toast.success("Lead eliminado"); setOpen(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo eliminar el lead."); }
    finally { setPending(false); }
  }
  return <AlertDialog open={open} onOpenChange={(value) => { if (!pending) { setOpen(value); setError(""); } }}>
    {controlledOpen === undefined && <AlertDialogTrigger asChild><Button variant="ghost" size="icon" aria-label={`Eliminar lead: ${leadName(lead)}`} title="Eliminar lead" className="text-muted-foreground hover:text-[var(--danger)]"><Trash2 aria-hidden="true" /></Button></AlertDialogTrigger>}
    <AlertDialogContent className={styles.compactDialog} onCloseAutoFocus={onCloseAutoFocus} aria-busy={pending}>
      <AlertDialogHeader className={styles.dialogHeader}><AlertDialogTitle>Eliminar lead</AlertDialogTitle><AlertDialogDescription>¿Eliminar a {leadName(lead)}? Se perderá su historial como lead. Esta acción no se puede deshacer. El cliente vinculado, si existe, se conserva.</AlertDialogDescription></AlertDialogHeader>
      {error && <p role="alert" className={styles.formError}>{error}</p>}
      <div className={styles.formActions}><AlertDialogCancel disabled={pending} onClick={() => setOpen(false)}>Cancelar</AlertDialogCancel><Button variant="destructive" disabled={pending} onClick={remove}>{pending ? "Eliminando..." : "Eliminar lead"}</Button></div>
    </AlertDialogContent>
  </AlertDialog>;
}
