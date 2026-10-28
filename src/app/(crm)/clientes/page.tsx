import type { Metadata } from "next";
import { ClientsView } from "@/features/clients/clients-view";
import type { ClientStatus } from "@/features/clients/types";

export const metadata: Metadata = { title: "Clientes | Nexo CRM" };

export default async function ClientsPage({ searchParams }: PageProps<"/clientes">) {
  const query = await searchParams;
  const status = typeof query.estado === "string" && ["Activo", "Prospecto", "Inactivo"].includes(query.estado) ? query.estado as ClientStatus : undefined;
  const owner = typeof query.responsable === "string" && query.responsable.length <= 180 ? query.responsable : undefined;
  const search = typeof query.buscar === "string" ? query.buscar : "";
  return <ClientsView key={`${status ?? "todos"}-${owner ?? "todos"}-${search}`} initialStatus={status} initialOwner={owner} initialSearch={search} />;
}
