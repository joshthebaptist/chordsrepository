import { NextRequest } from "next/server";
import { getAllSongs, createSong, searchSongs } from "@/lib/store";
import { Song } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const songs = q ? searchSongs(q) : getAllSongs();
  return Response.json(songs);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const now = new Date().toISOString();
  const song: Song = {
    id: crypto.randomUUID(),
    title: body.title || "Untitled",
    lyrics: body.lyrics || "",
    chords: body.chords || [],
    currentKey: body.currentKey || "C",
    editedBy: body.editedBy || "",
    createdAt: now,
    updatedAt: now,
  };
  const created = createSong(song);
  return Response.json(created, { status: 201 });
}
