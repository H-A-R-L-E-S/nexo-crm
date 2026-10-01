"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/auth-provider";
import { responsableName } from "@/features/leads/types";
import { canManageSales } from "./permissions";
import { canEditSale, PAYMENT_METHODS, type Sale, type SaleDetail, type SaleItemInput, type SaleState, type SaveSale } from "./types";
import { getSaleDetail, saveSale } from "./services/sales.service";
import { saleAmounts } from "./calculations";
import { SaleSummary } from "./sale-summary";
import type { SalesDirectory } from "./use-sales";

export const saleSelectStyle = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus-visible:outline-blue-600 disabled:bg-slate-50 disabled:text-slate-500";
type Props = { sale?: Sale; directory: SalesDirectory; onSaved: (detail: SaleDetail) => void; today: string; initialOpportunityId?: string; defaultOpen?: boolean; disabled?: boolean; children?: ReactNode };
export function SaleFormDialog(props: Props) {
  const [open, setOpen] = useState(props.defaultOpen ?? false);
  const [pending, setPending] = useState(false);
  const formProps = { ...props, pending, setPending, onCancel: () => setOpen(false), onSaved: (detail: SaleDetail) => { props.onSaved(detail); setOpen(false); } };
  return <Dialog open={open} onOpenChange={(value) => { if (!pending) setOpen(value); }}><DialogTrigger asChild>{props.children ?? <Button disabled={props.disabled}><Plus className="size-4" />Nueva venta</Button>}</DialogTrigger><DialogContent className="max-h-[92dvh] overflow-y-auto p-6 sm:max-w-3xl" showCloseButton={!pending}><DialogHeader><DialogTitle>{props.sale ? `Editar ${props.sale.numero}` : "Nueva venta"}</DialogTitle><DialogDescription>Registra el cliente y sus productos o servicios. Los campos con * son obligatorios.</DialogDescription></DialogHeader>{props.sale ? <EditSaleForm {...formProps} sale={props.sale} /> : <SaleForm {...formProps} />}</DialogContent></Dialog>;
}
type FormProps = Props & { detail?: SaleDetail; pending: boolean; setPending: (value: boolean) => void; onCancel: () => void };
function EditSaleForm(props: FormProps & { sale: Sale }) {
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void getSaleDetail(props.sale.id).then((value) => { if (active) { setDetail(value); setError(""); } }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "No se pudo cargar la venta."); });
    return () => { active = false; };
  }, [props.sale.id, attempt]);
  if (error) return <div role="alert" className="space-y-3"><p className="text-sm text-red-700">{error}</p><Button variant="outline" onClick={() => setAttempt(attempt + 1)}>Reintentar</Button></div>;
  if (!detail) return <p role="status" className="p-8 text-center text-sm text-slate-500">Cargando ítems...</p>;
  if (!canEditSale(detail.sale)) return <p role="alert" className="text-sm text-amber-700">Esta venta ya fue pagada o cancelada. Cierra y actualiza la lista.</p>;
  return <SaleForm {...props} detail={detail} />;
}
function SaleForm({ directory, detail, today, initialOpportunityId, pending, setPending, onSaved, onCancel }: FormProps) {
  const sale = detail?.sale;
  const id = useId();
  const { profile } = useAuth();
  const manage = canManageSales(profile.rol);
  const opportunity = directory.opportunities.find((item) => item.id === initialOpportunityId && item.etapa === "Ganada");
  const [clientId, setClientId] = useState(sale?.cliente_id ?? opportunity?.cliente_id ?? "");
  const [opportunityId, setOpportunityId] = useState(sale?.oportunidad_id ?? opportunity?.id ?? "");
  const [state, setState] = useState<SaleState>(sale?.estado ?? "Borrador");
  const [igv, setIgv] = useState(sale?.aplica_igv ?? true);
  const initialOwner = sale ? sale.responsable_id ?? "" : manage && opportunity?.responsable_id && directory.responsibles.some((person) => person.id === opportunity.responsable_id && person.activo) ? opportunity.responsable_id : profile.id;
  const inactiveOwner = directory.responsibles.find((person) => person.id === initialOwner && !person.activo);
  const [rows, setRows] = useState<(SaleItemInput & { key: string })[]>(() => detail ? detail.items.map((item) => ({ key: item.id, descripcion: item.descripcion, cantidad: item.cantidad, precio_unitario: item.precio_unitario, descuento: item.descuento })) : [{ key: "first", descripcion: opportunity?.titulo ?? "", cantidad: "1", precio_unitario: opportunity?.valor ?? "", descuento: "0" }]);
  const [error, setError] = useState("");
  const requestId = useRef<string | null>(null);
  const busy = useRef(false);
  let preview: ReturnType<typeof saleAmounts> | null = null;
  let previewError = "";
  try { preview = saleAmounts(rows, igv); } catch (cause) { previewError = cause instanceof Error ? cause.message : "Revisa los importes."; }
  function updateItem(key: string, field: keyof SaleItemInput, value: string) { setRows(rows.map((row) => row.key === key ? { ...row, [field]: value } : row)); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy.current) return; setError("");
    const form = new FormData(event.currentTarget);
    const field = (name: string) => String(form.get(name) ?? "").trim();
    try {
      const owner = manage ? field("responsable_id") : initialOwner;
      if (!owner && !sale) throw new Error("Selecciona un responsable activo.");
      const input: SaveSale = { cliente_id: clientId, oportunidad_id: opportunityId || null, responsable_id: owner || null, estado: state, aplica_igv: igv, fecha_venta: field("fecha_venta"), fecha_pago: state === "Pagada" ? field("fecha_pago") || null : null, metodo_pago: field("metodo_pago") as SaveSale["metodo_pago"], referencia_pago: field("referencia_pago"), observaciones: field("observaciones") };
      requestId.current ??= crypto.randomUUID();
      busy.current = true; setPending(true);
      const saved = await saveSale(input, rows.map(({ descripcion, cantidad, precio_unitario, descuento }) => ({ descripcion, cantidad, precio_unitario, descuento })), requestId.current, sale);
      onSaved(saved); toast.success(sale ? "Venta actualizada" : "Venta creada", { description: saved.sale.numero });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar la venta."); }
    finally { busy.current = false; setPending(false); }
  }
  return <form onSubmit={submit} noValidate className="space-y-5 pt-2" aria-busy={pending}><fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2 disabled:opacity-70">
    <div className="space-y-2"><Label htmlFor={`${id}-client`}>Cliente *</Label><select id={`${id}-client`} value={clientId} onChange={(event) => { setClientId(event.target.value); setOpportunityId(""); }} className={saleSelectStyle}><option value="">Selecciona un cliente</option>{directory.clients.map((client) => <option key={client.id} value={client.id}>{client.name}{client.company ? ` · ${client.company}` : ""}</option>)}</select>{!directory.clients.length && <p className="text-xs text-amber-700">Primero registra un cliente en Clientes.</p>}</div>
    <div className="space-y-2"><Label htmlFor={`${id}-opportunity`}>Oportunidad</Label><select id={`${id}-opportunity`} value={opportunityId} onChange={(event) => setOpportunityId(event.target.value)} className={saleSelectStyle}><option value="">Sin oportunidad relacionada</option>{directory.opportunities.filter((item) => item.cliente_id === clientId && (item.etapa === "Ganada" || item.id === sale?.oportunidad_id)).map((item) => <option key={item.id} value={item.id}>{item.titulo}{item.etapa !== "Ganada" ? " (histórico)" : ""}</option>)}</select><p className="text-[11px] text-slate-500">Las nuevas asociaciones requieren una oportunidad Ganada.</p></div>
    <div className="space-y-2"><Label htmlFor={`${id}-owner`}>Responsable *</Label><select id={`${id}-owner`} name="responsable_id" defaultValue={initialOwner} disabled={!manage} className={saleSelectStyle}><option value="">Selecciona un responsable</option>{inactiveOwner && <option value={inactiveOwner.id}>{responsableName(inactiveOwner)} (inactivo)</option>}{directory.responsibles.filter((person) => person.activo).map((person) => <option key={person.id} value={person.id}>{responsableName(person)}</option>)}</select></div>
    <div className="space-y-2"><Label htmlFor={`${id}-date`}>Fecha de venta *</Label><Input id={`${id}-date`} type="date" name="fecha_venta" defaultValue={sale?.fecha_venta ?? today} /></div>
    <div className="space-y-2"><Label htmlFor={`${id}-state`}>Estado *</Label><select id={`${id}-state`} value={state} onChange={(event) => setState(event.target.value as SaleState)} className={saleSelectStyle}>{["Borrador", "Pendiente", "Pagada"].filter((value) => value !== "Borrador" || sale?.estado !== "Pendiente").map((value) => <option key={value}>{value}</option>)}</select></div>
    <div className="space-y-2"><Label htmlFor={`${id}-method`}>Método de pago{state === "Pagada" ? " *" : ""}</Label><select id={`${id}-method`} name="metodo_pago" defaultValue={sale?.metodo_pago ?? ""} className={saleSelectStyle}><option value="">Sin registrar</option>{PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}</select></div>
    {state === "Pagada" && <div className="space-y-2"><Label htmlFor={`${id}-paid`}>Fecha de pago *</Label><Input id={`${id}-paid`} name="fecha_pago" type="date" defaultValue={sale?.fecha_pago ?? today} /></div>}
    <div className="space-y-2"><Label htmlFor={`${id}-reference`}>Referencia de pago</Label><Input id={`${id}-reference`} name="referencia_pago" defaultValue={sale?.referencia_pago ?? ""} maxLength={160} /></div>
    <div className="space-y-2 sm:col-span-2"><Label htmlFor={`${id}-notes`}>Observaciones</Label><Textarea id={`${id}-notes`} name="observaciones" defaultValue={sale?.observaciones ?? ""} rows={2} maxLength={3000} /></div>
  </fieldset><fieldset disabled={pending} className="space-y-4"><legend className="mb-3 text-sm font-semibold">Productos y servicios</legend>{rows.map((row, index) => <section key={row.key} aria-label={`Ítem ${index + 1}`} className="rounded-xl border border-slate-200 p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-semibold text-slate-500">Ítem {index + 1}</h3><Button type="button" variant="ghost" size="icon" aria-label={`Quitar ítem ${index + 1}`} onClick={() => setRows(rows.filter((item) => item.key !== row.key))}><Trash2 className="size-4" /></Button></div><div className="grid gap-3 sm:grid-cols-3"><div className="space-y-2 sm:col-span-3"><Label htmlFor={`${id}-description-${index}`}>Descripción *</Label><Input id={`${id}-description-${index}`} value={row.descripcion} onChange={(event) => updateItem(row.key, "descripcion", event.target.value)} maxLength={200} /></div>{[{ field: "cantidad", label: "Cantidad *" }, { field: "precio_unitario", label: "Precio unitario (S/) *" }, { field: "descuento", label: "Descuento del ítem (S/)" }].map(({ field, label }) => <div key={field} className="space-y-2"><Label htmlFor={`${id}-${field}-${index}`}>{label}</Label><Input id={`${id}-${field}-${index}`} inputMode="decimal" value={row[field as keyof SaleItemInput]} onChange={(event) => updateItem(row.key, field as keyof SaleItemInput, event.target.value)} /></div>)}</div></section>)}<Button type="button" variant="outline" disabled={rows.length >= 100} onClick={() => setRows([...rows, { key: crypto.randomUUID(), descripcion: "", cantidad: "1", precio_unitario: "", descuento: "0" }])}><Plus className="size-4" />Agregar producto/servicio</Button><p className="text-[11px] text-slate-500">Cantidades hasta 3 decimales. Precios y descuentos hasta 2; sin separadores de miles. El descuento corresponde al importe total del ítem.</p><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={igv} onChange={(event) => setIgv(event.target.checked)} className="size-4 accent-blue-600" />Aplicar IGV 18%</label></fieldset>{preview ? <SaleSummary amounts={preview} /> : <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Completa los importes para calcular el resumen. {previewError}</p>}<p className="text-xs text-slate-500">El servidor recalcula los totales al guardar. Una venta Pagada quedará bloqueada para edición.</p>{!manage && <p className="text-xs text-slate-500">Las ventas nuevas se asignan a tu cuenta; Administrador y Gerente pueden reasignarlas.</p>}{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={pending} onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Save />}{pending ? sale ? "Guardando cambios..." : "Creando..." : sale ? "Guardar cambios" : "Crear venta"}</Button></div></form>;
}
