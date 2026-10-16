import { expect, test } from "@playwright/test";
import { addDays, monthGrid, shiftPeriod, startOfWeek } from "../src/features/calendar/dates";

test("calendario: semanas y cuadrícula mensual comienzan el lunes", () => {
  expect(startOfWeek("2026-10-15")).toBe("2026-10-12");
  const grid = monthGrid("2026-10-15");
  expect(grid).toHaveLength(42);
  expect(grid[0]).toBe("2026-09-28");
  expect(grid[41]).toBe("2026-11-08");
});

test("calendario: cambio de año y febrero bisiesto no desplazan fechas", () => {
  expect(shiftPeriod("2026-12-15", "month", 1)).toBe("2027-01-01");
  expect(shiftPeriod("2027-01-15", "month", -1)).toBe("2026-12-01");
  expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
});
