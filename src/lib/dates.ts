export function getNextSunday(from?: Date): Date {
  const now = from || new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = day === 0 ? 0 : 7 - day;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + diff);
  sunday.setHours(0, 0, 0, 0);
  return sunday;
}

export function getSundayDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDateDisplay(dateStr: string): { day: string; month: string; year: string; full: string } {
  const date = new Date(dateStr + "T00:00:00");
  const day = date.getDate().toString();
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const year = date.getFullYear().toString();
  const full = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return { day, month, year, full };
}

export function generateUpcomingSundays(count: number): string[] {
  const first = new Date("2026-07-19T00:00:00"); // July 19, 2026 is a Sunday
  const sundays: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(first);
    d.setDate(first.getDate() + i * 7);
    sundays.push(getSundayDate(d));
  }
  return sundays;
}
