"use client";

import { Check, CircleHelp, Clock3, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type WorkspacePanel = { kind: "module"; name: string } | { kind: "help" };

export function WorkspaceDialog({ panel, onClose }: { panel: WorkspacePanel | null; onClose: () => void }) {
  const title = panel?.kind === "module" ? panel.name : "Te damos la bienvenida a Nexo";
  return (
    <Dialog open={panel !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto p-6 sm:max-w-lg">
        <DialogHeader><DialogTitle className="text-lg">{title}</DialogTitle><DialogDescription>Nexo CRM · Espacio de trabajo</DialogDescription></DialogHeader>
        {panel?.kind === "module" && <div className="py-4"><Clock3 className="mb-4 size-6 text-blue-700" /><h3 className="font-semibold">Próximamente en tu espacio de trabajo</h3><p className="mt-3 text-sm leading-relaxed text-slate-600">El módulo de {panel.name.toLowerCase()} todavía no está disponible. Puedes gestionar tu cartera en Clientes, Leads y Oportunidades, registrar Ventas y organizar tus seguimientos en Tareas.</p></div>}
        {panel?.kind === "help" && <div className="space-y-5 py-3 text-sm"><div className="flex gap-3"><CircleHelp className="mt-0.5 size-5 shrink-0 text-blue-700" /><div><h3 className="font-semibold">Gestiona tus relaciones comerciales</h3><p className="mt-1 leading-relaxed text-slate-600">Resumen reúne los indicadores de tu cartera. Usa Clientes, Leads y Oportunidades para gestionar contactos y negociaciones; Ventas para tus operaciones y Tareas para los seguimientos.</p></div></div><div className="flex gap-3"><Check className="mt-0.5 size-5 shrink-0 text-blue-700" /><div><h3 className="font-semibold">Navega con el teclado</h3><p className="mt-1 leading-relaxed text-slate-600">Usa Tab para recorrer los controles, Enter para seleccionarlos y Escape para cerrar un formulario. La búsqueda superior te lleva directamente a tus clientes.</p></div></div><div className="flex gap-3"><RefreshCw className="mt-0.5 size-5 shrink-0 text-blue-700" /><div><h3 className="font-semibold">Recupera una carga interrumpida</h3><p className="mt-1 leading-relaxed text-slate-600">Si una sección no carga, revisa tu conexión y utiliza Reintentar. Los módulos marcados «Pronto» todavía no están disponibles.</p></div></div></div>}
      </DialogContent>
    </Dialog>
  );
}
