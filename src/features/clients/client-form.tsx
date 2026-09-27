"use client";

import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ChevronDown, Plus, UserRoundPen, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OWNERS } from "./demo-data";
import { useClients } from "./clients-provider";
import { CLIENT_FIELD_ORDER, CLIENT_STATUSES, clientInitialValues, normalizeClientInput, validateClient, type ClientFormErrors } from "./client-validation";
import type { Client, ClientInput, ClientStatus } from "./types";

const TEXT_FIELDS: { field: "firstName" | "lastName" | "company" | "position" | "email" | "phone"; label: string; placeholder: string; autoComplete: string; maxLength: number; required?: boolean; type?: string }[] = [
  { field: "firstName", label: "Nombres", placeholder: "Ej. Valeria", autoComplete: "given-name", maxLength: 80, required: true },
  { field: "lastName", label: "Apellidos", placeholder: "Ej. Rojas", autoComplete: "family-name", maxLength: 100, required: true },
  { field: "company", label: "Empresa", placeholder: "Ej. Andes Estudio", autoComplete: "organization", maxLength: 100 },
  { field: "position", label: "Cargo", placeholder: "Ej. Gerente comercial", autoComplete: "organization-title", maxLength: 100 },
  { field: "email", label: "Correo electrónico", placeholder: "nombre@empresa.com", autoComplete: "email", maxLength: 254, required: true, type: "email" },
  { field: "phone", label: "Teléfono", placeholder: "+51 987 654 321", autoComplete: "tel", maxLength: 30, required: true, type: "tel" },
];

function ClientFormFields({ client, onClose }: { client?: Client; onClose: () => void }) {
  const { clients, addClient, updateClient } = useClients();
  const [values, setValues] = useState<ClientInput>(() => clientInitialValues(client));
  const [errors, setErrors] = useState<ClientFormErrors>({});
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();

  function updateField<Key extends keyof ClientInput>(field: Key, value: ClientInput[Key]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function fieldA11y(field: keyof ClientInput) {
    return { id: `${id}-${field}`, name: field, "aria-invalid": Boolean(errors[field]), "aria-describedby": errors[field] ? `${id}-${field}-error` : undefined };
  }

  function fieldError(field: keyof ClientInput) {
    return errors[field] ? <p id={`${id}-${field}-error`} className="text-xs leading-5 text-red-600">{errors[field]}</p> : null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const input = normalizeClientInput(values);
    const nextErrors = validateClient(input, clients, client?.id);
    setErrors(nextErrors);
    const firstError = CLIENT_FIELD_ORDER.find((field) => nextErrors[field]);
    if (firstError) {
      requestAnimationFrame(() => {
        const inputElement = formRef.current?.elements.namedItem(firstError);
        if (inputElement instanceof HTMLElement) inputElement.focus();
      });
      return;
    }
    setSaving(true);
    try {
      if (client) await updateClient(client.id, input);
      else await addClient(input);
      toast.success(client ? "Cambios guardados" : "Cliente registrado", { description: `${input.firstName} ${input.lastName}: ${client ? "información actualizada correctamente." : "se agregó a tu cartera."}` });
      onClose();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudo guardar el cliente.");
    } finally {
      setSaving(false);
    }
  }

  const selectClassName = "h-10 w-full appearance-none rounded-lg border border-input bg-white px-3 pr-9 text-sm text-slate-700 shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 aria-invalid:border-red-500 aria-invalid:ring-red-100";

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
      <p className="text-xs text-slate-500">Los campos con * son obligatorios.</p>
      {CLIENT_FIELD_ORDER.some((field) => errors[field]) && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Revisa los campos indicados antes de guardar.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {TEXT_FIELDS.map((config) => (
          <div key={config.field} className="space-y-2">
            <Label htmlFor={`${id}-${config.field}`}>{config.label}{config.required && <span aria-hidden="true" className="text-slate-400"> *</span>}</Label>
            <Input {...fieldA11y(config.field)} type={config.type ?? "text"} value={values[config.field]} onChange={(event) => updateField(config.field, event.target.value)} placeholder={config.placeholder} autoComplete={config.autoComplete} maxLength={config.maxLength} required={config.required} className="h-10 rounded-lg" />
            {fieldError(config.field)}
          </div>
        ))}
        <div className="space-y-2">
          <Label htmlFor={`${id}-status`}>Estado <span aria-hidden="true" className="text-slate-400">*</span></Label>
          <div className="relative">
            <select {...fieldA11y("status")} required value={values.status} onChange={(event) => updateField("status", event.target.value as ClientStatus)} className={selectClassName}>
              {CLIENT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute top-3 right-3 size-4 text-slate-400" aria-hidden="true" />
          </div>
          {fieldError("status")}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-owner`}>Responsable <span aria-hidden="true" className="text-slate-400">*</span></Label>
          <div className="relative">
            <select {...fieldA11y("owner")} required value={values.owner} onChange={(event) => updateField("owner", event.target.value)} className={selectClassName}>
              {OWNERS.map((owner) => <option key={owner.name} value={owner.name}>{owner.name}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute top-3 right-3 size-4 text-slate-400" aria-hidden="true" />
          </div>
          {fieldError("owner")}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-address`}>Dirección</Label>
        <Input {...fieldA11y("address")} value={values.address} onChange={(event) => updateField("address", event.target.value)} placeholder="Calle, número, distrito y ciudad" autoComplete="street-address" maxLength={200} className="h-10 rounded-lg" />
        {fieldError("address")}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-notes`}>Notas</Label>
        <Textarea {...fieldA11y("notes")} value={values.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="Agrega contexto que te ayude a conocer mejor al cliente…" maxLength={1500} rows={3} className="resize-y rounded-lg" />
        {fieldError("notes")}
      </div>
      <DialogFooter className="gap-2 border-t border-slate-100 pt-5">
        <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? "Guardando..." : client ? "Guardar cambios" : "Guardar cliente"}</Button>
      </DialogFooter>
    </form>
  );
}

export function ClientFormDialog({ client, children, open: controlledOpen, onOpenChange, hideTrigger = false }: {
  client?: Client; children?: ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void; hideTrigger?: boolean;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = onOpenChange ?? setLocalOpen;
  const FormIcon = client ? UserRoundPen : UserRoundPlus;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && <DialogTrigger asChild>{children ?? <Button className="h-10 gap-2 rounded-lg px-4 shadow-sm"><Plus className="size-4" aria-hidden="true" />Nuevo cliente</Button>}</DialogTrigger>}
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl border-slate-200 p-6 sm:max-w-[640px] sm:p-7">
        <DialogHeader className="text-left">
          <span className="mb-1 flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><FormIcon className="size-5" aria-hidden="true" /></span>
          <DialogTitle className="text-xl tracking-tight text-slate-900">{client ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription className="leading-6">{client ? "Mantén al día los datos de tu cliente." : "Agrega un contacto y comienza una nueva relación."}</DialogDescription>
        </DialogHeader>
        <ClientFormFields client={client} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
