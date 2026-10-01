import { requireProfile } from "@/features/auth/server";
import { OpportunitiesView } from "@/features/opportunities/opportunities-view";

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ cliente?: string; lead?: string; nueva?: string; buscar?: string }> }) {
  await requireProfile();
  const query = await searchParams;
  return <OpportunitiesView key={query.buscar ?? ""} initialNow={new Date().toISOString()} initialClientId={query.cliente} initialLeadId={query.lead} create={query.nueva === "1"} initialSearch={query.buscar} />;
}
