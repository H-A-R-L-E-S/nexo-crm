import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatLeadDate } from "./dates";
import { LeadStateBadge, LeadPriorityBadge } from "./lead-badges";
import { leadName, responsableName, type Lead, type LeadResponsable } from "./types";

export function LeadDetail({ lead, owner }: { lead: Lead; owner?: LeadResponsable }) {
  const fields = { Correo: lead.correo, Teléfono: lead.telefono, Empresa: lead.empresa, Cargo: lead.cargo, Fuente: lead.fuente, Responsable: owner ? `${responsableName(owner)}${owner.activo ? "" : " (inactivo)"}` : "Sin asignar", "Último contacto": formatLeadDate(lead.ultimo_contacto), "Próximo seguimiento": formatLeadDate(lead.proximo_seguimiento), Creación: formatLeadDate(lead.created_at), Actualización: formatLeadDate(lead.updated_at) };
  return <Dialog><DialogTrigger asChild><Button variant="ghost" size="icon" aria-label={`Ver detalle: ${leadName(lead)}`} title="Ver detalle"><Eye className="size-4" /></Button></DialogTrigger><DialogContent className="max-h-[90dvh] overflow-y-auto p-6 sm:max-w-xl"><DialogHeader><DialogTitle>{leadName(lead)}</DialogTitle><DialogDescription>Información del lead · Fechas en hora de Lima</DialogDescription></DialogHeader><div className="flex gap-3"><LeadStateBadge state={lead.estado} /><LeadPriorityBadge priority={lead.prioridad} /></div><dl className="grid gap-4 sm:grid-cols-2">{Object.entries(fields).map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm">{value || "Sin registrar"}</dd></div>)}</dl><div><h3 className="text-xs text-slate-500">Notas</h3><p className="mt-1 whitespace-pre-wrap break-words text-sm">{lead.notas || "Sin notas"}</p></div>{lead.convertido_cliente_id && <div className="flex flex-wrap gap-2"><Button asChild><Link href={`/clientes?buscar=${encodeURIComponent(lead.convertido_cliente_id)}`}>Ver cliente vinculado</Link></Button><Button asChild variant="outline"><Link href={`/oportunidades?nueva=1&cliente=${encodeURIComponent(lead.convertido_cliente_id)}&lead=${encodeURIComponent(lead.id)}`}>Nueva oportunidad</Link></Button></div>}</DialogContent></Dialog>;
}
