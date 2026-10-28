"use client";

import { useEffect, useMemo, useState } from "react";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { Button } from "@/components/ui/button";
import { ClientUuidFormDialog, type ClientResponsibleFormAdapter } from "@/features/clients/client-uuid-form";
import type { Client, ClientActor, ClientResponsible } from "@/features/clients/types";

async function mockRequest<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/__test/client-responsibles/${path}`, body === undefined ? { cache: "no-store" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? error?.error ?? "Los mocks locales no están disponibles. Revisa la prueba y vuelve a intentarlo.");
  }
  return response.json() as Promise<T>;
}

export function ClientResponsiblesPreview() {
  const [context, setContext] = useState<{ actor: ClientActor; client: Client | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [saved, setSaved] = useState<unknown>(null);
  useEffect(() => {
    let cancelled = false;
    void mockRequest<{ actor: ClientActor; client: Client | null }>(`context${window.location.search}`).then((data) => { if (!cancelled) { setContext(data); setError(null); } }, (cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "No se pudo cargar el contexto de pruebas."); });
    return () => { cancelled = true; };
  }, [retry]);
  const adapter = useMemo<ClientResponsibleFormAdapter>(() => ({
    loadResponsibles: (clientId) => mockRequest<ClientResponsible[]>(`directory?clientId=${clientId ?? ""}`),
    async create(input) { const client = await mockRequest<Client>("save", { kind: "create", input }); setSaved({ kind: "create", input, client }); return client; },
    async update(request) { const client = await mockRequest<Client>("save", { kind: "update", request }); setSaved({ kind: "update", request, client }); return client; },
  }), []);
  return <main className="mx-auto grid min-h-screen max-w-4xl content-start gap-6 p-4 sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-xl font-semibold">Prueba local de responsables</h1><p className="mt-2 text-sm text-muted-foreground"><strong>Vista de pruebas local</strong>. Todos los datos y guardados requieren mocks; no se conecta a Clientes de producción.</p></div><ThemeSwitcher /></div>
    {error ? <div role="alert"><p>{error}</p><Button variant="outline" onClick={() => setRetry((previous) => previous + 1)}>Reintentar contexto</Button></div> : context ? <ClientUuidFormDialog actor={context.actor} client={context.client ?? undefined} adapter={adapter} initiallyOpen onSaved={(client) => setContext((previous) => previous ? { ...previous, client } : previous)} /> : <p role="status">Cargando contexto de pruebas...</p>}
    <output data-testid="client-responsibles-save" className="block max-w-full whitespace-pre-wrap break-all text-xs">{saved ? JSON.stringify(saved, null, 2) : ""}</output>
  </main>;
}
