import type { Metadata } from "next";
import { ClientsView } from "@/features/clients/clients-view";
import { OWNERS } from "@/features/clients/demo-data";
import type { ClientStatus } from "@/features/clients/types";

export const metadata: Metadata = { title: "Clientes | Nexo CRM" };

export default async function ClientsPage({ searchParams }: PageProps<"/clientes">) {
  const query = await searchParams;
  const status = typeof query.estado === "string" && ["Activo", "Prospecto", "Inactivo"].includes(query.estado) ? query.estado as ClientStatus : undefined;
  const owner = OWNERS.find((item) => item.name === query.responsable)?.name;
  const search = typeof query.buscar === "string" ? query.buscar : "";
  return <ClientsView key={`${status ?? "todos"}-${owner ?? "todos"}-${search}`} initialStatus={status} initialOwner={owner} initialSearch={search} />;
}
