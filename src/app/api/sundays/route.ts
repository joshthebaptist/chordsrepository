import { getAllSundays, createOrUpdateSunday, addSongToSunday } from "@/lib/store";
import { generateUpcomingSundays } from "@/lib/dates";
import { NextRequest } from "next/server";

export async function GET() {
  let sundays = await getAllSundays();

  // Auto-generate upcoming Sundays if they don't exist
  const upcomingDates = generateUpcomingSundays(52);
  for (const date of upcomingDates) {
    if (!sundays.find((s) => s.date === date)) {
      await createOrUpdateSunday({ date, songs: [] });
    }
  }
  sundays = await getAllSundays();

  return Response.json(sundays);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.action === "addSong") {
    const result = await addSongToSunday(body.date, body.songId, body.keyOverride);
    if (!result) return Response.json({ error: "Sunday not found" }, { status: 404 });
    return Response.json(result);
  }

  const sunday = await createOrUpdateSunday(body);
  return Response.json(sunday);
}
