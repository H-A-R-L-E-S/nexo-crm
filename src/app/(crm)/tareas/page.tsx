import { requireProfile } from "@/features/auth/server";
import { TasksView } from "@/features/tasks/tasks-view";
import { RELATION_TYPES } from "@/features/tasks/types";
export default async function TasksPage({ searchParams }: { searchParams: Promise<{ nueva?: string; relacion?: string; registro?: string; vencimiento?: string }> }) {
  await requireProfile();
  const query = await searchParams;
  const relation = RELATION_TYPES.find((type) => type === query.relacion);
  return <TasksView key={`${query.nueva ?? ""}-${query.relacion ?? ""}-${query.registro ?? ""}-${query.vencimiento ?? ""}`} initialNow={new Date().toISOString()} initialRelation={relation} initialRecord={query.registro} create={query.nueva === "1"} initialTiming={query.vencimiento} />;
}
