import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <div className="rounded-xl border bg-white px-6 py-20 text-center"><p className="text-sm font-semibold text-blue-600">404</p><h1 className="mt-3 text-2xl font-semibold text-slate-900">No encontramos esta página</h1><p className="mt-3 text-sm text-slate-500">Puedes volver al resumen para seguir explorando Nexo.</p><Button asChild className="mt-6"><Link href="/"><ArrowLeft />Volver al resumen</Link></Button></div>;
}
