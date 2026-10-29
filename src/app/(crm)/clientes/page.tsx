import type { Metadata } from "next";
import { headers } from "next/headers";
import { ClientsView } from "@/features/clients/clients-view";
import { CLIENT_RESPONSIBLES_UUID_ENABLED, localResponsiblesPreviewAllowed } from "@/features/clients/responsibles-activation";
import type { ClientStatus } from "@/features/clients/types";

export const metadata: Metadata = { title: "Clientes | Nexo CRM" };

export default async function ClientsPage({ searchParams }: PageProps<"/clientes">) {
  const query = await searchParams;
  const status = typeof query.estado === "string" && ["Activo", "Prospecto", "Inactivo"].includes(query.estado) ? query.estado as ClientStatus : undefined;
  const owner = typeof query.responsable === "string" && query.responsable.length <= 180 ? query.responsable : undefined;
  const search = typeof query.buscar === "string" ? query.buscar : "";
  const requestHeaders = await headers();
  const localUuidTest = query.responsables_uuid === "enabled" && localResponsiblesPreviewAllowed({
    flag: process.env.NEXO_E2E_CLIENT_RESPONSIBLES,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    requestHost: requestHeaders.get("host") ?? undefined,
  });
  const uuidEnabled = CLIENT_RESPONSIBLES_UUID_ENABLED || localUuidTest;
  return <ClientsView key={`${status ?? "todos"}-${owner ?? "todos"}-${search}`} initialStatus={status} initialOwner={owner} initialSearch={search} uuidEnabled={uuidEnabled} />;
}
