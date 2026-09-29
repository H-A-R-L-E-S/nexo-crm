"use client";

import { Check, CircleHelp, Clock3, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type WorkspacePanel = { kind: "module"; name: string } | { kind: "help" };

export function WorkspaceDialog({ panel, onClose }: { panel: WorkspacePanel | null; onClose: () => void }) {
  const title = panel?.kind === "module" ? panel.name : "Te damos la bienvenida a Nexo";
  return (
    <Dialog open={panel !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto p-6 sm:max-w-lg">
        <DialogHeader><DialogTitle className="text-lg">{title}</DialogTitle><DialogDescription>Nexo CRM · Espacio de demostración</DialogDescription></DialogHeader>
        {panel?.kind === "module" && <div className="py-4"><Clock3 className="mb-4 size-8 text-blue-600" /><h3 className="font-semibold">Próximamente en tu espacio de trabajo</h3><p className="mt-3 text-sm leading-relaxed text-slate-500">El módulo de {panel.name.toLowerCase()} forma parte de las siguientes etapas. Por ahora puedes explorar Resumen y gestionar tus clientes en Supabase.</p><p className="mt-4 rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">Las oportunidades, ventas y actividades del resumen son ejemplos de la futura experiencia comercial.</p></div>}
        {panel?.kind === "help" && <div className="space-y-5 py-3 text-sm"><div className="flex gap-3"><CircleHelp className="mt-0.5 size-5 shrink-0 text-blue-600" /><div><h3 className="font-semibold">Explora tu CRM</h3><p className="mt-1 leading-relaxed text-slate-500">Resumen reúne tus indicadores. En Clientes puedes buscar, filtrar, registrar, consultar, editar y eliminar contactos.</p></div></div><div className="flex gap-3"><Check className="mt-0.5 size-5 shrink-0 text-blue-600" /><div><h3 className="font-semibold">Muévete a tu ritmo</h3><p className="mt-1 leading-relaxed text-slate-500">Usa Tab para recorrer los controles, Enter para seleccionarlos y Escape para cerrar un formulario. La búsqueda superior te lleva directamente a tus clientes.</p></div></div><div className="flex gap-3"><RefreshCw className="mt-0.5 size-5 shrink-0 text-blue-600" /><div><h3 className="font-semibold">Un espacio para probar</h3><p className="mt-1 leading-relaxed text-slate-500">Los clientes se guardan en Supabase. Las demás secciones aún muestran datos de demostración.</p></div></div></div>}
      </DialogContent>
    </Dialog>
  );
}
