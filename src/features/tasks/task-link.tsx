import Link from "next/link";
import { ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RelationType } from "./types";
export function NewTaskLink({ type, id, label }: { type: Exclude<RelationType, "Ninguno">; id: string; label: string }) {
  return <Button asChild variant="ghost" size="icon"><Link href={`/tareas?nueva=1&relacion=${encodeURIComponent(type)}&registro=${encodeURIComponent(id)}`} aria-label={`Nueva tarea: ${label}`} title="Nueva tarea"><ListTodo className="size-4 text-blue-600" /></Link></Button>;
}
