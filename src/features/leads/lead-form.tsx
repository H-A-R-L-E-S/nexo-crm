"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/auth-provider";
import { canManageLeads } from "./permissions";
import { fromLimaInput, toLimaInput } from "./dates";
import { createLead, updateLead } from "./services/leads.service";
import { LEAD_ESTADOS, LEAD_FUENTES, LEAD_PRIORIDADES, responsableName, type Lead, type LeadEstado, type LeadFuente, type LeadPrioridad, type LeadResponsable } from "./types";

const selectClass = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500";
type Props = { lead?: Lead; responsibles: LeadResponsable[]; onSaved: (lead: Lead) => void; children?: ReactNode; disabled?: boolean };

export function LeadFormDialog({ lead, responsibles, onSaved, children, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  return <Dialog open={open} onOpenChange={(value) => { if (!pending) setOpen(value); }}><DialogTrigger asChild>{children ?? <Button disabled={disabled} className="h-10 gap-2"><Plus className="size-4" />Nuevo lead</Button>}</DialogTrigger><DialogContent className="max-h-[90dvh] overflow-y-auto p-6 sm:max-w-2xl" showCloseButton={!pending}><DialogHeader><DialogTitle className="text-lg">{lead ? "Editar lead" : "Nuevo lead"}</DialogTitle><DialogDescription>Registra la información del contacto. Los campos con * son obligatorios.</DialogDescription></DialogHeader><LeadForm lead={lead} responsibles={responsibles} pending={pending} setPending={setPending} onSaved={(item) => { onSaved(item); setOpen(false); }} onCancel={() => setOpen(false)} /></DialogContent></Dialog>;
}

function LeadForm({ lead, responsibles, onSaved, pending, setPending, onCancel }: Props & { pending: boolean; setPending: (value: boolean) => void; onCancel: () => void }) {
  const id = useId();
  const { profile } = useAuth();
  const manage = canManageLeads(profile.rol);
  const [error, setError] = useState("");
  const owner = lead ? lead.responsable_id ?? "" : manage ? "" : profile.id;
  const inactiveOwner = responsibles.find((person) => person.id === owner && !person.activo);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    const form = new FormData(event.currentTarget);
    const field = (name: string) => String(form.get(name) ?? "").trim();
    try {
      const input = {
        nombres: field("nombres"), apellidos: field("apellidos"), empresa: field("empresa"), correo: field("correo"), telefono: field("telefono"), cargo: field("cargo"),
        fuente: field("fuente") as LeadFuente, estado: (lead?.estado === "Convertido" ? "Convertido" : field("estado")) as LeadEstado, prioridad: field("prioridad") as LeadPrioridad,
        responsable_id: manage ? field("responsable_id") || null : owner || null,
        notas: field("notas"), ultimo_contacto: fromLimaInput(field("ultimo_contacto")), proximo_seguimiento: fromLimaInput(field("proximo_seguimiento")),
      };
      setPending(true);
      const saved = lead ? await updateLead(lead.id, input, lead.updated_at) : await createLead(input);
      toast.success(lead ? "Lead actualizado" : "Lead creado");
      onSaved(saved);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar el lead."); }
    finally { setPending(false); }
  }
  const fields = [
    { name: "nombres", label: "Nombres *", max: 80, required: true }, { name: "apellidos", label: "Apellidos", max: 100 },
    { name: "empresa", label: "Empresa", max: 100 }, { name: "correo", label: "Correo", max: 254, type: "email" },
    { name: "telefono", label: "Teléfono *", max: 30, type: "tel", required: true }, { name: "cargo", label: "Cargo", max: 100 },
  ] as const;
  return <form onSubmit={submit} noValidate className="space-y-5 pt-2" aria-busy={pending}><fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2 disabled:opacity-70">
    {fields.map((field) => <div key={field.name} className="space-y-2"><Label htmlFor={`${id}-${field.name}`}>{field.label}</Label><Input id={`${id}-${field.name}`} name={field.name} defaultValue={lead?.[field.name] ?? ""} type={"type" in field ? field.type : "text"} maxLength={field.max} required={"required" in field && field.required} /></div>)}
    <div className="space-y-2"><Label htmlFor={`${id}-fuente`}>Fuente *</Label><select id={`${id}-fuente`} name="fuente" defaultValue={lead?.fuente ?? "Web"} className={selectClass}>{LEAD_FUENTES.map((value) => <option key={value}>{value}</option>)}</select></div>
    <div className="space-y-2"><Label htmlFor={`${id}-estado`}>Estado *</Label><select id={`${id}-estado`} name="estado" defaultValue={lead?.estado ?? "Nuevo"} disabled={lead?.estado === "Convertido"} className={selectClass}>{LEAD_ESTADOS.filter((state) => state !== "Convertido" || lead?.estado === "Convertido").map((value) => <option key={value}>{value}</option>)}</select></div>
    <div className="space-y-2"><Label htmlFor={`${id}-prioridad`}>Prioridad *</Label><select id={`${id}-prioridad`} name="prioridad" defaultValue={lead?.prioridad ?? "Media"} className={selectClass}>{LEAD_PRIORIDADES.map((value) => <option key={value}>{value}</option>)}</select></div>
    <div className="space-y-2"><Label htmlFor={`${id}-responsable`}>Responsable</Label><select id={`${id}-responsable`} name="responsable_id" defaultValue={owner} disabled={!manage} className={selectClass}><option value="">Sin asignar</option>{inactiveOwner && <option value={inactiveOwner.id}>{responsableName(inactiveOwner)} (inactivo)</option>}{responsibles.filter((person) => person.activo).map((person) => <option key={person.id} value={person.id}>{responsableName(person)}</option>)}</select></div>
    <div className="space-y-2"><Label htmlFor={`${id}-ultimo`}>Último contacto</Label><Input id={`${id}-ultimo`} name="ultimo_contacto" type="datetime-local" defaultValue={toLimaInput(lead?.ultimo_contacto ?? null)} /><p className="text-[11px] text-slate-500">Hora de Lima (UTC−5)</p></div>
    <div className="space-y-2"><Label htmlFor={`${id}-proximo`}>Próximo seguimiento</Label><Input id={`${id}-proximo`} name="proximo_seguimiento" type="datetime-local" defaultValue={toLimaInput(lead?.proximo_seguimiento ?? null)} /><p className="text-[11px] text-slate-500">Hora de Lima (UTC−5)</p></div>
    <div className="space-y-2 sm:col-span-2"><Label htmlFor={`${id}-notas`}>Notas</Label><Textarea id={`${id}-notas`} name="notas" defaultValue={lead?.notas ?? ""} maxLength={1500} rows={3} /></div>
  </fieldset>{!manage && <p className="text-xs text-slate-500">Los leads nuevos se asignan a tu cuenta. Administrador y Gerente pueden reasignarlos.</p>}{lead?.estado === "Convertido" && <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">Este lead ya está convertido. Los cambios aquí no modifican los datos del cliente vinculado.</p>}{error && <p role="alert" className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={pending} onClick={onCancel}>Cancelar</Button><Button disabled={pending} type="submit">{pending ? <Loader2 className="animate-spin" /> : <Save />}{pending ? lead ? "Guardando cambios..." : "Creando..." : lead ? "Guardar cambios" : "Crear lead"}</Button></div></form>;
}
