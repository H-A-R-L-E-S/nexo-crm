const LIMA_OFFSET = "T12:00:00-05:00";

export type CalendarView = "month" | "week" | "day";
export const parseDay = (day: string) => new Date(`${day}${LIMA_OFFSET}`);
export const dayKey = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
export const addDays = (day: string, amount: number) => dayKey(new Date(parseDay(day).getTime() + amount * 86_400_000));
export const startOfWeek = (day: string) => addDays(day, -((parseDay(day).getDay() + 6) % 7));
export function monthGrid(day: string) {
  const date = parseDay(day);
  const first = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}
export function shiftPeriod(day: string, view: CalendarView, amount: number) {
  if (view === "day") return addDays(day, amount);
  if (view === "week") return addDays(day, amount * 7);
  const date = parseDay(day);
  date.setMonth(date.getMonth() + amount, 1);
  return dayKey(date);
}
export const formatPeriod = (day: string, view: CalendarView) => {
  const date = parseDay(day);
  if (view === "month") return new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "America/Lima" }).format(date);
  if (view === "day") return new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Lima" }).format(date);
  const start = parseDay(startOfWeek(day));
  const end = parseDay(addDays(dayKey(start), 6));
  return `${new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", timeZone: "America/Lima" }).format(start)} – ${new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Lima" }).format(end)}`;
};
