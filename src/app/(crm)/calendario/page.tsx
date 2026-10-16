import { requireProfile } from "@/features/auth/server";
import { CalendarView } from "@/features/calendar/calendar-view";

export default async function CalendarPage() {
  await requireProfile();
  return <CalendarView initialToday={new Date().toISOString()} />;
}
