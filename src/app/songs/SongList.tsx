"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Song } from "@/lib/types";

export function SongList({ initialSongs }: { initialSongs: Song[] }) {
  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState(initialSongs);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSearch = (value: string) => {
    setQuery(value);
    startTransition(async () => {
      const res = await fetch(`/api/songs?q=${encodeURIComponent(value)}`);
      const data = await res.json();
      setSongs(data);
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this song?")) return;
    await fetch(`/api/songs/${id}`, { method: "DELETE" });
    setSongs((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search by title or lyrics..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-stone-200 focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all text-sm"
        />
        {isPending && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {songs.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-stone-400">
              <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
          <h3 className="font-display text-lg font-semibold text-stone-600 mb-1">
            {query ? "No songs found" : "No songs yet"}
          </h3>
          <p className="text-stone-400 text-sm mb-4">
            {query ? "Try a different search term" : "Start by adding your first worship song."}
          </p>
          {!query && (
            <Link
              href="/songs/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-white rounded-lg text-sm font-medium hover:bg-amber-500 transition-colors"
            >
              Add a Song
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {songs.map((song) => (
            <div
              key={song.id}
              className="bg-white rounded-xl p-4 sm:p-5 border border-stone-100 hover:border-gold-light hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <Link
                  href={`/songs/${song.id}`}
                  className="flex-1 min-w-0"
                >
                  <h3 className="font-display text-lg font-semibold text-stone-800 group-hover:text-gold transition-colors truncate">
                    {song.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-stone-400">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gold-lighter rounded-full text-amber-700 font-medium">
                      Key: {song.currentKey}
                    </span>
                    {song.editedBy && (
                      <span>by {song.editedBy}</span>
                    )}
                    <span>
                      {song.lyrics.split("\n").filter((l) => l.trim()).length} lines
                    </span>
                  </div>
                </Link>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/songs/${song.id}`}
                    className="px-3 py-1.5 text-xs font-medium text-stone-500 bg-stone-50 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(song.id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
