import { requireProfile } from "@/features/auth/server";
import { LeadsView } from "@/features/leads/leads-view";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ buscar?: string }> }) {
  await requireProfile();
  const query = await searchParams;
  return <LeadsView key={query.buscar ?? ""} initialNow={new Date().toISOString()} initialSearch={query.buscar} />;
}
