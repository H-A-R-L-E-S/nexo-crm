import { requireProfile } from "@/features/auth/server";
import { TaskDetailView } from "@/features/tasks/task-detail-view";
export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  await requireProfile();
  const { id } = await params;
  return <TaskDetailView key={id} id={id} />;
}
