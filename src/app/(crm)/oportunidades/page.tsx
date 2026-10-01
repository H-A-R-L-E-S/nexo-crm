import { requireProfile } from "@/features/auth/server";
import { OpportunitiesView } from "@/features/opportunities/opportunities-view";

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ cliente?: string; lead?: string; nueva?: string }> }) {
  await requireProfile();
  const query = await searchParams;
  return <OpportunitiesView initialNow={new Date().toISOString()} initialClientId={query.cliente} initialLeadId={query.lead} create={query.nueva === "1"} />;
}
