import { NextRequest } from "next/server";
import { getSunday, createOrUpdateSunday, removeSongFromSunday } from "@/lib/store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  let sunday = getSunday(date);
  if (!sunday) {
    sunday = { date, songs: [] };
    createOrUpdateSunday(sunday);
  }
  return Response.json(sunday);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  const body = await request.json();

  if (body.action === "removeSong") {
    const result = removeSongFromSunday(date, body.songId);
    if (!result) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(result);
  }

  const sunday = { date, ...body };
  const updated = createOrUpdateSunday(sunday);
  return Response.json(updated);
}
