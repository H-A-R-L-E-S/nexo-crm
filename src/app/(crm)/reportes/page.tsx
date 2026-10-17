import type { Metadata } from "next";
import { requireProfile } from "@/features/auth/server";
import { ReportsView } from "@/features/reports/reports-view";
export const metadata: Metadata = { title: "Reportes | Nexo CRM" };
export default async function ReportsPage() { await requireProfile(); return <ReportsView />; }
