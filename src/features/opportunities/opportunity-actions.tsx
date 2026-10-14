"use client";
import { useState } from "react";
import Link from "next/link";
import { CreditCard, Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NewTaskLink } from "@/features/tasks/task-link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import directoryStyles from "@/components/crm/directory.module.css";
import styles from "./opportunities-dialog.module.css";
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
  return <div className={styles.actions}>
    <Dialog>
      <DialogTrigger asChild><Button variant="ghost" size="icon" aria-label={`Ver oportunidad: ${item.titulo}`} title="Ver detalle"><Eye className="size-4" aria-hidden="true" /></Button></DialogTrigger>
      <DialogContent className={`${directoryStyles.dialog} ${styles.dialog} ${styles.detailDialog}`}>
        <DialogHeader className={directoryStyles.dialogHeader}>
          <DialogTitle>{item.titulo}</DialogTitle>
          <DialogDescription>Detalle comercial · Fechas y horas en Lima</DialogDescription>
        </DialogHeader>
        <div className={styles.detailStage}><StageBadge stage={item.etapa} /></div>
        <dl className={styles.detailHero}>
          <div><dt>Valor estimado</dt><dd className={styles.detailAmount}>{fields.Valor}</dd></div>
          <div><dt>Probabilidad</dt><dd className={styles.detailProbability}>{fields.Probabilidad}</dd></div>
        </dl>
        <section className={directoryStyles.detailSection}>
          <h3 className={directoryStyles.detailHeading}>Información comercial</h3>
          <dl className={directoryStyles.detailGrid}>
            <div><dt>Responsable</dt><dd className={directoryStyles.detailValue}>{fields.Responsable}</dd></div>
            <div><dt>Origen</dt><dd className={directoryStyles.detailValue}>{fields.Origen}</dd></div>
          </dl>
        </section>
        <section className={directoryStyles.detailSection}>
          <h3 className={directoryStyles.detailHeading}>Relaciones</h3>
          <dl className={directoryStyles.detailGrid}>
            <div><dt>Cliente</dt><dd><Link className={styles.detailLink} href={`/clientes?buscar=${encodeURIComponent(item.cliente_id)}`}>{client?.name ?? "Ver cliente"}</Link></dd></div>
            <div><dt>Lead de origen</dt><dd className={directoryStyles.detailValue}>{fields["Lead de origen"]}</dd></div>
          </dl>
          {lead && <p className={styles.leadId}>ID del lead: {lead.id}</p>}
        </section>
        <section className={directoryStyles.detailSection}>
          <h3 className={directoryStyles.detailHeading}>Fechas</h3>
          <dl className={directoryStyles.detailGrid}>
            {(["Fecha estimada", "Cierre real", "Creación", "Actualización"] as const).map((label) => <div key={label}><dt>{label}</dt><dd className={directoryStyles.detailValue}>{fields[label]}</dd></div>)}
          </dl>
        </section>
        <section className={directoryStyles.detailSection}>
          <h3 className={directoryStyles.detailHeading}>Descripción</h3>
          <p className={styles.description}>{item.descripcion || "Sin descripción"}</p>
        </section>
      </DialogContent>
    </Dialog>
    <NewTaskLink type="Oportunidad" id={item.id} label={item.titulo} />
    {item.etapa === "Ganada" && <Button asChild variant="ghost" size="icon"><Link href={`/ventas?nueva=1&oportunidad=${encodeURIComponent(item.id)}`} aria-label={`Nueva venta: ${item.titulo}`} title="Nueva venta"><CreditCard className="size-4 text-blue-600" aria-hidden="true" /></Link></Button>}
    <OpportunityFormDialog item={item} directory={directory} onSaved={onSaved}><Button variant="ghost" size="icon" aria-label={`Editar oportunidad: ${item.titulo}`} title="Editar oportunidad"><Pencil className="size-4" aria-hidden="true" /></Button></OpportunityFormDialog>
    {canManageOpportunities(profile.rol) && <DeleteOpportunity item={item} onDeleted={onDeleted} />}
  </div>;
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
  return <AlertDialog open={open} onOpenChange={(value) => { if (!pending) { setOpen(value); setError(""); } }}>
    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" aria-label={`Eliminar oportunidad: ${item.titulo}`} title="Eliminar oportunidad" className={styles.deleteTrigger}><Trash2 className="size-4" aria-hidden="true" /></Button></AlertDialogTrigger>
    <AlertDialogContent className={`${directoryStyles.compactDialog} ${styles.dialog} ${styles.deleteDialog}`} aria-busy={pending}>
      <AlertDialogHeader className={`${directoryStyles.dialogHeader} ${styles.deleteHeader}`}>
        <AlertDialogTitle>Eliminar oportunidad</AlertDialogTitle>
        <AlertDialogDescription>¿Eliminar «{item.titulo}»? Esta acción no se puede deshacer. El cliente y el lead se conservan.</AlertDialogDescription>
      </AlertDialogHeader>
      {error && <p role="alert" className={directoryStyles.dangerNotice}>{error}</p>}
      <div className={`${directoryStyles.formActions} ${styles.formActions}`}>
        <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancelar</Button>
        <Button variant="destructive" disabled={pending} onClick={remove}>{pending ? "Eliminando..." : "Eliminar oportunidad"}</Button>
      </div>
    </AlertDialogContent>
  </AlertDialog>;
}
