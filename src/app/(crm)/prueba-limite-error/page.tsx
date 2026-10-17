import { notFound } from "next/navigation";
import { ErrorProbe } from "./probe";

export default function ErrorBoundaryTestPage() {
  if (process.env.NEXO_E2E_ERROR_PROBE !== "enabled") notFound();
  return <ErrorProbe />;
}
