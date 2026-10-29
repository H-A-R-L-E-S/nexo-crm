"use client";

import { useCallback, useEffect, useId, useRef, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsibleSelector } from "./responsible-selector";
import { assertResponsibleChange } from "./responsible-contract";
import { CLIENT_FIELD_ORDER, CLIENT_STATUSES, normalizeClientInput, validateClientContact, type ClientFormErrors } from "./client-validation";
import type { ClientUpdateRequest } from "./client-write";
import type { AssignedClientInput, Client, ClientActor, ClientContactInput, ClientResponsible } from "./types";
import styles from "@/components/crm/directory.module.css";

export type ClientResponsibleFormAdapter = {
  loadResponsibles: (clientId: string | null) => Promise<readonly ClientResponsible[]>;
  create: (input: AssignedClientInput) => Promise<Client>;
  update: (request: ClientUpdateRequest) => Promise<Client>;
};

const fields = [
  { key: "firstName", label: "Nombres", autoComplete: "given-name", max: 80, required: true },
  { key: "lastName", label: "Apellidos", autoComplete: "family-name", max: 100, required: true },
  { key: "company", label: "Empresa", autoComplete: "organization", max: 100 },
  { key: "position", label: "Cargo", autoComplete: "organization-title", max: 100 },
  { key: "email", label: "Correo electrónico", autoComplete: "email", max: 254, required: true },
  { key: "phone", label: "Teléfono", autoComplete: "tel", max: 30, required: true },
] as const;

function contactValues(client?: Partial<ClientContactInput>): ClientContactInput {
  return { firstName: client?.firstName ?? "", lastName: client?.lastName ?? "", company: client?.company ?? "", email: client?.email ?? "", phone: client?.phone ?? "", position: client?.position ?? "", status: client?.status ?? "Prospecto", address: client?.address ?? "", notes: client?.notes ?? "" };
}

function UuidClientFormFields({ actor, client, clients, adapter, onSaved, onClose }: {
  actor: ClientActor; client?: Client; clients: readonly Client[]; adapter: ClientResponsibleFormAdapter;
  onSaved: (client: Client) => void; onClose: () => void;
}) {
  const [values, setValues] = useState(() => contactValues(client));
  const [ownerId, setOwnerId] = useState<string | null>(client?.ownerId ?? null);
  const [people, setPeople] = useState<readonly ClientResponsible[]>([]);
  const [loading, setLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [errors, setErrors] = useState<ClientFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const sequence = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();
  const clientId = client?.id ?? null;

  const load = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    setDirectoryError(null);
    try {
      const items = await adapter.loadResponsibles(clientId);
      if (request === sequence.current) setPeople(items);
    } catch (cause) {
      if (request === sequence.current) { setPeople([]); setDirectoryError(cause instanceof Error ? cause.message : "Revisa la conexión y vuelve a intentarlo."); }
    } finally { if (request === sequence.current) setLoading(false); }
  }, [adapter, clientId]);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void load(); });
    return () => { cancelled = true; sequence.current += 1; };
  }, [load]);

  function update<Key extends keyof ClientContactInput>(key: Key, value: ClientContactInput[Key]) {
    setValues((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const normalized = normalizeClientInput({ ...values, owner: client?.owner ?? "Sin asignar" });
    const contact = contactValues(normalized);
    const nextErrors = validateClientContact(contact, clients, client?.id);
    const changing = !client || ownerId !== client.ownerId;
    try {
      if (changing && (loading || directoryError)) throw new Error("Carga la lista de responsables antes de seleccionar una nueva asignación.");
      assertResponsibleChange(actor, { currentOwnerId: client ? client.ownerId : undefined, nextOwnerId: ownerId, responsibles: people });
    } catch (cause) { nextErrors.owner = cause instanceof Error ? cause.message : "Selecciona un responsable autorizado."; }
    setErrors(nextErrors);
    const first = CLIENT_FIELD_ORDER.find((field) => nextErrors[field]);
    if (first) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(first === "owner" ? '[role="combobox"]' : `[name="${first}"]`)?.focus());
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      let saved: Client;
      if (client) {
        const request: ClientUpdateRequest = { id: client.id, expectedUpdatedAt: client.updatedAt, contact };
        if (ownerId !== client.ownerId && ownerId !== null) request.responsableId = ownerId;
        saved = await adapter.update(request);
      } else {
        if (!ownerId) throw new Error("Selecciona un responsable real antes de guardar.");
        saved = await adapter.create({ ...contact, ownerId });
      }
      onSaved(saved);
      toast.success(client ? "Cambios guardados" : "Cliente registrado");
      onClose();
    } catch (cause) { setSaveError(cause instanceof Error ? cause.message : "No se pudo guardar el cliente. Vuelve a intentarlo."); }
    finally { setSaving(false); }
  }

  function a11y(key: keyof ClientContactInput) {
    return { id: `${id}-${key}`, name: key, "aria-invalid": Boolean(errors[key]), "aria-describedby": errors[key] ? `${id}-${key}-error` : undefined };
  }
  function error(key: keyof ClientContactInput) { return errors[key] ? <p id={`${id}-${key}-error`} className={styles.formError}>{errors[key]}</p> : null; }
  function field(config: typeof fields[number]) {
    return <div key={config.key} className={styles.field}>
      <Label htmlFor={`${id}-${config.key}`}>{config.label}{"required" in config && config.required && <span aria-hidden="true"> *</span>}</Label>
      <Input {...a11y(config.key)} value={values[config.key]} onChange={(event) => update(config.key, event.target.value)} autoComplete={config.autoComplete} maxLength={config.max} type={config.key === "email" ? "email" : config.key === "phone" ? "tel" : "text"} required={"required" in config && config.required} />
      {error(config.key)}
    </div>;
  }
  return <form ref={formRef} className={styles.form} onSubmit={submit} noValidate aria-busy={saving}>
    <p className={styles.formHelp}>Los campos con * son obligatorios.</p>
    {Object.values(errors).some(Boolean) && <p className={styles.dangerNotice} role="alert">Revisa los campos indicados antes de guardar.</p>}
    {saveError && <p className={styles.dangerNotice} role="alert">{saveError}</p>}
    <fieldset className={styles.formSection} disabled={saving}><legend>Identificación</legend><div className={styles.formGrid}>{fields.slice(0, 4).map(field)}</div></fieldset>
    <fieldset className={styles.formSection} disabled={saving}><legend>Contacto</legend><div className={styles.formGrid}>
      {fields.slice(4).map(field)}
      <div className={styles.fieldWide}><Label htmlFor={`${id}-address`}>Dirección</Label><Input {...a11y("address")} value={values.address} onChange={(event) => update("address", event.target.value)} autoComplete="street-address" maxLength={200} />{error("address")}</div>
    </div></fieldset>
    <fieldset className={styles.formSection} disabled={saving}><legend>Relación comercial</legend><div className={styles.formGrid}>
      <div className={styles.field}><Label htmlFor={`${id}-status`}>Estado<span aria-hidden="true"> *</span></Label><select {...a11y("status")} value={values.status} onChange={(event) => update("status", event.target.value as ClientContactInput["status"])} required className={styles.select}>{CLIENT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select>{error("status")}</div>
      <div className={styles.fieldWide}><ResponsibleSelector id={`${id}-owner`} actor={actor} currentClient={client} value={ownerId} items={people} loading={loading} error={directoryError} onRetry={() => void load()} onChange={(next) => { setOwnerId(next); setErrors((previous) => ({ ...previous, owner: undefined })); }} errorMessage={errors.owner} readOnly={saving} /></div>
      <div className={styles.fieldWide}><Label htmlFor={`${id}-notes`}>Notas</Label><Textarea {...a11y("notes")} value={values.notes} onChange={(event) => update("notes", event.target.value)} maxLength={1500} rows={3} />{error("notes")}</div>
    </div></fieldset>
    <DialogFooter className={styles.formActions}><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? "Guardando..." : client ? "Guardar cambios" : "Guardar cliente"}</Button></DialogFooter>
  </form>;
}

