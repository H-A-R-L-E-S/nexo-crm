"use client";

import { useId, useRef, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { Plus } from "lucide-react";
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
import styles from "@/components/crm/directory.module.css";

const TEXT_FIELDS: { field: "firstName" | "lastName" | "company" | "position" | "email" | "phone"; label: string; placeholder: string; autoComplete: string; maxLength: number; required?: boolean; type?: string }[] = [
  { field: "firstName", label: "Nombres", placeholder: "Nombres del cliente", autoComplete: "given-name", maxLength: 80, required: true },
  { field: "lastName", label: "Apellidos", placeholder: "Apellidos del cliente", autoComplete: "family-name", maxLength: 100, required: true },
  { field: "company", label: "Empresa", placeholder: "Nombre de la empresa", autoComplete: "organization", maxLength: 100 },
  { field: "position", label: "Cargo", placeholder: "Cargo o función", autoComplete: "organization-title", maxLength: 100 },
  { field: "email", label: "Correo electrónico", placeholder: "nombre@empresa.com", autoComplete: "email", maxLength: 254, required: true, type: "email" },
  { field: "phone", label: "Teléfono", placeholder: "Teléfono con código de país", autoComplete: "tel", maxLength: 30, required: true, type: "tel" },
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
    return errors[field] ? <p id={`${id}-${field}-error`} className={styles.formError}>{errors[field]}</p> : null;
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

  function textField(config: (typeof TEXT_FIELDS)[number]) {
    return <div key={config.field} className={styles.field}>
      <Label htmlFor={`${id}-${config.field}`}>{config.label}{config.required && <span aria-hidden="true" className="text-muted-foreground"> *</span>}</Label>
      <Input {...fieldA11y(config.field)} type={config.type ?? "text"} value={values[config.field]} onChange={(event) => updateField(config.field, event.target.value)} placeholder={config.placeholder} autoComplete={config.autoComplete} maxLength={config.maxLength} required={config.required} />
      {fieldError(config.field)}
    </div>;
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className={styles.form} aria-busy={saving}>
      <p className={styles.formHelp}>Los campos con * son obligatorios.</p>
      {CLIENT_FIELD_ORDER.some((field) => errors[field]) && <p role="alert" className={styles.dangerNotice}>Revisa los campos indicados antes de guardar.</p>}
      <fieldset className={styles.formSection}>
        <legend>Identificación</legend>
        <div className={styles.formGrid}>{TEXT_FIELDS.slice(0, 4).map(textField)}</div>
      </fieldset>
      <fieldset className={styles.formSection}>
        <legend>Contacto</legend>
        <div className={styles.formGrid}>
          {TEXT_FIELDS.slice(4).map(textField)}
          <div className={styles.fieldWide}>
            <Label htmlFor={`${id}-address`}>Dirección</Label>
            <Input {...fieldA11y("address")} value={values.address} onChange={(event) => updateField("address", event.target.value)} placeholder="Calle, número, distrito y ciudad" autoComplete="street-address" maxLength={200} />
            {fieldError("address")}
          </div>
        </div>
      </fieldset>
      <fieldset className={styles.formSection}>
        <legend>Relación comercial</legend>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <Label htmlFor={`${id}-status`}>Estado <span aria-hidden="true" className="text-muted-foreground">*</span></Label>
            <select {...fieldA11y("status")} required value={values.status} onChange={(event) => updateField("status", event.target.value as ClientStatus)} className={styles.select}>
              {CLIENT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            {fieldError("status")}
          </div>
          <div className={styles.field}>
            <Label htmlFor={`${id}-owner`}>Responsable <span aria-hidden="true" className="text-muted-foreground">*</span></Label>
            <select {...fieldA11y("owner")} required value={values.owner} onChange={(event) => updateField("owner", event.target.value)} className={styles.select}>
              {OWNERS.map((owner) => <option key={owner.name} value={owner.name}>{owner.name}</option>)}
            </select>
            {fieldError("owner")}
          </div>
          <div className={styles.fieldWide}>
            <Label htmlFor={`${id}-notes`}>Notas</Label>
            <Textarea {...fieldA11y("notes")} value={values.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="Información útil para el próximo contacto…" maxLength={1500} rows={3} />
            {fieldError("notes")}
          </div>
        </div>
      </fieldset>
      <DialogFooter className={styles.formActions}>
        <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? "Guardando..." : client ? "Guardar cambios" : "Guardar cliente"}</Button>
      </DialogFooter>
    </form>
  );
}

export function ClientFormDialog({ client, children, open: controlledOpen, onOpenChange, hideTrigger = false, onCloseAutoFocus }: {
  client?: Client; children?: ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void; hideTrigger?: boolean;
  onCloseAutoFocus?: ComponentProps<typeof DialogContent>["onCloseAutoFocus"];
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = onOpenChange ?? setLocalOpen;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && <DialogTrigger asChild>{children ?? <Button><Plus className="size-4" aria-hidden="true" />Nuevo cliente</Button>}</DialogTrigger>}
      <DialogContent className={styles.dialog} onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader className={styles.dialogHeader}>
          <DialogTitle>{client ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>{client ? "Actualiza el contacto, su estado y responsable." : "Guarda los datos del contacto y asígnale un responsable."}</DialogDescription>
        </DialogHeader>
        <ClientFormFields client={client} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
