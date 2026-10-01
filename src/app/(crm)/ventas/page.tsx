import { requireProfile } from "@/features/auth/server";
import { SalesView } from "@/features/sales/sales-view";
export default async function SalesPage({ searchParams }: { searchParams: Promise<{ nueva?: string; oportunidad?: string }> }) {
  await requireProfile();
  const query = await searchParams;
  return <SalesView initialNow={new Date().toISOString()} initialOpportunityId={query.oportunidad} create={query.nueva === "1"} />;
}
