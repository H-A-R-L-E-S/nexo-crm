"use client";
import { useState } from "react";
import Link from "next/link";
import { CreditCard, Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/features/auth/auth-provider";
import { canManageOpportunities } from "./permissions";
import { leadName, responsableName } from "@/features/leads/types";
import { formatLeadDate } from "@/features/leads/dates";
import { formatMoney } from "./money";
import type { Opportunity } from "./types";
import type { OpportunityDirectory } from "./use-opportunities";
import { StageBadge } from "./opportunity-stage";
import { OpportunityFormDialog } from "./opportunity-form";
import { deleteOpportunity } from "./services/opportunities.service";

export const estimatedDate = (value: string | null) => value ? new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)) : "Sin fecha";
export function OpportunityActions({ item, directory, onSaved, onDeleted }: { item: Opportunity; directory: OpportunityDirectory; onSaved: (item: Opportunity) => void; onDeleted: (id: string) => void }) {
  const { profile } = useAuth();
  const client = directory.clients.find((value) => value.id === item.cliente_id);
  const lead = directory.leads.find((value) => value.id === item.lead_id);
  const owner = directory.responsibles.find((value) => value.id === item.responsable_id);
  const fields = { Valor: formatMoney(item.valor), Probabilidad: `${item.probabilidad}%`, Responsable: owner ? `${responsableName(owner)}${owner.activo ? "" : " (inactivo)"}` : "Sin asignar", "Fecha estimada": estimatedDate(item.fecha_cierre_estimada), Origen: item.origen || "Sin registrar", "Lead de origen": lead ? leadName(lead) : "Sin lead relacionado", Creación: formatLeadDate(item.created_at), Actualización: formatLeadDate(item.updated_at), "Cierre real": formatLeadDate(item.cerrada_at) };
  return <div className="flex shrink-0"><Dialog><DialogTrigger asChild><Button variant="ghost" size="icon" aria-label={`Ver oportunidad: ${item.titulo}`} title="Ver detalle"><Eye className="size-4" /></Button></DialogTrigger><DialogContent className="max-h-[90dvh] overflow-y-auto p-6 sm:max-w-xl"><DialogHeader><DialogTitle className="break-words">{item.titulo}</DialogTitle><DialogDescription>Detalle comercial · Fechas y horas en Lima</DialogDescription></DialogHeader><StageBadge stage={item.etapa} /><Link className="text-sm font-medium text-blue-700 underline" href={`/clientes?buscar=${encodeURIComponent(item.cliente_id)}`}>{client?.name ?? "Ver cliente"}</Link><dl className="grid gap-4 sm:grid-cols-2">{Object.entries(fields).map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm">{value}</dd></div>)}</dl><div><h3 className="text-xs text-slate-500">Descripción</h3><p className="mt-1 whitespace-pre-wrap break-words text-sm">{item.descripcion || "Sin descripción"}</p></div>{lead && <p className="break-all text-xs text-slate-400">ID del lead: {lead.id}</p>}</DialogContent></Dialog>
    {item.etapa === "Ganada" && <Button asChild variant="ghost" size="icon"><Link href={`/ventas?nueva=1&oportunidad=${encodeURIComponent(item.id)}`} aria-label={`Nueva venta: ${item.titulo}`} title="Nueva venta"><CreditCard className="size-4 text-blue-600" /></Link></Button>}<OpportunityFormDialog item={item} directory={directory} onSaved={onSaved}><Button variant="ghost" size="icon" aria-label={`Editar oportunidad: ${item.titulo}`} title="Editar oportunidad"><Pencil className="size-4" /></Button></OpportunityFormDialog>{canManageOpportunities(profile.rol) && <DeleteOpportunity item={item} onDeleted={onDeleted} />}</div>;
}
function DeleteOpportunity({ item, onDeleted }: { item: Opportunity; onDeleted: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    if (pending) return;
    setPending(true); setError("");
    try { await deleteOpportunity(item.id); onDeleted(item.id); setOpen(false); toast.success("Oportunidad eliminada"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo eliminar."); }
    finally { setPending(false); }
  }
  return <AlertDialog open={open} onOpenChange={(value) => { if (!pending) { setOpen(value); setError(""); } }}><AlertDialogTrigger asChild><Button variant="ghost" size="icon" aria-label={`Eliminar oportunidad: ${item.titulo}`} title="Eliminar oportunidad" className="text-slate-500 hover:text-red-600"><Trash2 className="size-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar oportunidad</AlertDialogTitle><AlertDialogDescription>¿Eliminar «{item.titulo}»? Esta acción no se puede deshacer. El cliente y el lead se conservan.</AlertDialogDescription></AlertDialogHeader>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2"><Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancelar</Button><Button variant="destructive" disabled={pending} onClick={remove}>{pending ? "Eliminando..." : "Eliminar oportunidad"}</Button></div></AlertDialogContent></AlertDialog>;
}
