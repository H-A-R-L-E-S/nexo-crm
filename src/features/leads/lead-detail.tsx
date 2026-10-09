"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import styles from "@/components/crm/directory.module.css";
import { formatLeadDate } from "./dates";
import { LeadStateBadge, LeadPriorityBadge } from "./lead-badges";
import { leadName, responsableName, type Lead, type LeadResponsable } from "./types";

type Props = {
  lead: Lead;
  owner?: LeadResponsable;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
};

export function LeadDetail({ lead, owner, children, open, onOpenChange, onCloseAutoFocus }: Props) {
  const sections = [
    { title: "Contacto", fields: { Correo: lead.correo, Teléfono: lead.telefono } },
    { title: "Información comercial", fields: { Empresa: lead.empresa, Cargo: lead.cargo, Fuente: lead.fuente, Responsable: owner ? `${responsableName(owner)}${owner.activo ? "" : " (inactivo)"}` : "Sin asignar" } },
    { title: "Seguimiento", fields: { "Último contacto": formatLeadDate(lead.ultimo_contacto), "Próximo seguimiento": formatLeadDate(lead.proximo_seguimiento), Creación: formatLeadDate(lead.created_at), Actualización: formatLeadDate(lead.updated_at) } },
  ];
  return <Dialog open={open} onOpenChange={onOpenChange}>
    {open === undefined && <DialogTrigger asChild>{children ?? <Button variant="ghost" size="icon" aria-label={`Ver detalle: ${leadName(lead)}`} title="Ver detalle"><Eye aria-hidden="true" /></Button>}</DialogTrigger>}
    <DialogContent className={styles.dialog} onCloseAutoFocus={onCloseAutoFocus}>
      <DialogHeader className={styles.dialogHeader}><DialogTitle>{leadName(lead)}</DialogTitle><DialogDescription>{lead.empresa || "Información del lead"}{lead.cargo ? ` · ${lead.cargo}` : ""}</DialogDescription></DialogHeader>
      <div className="flex flex-wrap items-center gap-3"><LeadStateBadge state={lead.estado} /><span className="text-xs text-muted-foreground">Prioridad <LeadPriorityBadge priority={lead.prioridad} /></span></div>
      {sections.map((section) => <section key={section.title} aria-label={section.title} className={styles.detailSection}>
        <h3 className={styles.detailHeading}>{section.title}</h3>
        <dl className={styles.detailGrid}>{Object.entries(section.fields).map(([label, value]) => <div key={label}><dt>{label}</dt><dd className={styles.detailValue}>{value || "Sin registrar"}</dd></div>)}</dl>
      </section>)}
      <section aria-label="Notas" className={styles.detailSection}><h3 className={styles.detailHeading}>Notas</h3><p className={`${styles.detailValue} whitespace-pre-wrap`}>{lead.notas || "Sin notas"}</p></section>
      {lead.convertido_cliente_id && <section aria-label="Cliente vinculado" className={styles.detailSection}>
        <h3 className={styles.detailHeading}>Cliente vinculado</h3><p className={styles.formHelp}>El lead conserva su historial después de la conversión.</p>
        <div className={styles.formActions}><Button asChild variant="outline"><Link href={`/clientes?buscar=${encodeURIComponent(lead.convertido_cliente_id)}`}>Ver cliente vinculado</Link></Button><Button asChild variant="outline"><Link href={`/oportunidades?nueva=1&cliente=${encodeURIComponent(lead.convertido_cliente_id)}&lead=${encodeURIComponent(lead.id)}`}>Nueva oportunidad</Link></Button></div>
      </section>}
      <p className={styles.formHelp}>Fechas en hora de Lima (UTC−5).</p>
    </DialogContent>
  </Dialog>;
}
