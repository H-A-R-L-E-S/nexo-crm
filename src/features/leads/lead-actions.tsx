"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, Eye, ListTodo, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import styles from "@/components/crm/directory.module.css";
import { LeadConvertDialog } from "./lead-convert";
import { LeadDelete } from "./lead-delete";
import { LeadDetail } from "./lead-detail";
import { LeadFormDialog } from "./lead-form";
import { leadName, type Lead, type LeadResponsable } from "./types";

type Action = "detail" | "edit" | "convert" | "delete";

export function LeadActions({ lead, owner, responsibles, onSaved, onDeleted, canDelete }: { lead: Lead; owner?: LeadResponsable; responsibles: LeadResponsable[]; onSaved: (lead: Lead) => void; onDeleted: (id: string) => void; canDelete: boolean }) {
  const [action, setAction] = useState<Action | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const name = leadName(lead);
  const restoreDialogFocus = useCallback((event: Event) => {
    event.preventDefault();
    const target = trigger.current?.isConnected ? trigger.current : document.querySelector<HTMLButtonElement>("[data-leads-create]");
    target?.focus();
  }, []);
  return <>
    <DropdownMenu><DropdownMenuTrigger asChild><Button ref={trigger} variant="ghost" size="icon" className={styles.menuTrigger} aria-label={`Acciones de ${name}`} title={`Acciones de ${name}`}><MoreHorizontal aria-hidden="true" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={styles.menu} onCloseAutoFocus={(event) => { if (action) event.preventDefault(); }}>
        <DropdownMenuItem className={styles.menuItem} aria-label={`Ver detalle: ${name}`} onSelect={() => setAction("detail")}><Eye aria-hidden="true" />Ver detalle</DropdownMenuItem>
        <DropdownMenuItem className={styles.menuItem} aria-label={`Editar lead: ${name}`} onSelect={() => setAction("edit")}><Pencil aria-hidden="true" />Editar lead</DropdownMenuItem>
        <DropdownMenuItem asChild className={styles.menuItem}><Link href={`/tareas?nueva=1&relacion=${encodeURIComponent("Lead")}&registro=${encodeURIComponent(lead.id)}`} aria-label={`Nueva tarea: ${name}`}><ListTodo aria-hidden="true" />Nueva tarea</Link></DropdownMenuItem>
        {lead.estado !== "Convertido" && <DropdownMenuItem className={styles.menuItem} aria-label={`Convertir a cliente: ${name}`} onSelect={() => setAction("convert")}><ArrowRightLeft aria-hidden="true" />Convertir a cliente</DropdownMenuItem>}
        {canDelete && <><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" className={styles.menuItem} aria-label={`Eliminar lead: ${name}`} onSelect={() => setAction("delete")}><Trash2 aria-hidden="true" />Eliminar lead</DropdownMenuItem></>}
      </DropdownMenuContent>
    </DropdownMenu>
    <LeadDetail lead={lead} owner={owner} open={action === "detail"} onOpenChange={(open) => setAction(open ? "detail" : null)} onCloseAutoFocus={restoreDialogFocus} />
    <LeadFormDialog lead={lead} responsibles={responsibles} onSaved={onSaved} open={action === "edit"} onOpenChange={(open) => setAction(open ? "edit" : null)} onCloseAutoFocus={restoreDialogFocus} />
    <LeadConvertDialog lead={lead} onSaved={onSaved} open={action === "convert"} onOpenChange={(open) => setAction(open ? "convert" : null)} onCloseAutoFocus={restoreDialogFocus} />
    {canDelete && <LeadDelete lead={lead} onDeleted={onDeleted} open={action === "delete"} onOpenChange={(open) => setAction(open ? "delete" : null)} onCloseAutoFocus={restoreDialogFocus} />}
  </>;
}
