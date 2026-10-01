import { requireProfile } from "@/features/auth/server";
import { SaleDetailView } from "@/features/sales/sale-detail-view";
import { limaDay } from "@/features/leads/dates";
export default async function SalePage({ params }: { params: Promise<{ id: string }> }) {
  await requireProfile();
  const { id } = await params;
  return <SaleDetailView key={id} id={id} today={limaDay(new Date())} />;
}
