"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { deleteLead } from "./services/leads.service";
import { leadName, type Lead } from "./types";

export function LeadDelete({ lead, onDeleted }: { lead: Lead; onDeleted: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    if (pending) return;
    setPending(true); setError("");
    try { await deleteLead(lead.id); onDeleted(lead.id); toast.success("Lead eliminado"); setOpen(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo eliminar el lead."); }
    finally { setPending(false); }
  }
  return <AlertDialog open={open} onOpenChange={(value) => { if (!pending) { setOpen(value); setError(""); } }}><AlertDialogTrigger asChild><Button variant="ghost" size="icon" aria-label={`Eliminar lead: ${leadName(lead)}`} title="Eliminar lead" className="text-slate-500 hover:text-red-600"><Trash2 className="size-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar lead</AlertDialogTitle><AlertDialogDescription>¿Eliminar a {leadName(lead)}? Se perderá su historial como lead. Esta acción no se puede deshacer. El cliente vinculado, si existe, se conserva.</AlertDialogDescription></AlertDialogHeader>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2"><Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancelar</Button><Button variant="destructive" disabled={pending} onClick={remove}>{pending ? "Eliminando..." : "Eliminar lead"}</Button></div></AlertDialogContent></AlertDialog>;
}
