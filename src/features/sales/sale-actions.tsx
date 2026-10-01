"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Ban, CreditCard, Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/features/auth/auth-provider";
import { formatMoney } from "@/features/opportunities/money";
import { canDeleteSale, canManageSales } from "./permissions";
import { canEditSale, PAYMENT_METHODS, type Sale, type SaleDetail, type SaleState } from "./types";
import { changeSaleStatus, deleteSale } from "./services/sales.service";
import { SaleFormDialog, saleSelectStyle } from "./sale-form";
import { validDate } from "./validation";
import type { SalesDirectory } from "./use-sales";

const stateColors: Record<SaleState, string> = { Borrador: "border-slate-200 bg-slate-100 text-slate-600", Pendiente: "border-amber-100 bg-amber-50 text-amber-700", Pagada: "border-emerald-100 bg-emerald-50 text-emerald-700", Cancelada: "border-red-100 bg-red-50 text-red-700" };
export function SaleStateBadge({ state }: { state: SaleState }) { return <Badge variant="outline" className={stateColors[state]}>{state}</Badge>; }
type Props = { sale: Sale; directory: SalesDirectory; today: string; onSaved: (sale: Sale) => void; onEdited?: (detail: SaleDetail) => void; onDeleted: (id: string) => void; showDetail?: boolean };
export function SaleActions({ sale, directory, today, onSaved, onEdited, onDeleted, showDetail = true }: Props) {
  const { profile } = useAuth();
  return <div className={showDetail ? "flex w-max shrink-0 gap-1" : "flex flex-wrap gap-1"}>{showDetail && <Button asChild variant="ghost" size="icon"><Link href={`/ventas/${sale.id}`} aria-label={`Ver venta ${sale.numero}`} title="Ver detalle"><Eye className="size-4" /></Link></Button>}{canEditSale(sale) && <><SaleFormDialog sale={sale} directory={directory} today={today} onSaved={(detail) => { onSaved(detail.sale); onEdited?.(detail); }}><Button variant="ghost" size="icon" aria-label={`Editar venta ${sale.numero}`} title="Editar venta"><Pencil className="size-4" /></Button></SaleFormDialog><SaleStatusDialog sale={sale} today={today} onSaved={onSaved} /></>}{canManageSales(profile.rol) && sale.estado !== "Cancelada" && <SaleStatusDialog sale={sale} today={today} onSaved={onSaved} cancel />}{canDeleteSale(profile.rol, sale) && <SaleDelete sale={sale} onDeleted={onDeleted} />}</div>;
}
function SaleStatusDialog({ sale, today, onSaved, cancel = false }: { sale: Sale; today: string; onSaved: (sale: Sale) => void; cancel?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  return <Dialog open={open} onOpenChange={(value) => { if (!pending) setOpen(value); }}><DialogTrigger asChild><Button variant="ghost" size="icon" className={cancel ? "text-slate-500 hover:text-red-600" : "text-blue-600"} aria-label={`${cancel ? "Cancelar venta" : "Marcar pagada"} ${sale.numero}`} title={cancel ? "Cancelar venta" : "Marcar pagada"}>{cancel ? <Ban className="size-4" /> : <CreditCard className="size-4" />}</Button></DialogTrigger><DialogContent className="max-h-[90dvh] overflow-y-auto p-6 sm:max-w-lg" showCloseButton={!pending}><DialogHeader><DialogTitle>{cancel ? "Cancelar venta" : "Registrar pago"}</DialogTitle><DialogDescription>{sale.numero} · {formatMoney(sale.total)}. {cancel ? "Se conservarán los ítems y los datos de pago. La venta dejará de contar como ingreso." : "Al marcar Pagada, los datos y los importes quedarán bloqueados para edición."}</DialogDescription></DialogHeader><StatusForm sale={sale} today={today} cancel={cancel} pending={pending} setPending={setPending} onCancel={() => setOpen(false)} onSaved={(saved) => { onSaved(saved); setOpen(false); }} /></DialogContent></Dialog>;
}
function StatusForm({ sale, today, cancel, pending, setPending, onCancel, onSaved }: { sale: Sale; today: string; cancel: boolean; pending: boolean; setPending: (value: boolean) => void; onCancel: () => void; onSaved: (sale: Sale) => void }) {
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return; setError("");
    const form = new FormData(event.currentTarget);
    const field = (name: string) => String(form.get(name) ?? "").trim();
    const values = { date: field("date"), method: field("method"), reference: field("reference"), reason: field("reason") };
    if (cancel && (values.reason.length < 2 || values.reason.length > 500)) { setError("Registra un motivo de cancelación de 2 a 500 caracteres."); return; }
    if (!cancel && (!validDate(values.date) || !PAYMENT_METHODS.includes(values.method as typeof PAYMENT_METHODS[number]))) { setError("Completa una fecha y un método de pago válidos."); return; }
    setPending(true);
    try { onSaved(await changeSaleStatus(sale, cancel ? "Cancelada" : "Pagada", values)); toast.success(cancel ? "Venta cancelada" : "Pago registrado"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar la operación."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} noValidate className="space-y-4" aria-busy={pending}><fieldset disabled={pending} className="space-y-4">{cancel ? <div className="space-y-2"><Label htmlFor={`reason-${sale.id}`}>Motivo de cancelación *</Label><Textarea id={`reason-${sale.id}`} name="reason" maxLength={500} rows={3} /></div> : <><div className="space-y-2"><Label htmlFor={`paid-${sale.id}`}>Fecha de pago *</Label><Input id={`paid-${sale.id}`} name="date" type="date" defaultValue={today} /></div><div className="space-y-2"><Label htmlFor={`method-${sale.id}`}>Método de pago *</Label><select id={`method-${sale.id}`} name="method" defaultValue={sale.metodo_pago} className={saleSelectStyle}><option value="">Selecciona un método</option>{PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}</select></div><div className="space-y-2"><Label htmlFor={`ref-${sale.id}`}>Referencia de pago</Label><Input id={`ref-${sale.id}`} name="reference" defaultValue={sale.referencia_pago} maxLength={160} /></div></>}</fieldset>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={pending} onClick={onCancel}>Volver</Button><Button type="submit" variant={cancel ? "destructive" : "default"} disabled={pending}>{pending ? cancel ? "Cancelando..." : "Guardando pago..." : cancel ? "Confirmar cancelación" : "Marcar Pagada"}</Button></div></form>;
}
function SaleDelete({ sale, onDeleted }: { sale: Sale; onDeleted: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    if (pending) return; setPending(true); setError("");
    try { await deleteSale(sale); onDeleted(sale.id); setOpen(false); toast.success("Borrador eliminado"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo eliminar."); }
    finally { setPending(false); }
  }
  return <AlertDialog open={open} onOpenChange={(value) => { if (!pending) { setOpen(value); setError(""); } }}><AlertDialogTrigger asChild><Button variant="ghost" size="icon" aria-label={`Eliminar borrador ${sale.numero}`} title="Eliminar borrador" className="text-slate-500 hover:text-red-600"><Trash2 className="size-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar borrador</AlertDialogTitle><AlertDialogDescription>¿Eliminar {sale.numero} y sus ítems? Esta acción no se puede deshacer. Su número no se reutilizará.</AlertDialogDescription></AlertDialogHeader>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2"><Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>Volver</Button><Button variant="destructive" disabled={pending} onClick={remove}>{pending ? "Eliminando..." : "Eliminar borrador"}</Button></div></AlertDialogContent></AlertDialog>;
}