export function ClientUuidFormDialog({
  actor, client, adapter, onSaved, clients = [], initiallyOpen = false, children,
  open: controlledOpen, onOpenChange, hideTrigger = false, onCloseAutoFocus,
}: {
  actor: ClientActor; client?: Client; adapter: ClientResponsibleFormAdapter; onSaved: (client: Client) => void;
  clients?: readonly Client[]; initiallyOpen?: boolean; children?: ReactNode; open?: boolean;
  onOpenChange?: (open: boolean) => void; hideTrigger?: boolean;
  onCloseAutoFocus?: ComponentProps<typeof DialogContent>["onCloseAutoFocus"];
}) {
  const [localOpen, setLocalOpen] = useState(initiallyOpen);
  const open = controlledOpen ?? localOpen;
  const setOpen = onOpenChange ?? setLocalOpen;
  return <Dialog open={open} onOpenChange={setOpen}>
    {!hideTrigger && <DialogTrigger asChild>{children ?? <Button>{!client && <Plus className="size-4" aria-hidden="true" />}{client ? "Editar cliente" : "Nuevo cliente"}</Button>}</DialogTrigger>}
    <DialogContent className={styles.dialog} onCloseAutoFocus={onCloseAutoFocus} onEscapeKeyDown={(event) => {
      if (event.target instanceof HTMLElement && event.target.matches('[role="combobox"][aria-expanded="true"]')) event.preventDefault();
    }}>
      <DialogHeader className={styles.dialogHeader}><DialogTitle>{client ? "Editar cliente" : "Nuevo cliente"}</DialogTitle><DialogDescription>{client ? "Actualiza el contacto conservando su historia o selecciona un responsable autorizado." : "Registra el contacto y selecciona expresamente un usuario real."}</DialogDescription></DialogHeader>
      <UuidClientFormFields actor={actor} client={client} clients={clients} adapter={adapter} onSaved={onSaved} onClose={() => setOpen(false)} />
    </DialogContent>
  </Dialog>;
}
