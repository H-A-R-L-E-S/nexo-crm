import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { localResponsiblesPreviewAllowed } from "@/features/clients/responsibles-activation";
import { ErrorProbe } from "./probe";

export const dynamic = "force-dynamic";

export default async function ErrorBoundaryTestPage() {
  const requestHeaders = await headers();
  if (!localResponsiblesPreviewAllowed({
    flag: process.env.NEXO_E2E_ERROR_PROBE,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    requestHost: requestHeaders.get("host") ?? undefined,
  })) notFound();
  return <ErrorProbe />;
}
