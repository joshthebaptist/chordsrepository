import Link from "next/link";
import { getAllSongs } from "@/lib/store";
import { SongList } from "./SongList";

export const dynamic = "force-dynamic";

export default async function SongsPage() {
  const songs = getAllSongs();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-stone-800">
            Song Library
          </h1>
          <p className="text-stone-500 mt-1">
            {songs.length} song{songs.length !== 1 ? "s" : ""} in your library
          </p>
        </div>
        <Link
          href="/songs/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-amber-500 text-white rounded-xl font-medium shadow-sm hover:shadow-md transition-all duration-200 text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New Song
        </Link>
      </div>

      <SongList initialSongs={songs} />
    </div>
  );
}
