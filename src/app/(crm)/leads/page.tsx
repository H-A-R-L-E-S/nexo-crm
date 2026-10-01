import { requireProfile } from "@/features/auth/server";
import { LeadsView } from "@/features/leads/leads-view";

export default async function LeadsPage() {
  await requireProfile();
  return <LeadsView initialNow={new Date().toISOString()} />;
}
