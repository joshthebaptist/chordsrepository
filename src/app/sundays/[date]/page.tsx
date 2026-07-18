"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Song, Sunday, SundaySong } from "@/lib/types";
import { formatDateDisplay } from "@/lib/dates";
import { transposeKey } from "@/lib/transpose";

export default function SundayDetailPage() {
  const router = useRouter();
  const params = useParams();
  const date = params.date as string;

  const [sunday, setSunday] = useState<Sunday | null>(null);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  const { day, month, year, full } = formatDateDisplay(date);

  const loadData = useCallback(async () => {
    const [sundayRes, songsRes] = await Promise.all([
      fetch(`/api/sundays/${date}`),
      fetch("/api/songs"),
    ]);
    const sundayData = await sundayRes.json();
    const songsData = await songsRes.json();
    setSunday(sundayData);
    setAllSongs(songsData);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    const res = await fetch(`/api/songs?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setSearchResults(data);
  };

  const addSongToSunday = async (songId: string) => {
    const song = allSongs.find((s) => s.id === songId);
    if (!song) return;

    const res = await fetch("/api/sundays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "addSong",
        date,
        songId,
        keyOverride: song.currentKey,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSunday(updated);
      setShowSearch(false);
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  const removeSongFromSunday = async (songId: string) => {
    const res = await fetch(`/api/sundays/${date}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "removeSong", songId }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSunday(updated);
    }
  };

  const transposeSundaySong = async (songId: string, semitones: number) => {
    if (!sunday) return;
    const ss = sunday.songs.find((s) => s.songId === songId);
    if (!ss) return;
    const newKey = transposeKey(ss.keyOverride, semitones);
    const res = await fetch("/api/sundays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "addSong",
        date,
        songId,
        keyOverride: newKey,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSunday(updated);
    }
  };

  const moveSong = async (songId: string, direction: -1 | 1) => {
    if (!sunday) return;
    const songs = [...sunday.songs];
    const idx = songs.findIndex((s) => s.songId === songId);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= songs.length) return;
    [songs[idx], songs[newIdx]] = [songs[newIdx], songs[idx]];
    songs.forEach((s, i) => (s.order = i));
    const res = await fetch(`/api/sundays/${date}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songs }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSunday(updated);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sundaySongs = sunday?.songs || [];
  const availableSongs = allSongs.filter(
    (s) => !sundaySongs.some((ss) => ss.songId === s.id)
  );

  const filteredAvailable = searchQuery
    ? availableSongs.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.lyrics.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableSongs;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/sundays")}
            className="text-sm text-stone-400 hover:text-stone-600 transition-colors mb-2 inline-flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Sundays
          </button>
          <h1 className="font-display text-3xl font-bold text-stone-800">
            {full}
          </h1>
          <p className="text-stone-500 mt-1">
            {sundaySongs.length} song{sundaySongs.length !== 1 ? "s" : ""} in this service
          </p>
        </div>

        {sundaySongs.length > 0 && (
          <Link
            href={`/print/${date}`}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-600 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="6,9 6,2 18,2 18,9"/>
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print
          </Link>
        )}
      </div>

      {/* Songs in service */}
      {sundaySongs.length > 0 && (
        <div className="space-y-3">
          {sundaySongs.map((ss, i) => {
            const song = allSongs.find((s) => s.id === ss.songId);
            if (!song) return null;
            return (
              <div
                key={ss.songId}
                className="bg-white rounded-xl p-4 border border-stone-100"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-gold-lighter text-amber-700 text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-semibold text-stone-800 truncate">
                        {song.title}
                      </h3>
                      <span className="text-xs px-2 py-0.5 bg-gold-lighter rounded-full text-amber-700 font-medium shrink-0">
                        Key: {ss.keyOverride}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Library key: {song.currentKey}
                      {song.editedBy && ` · Edited by ${song.editedBy}`}
                    </p>

                    {/* Quick chord preview */}
                    <div className="mt-3 text-xs text-stone-500 bg-stone-50 rounded-lg p-3 max-h-24 overflow-hidden">
                      {song.lyrics.split("\n").slice(0, 6).map((line, li) => (
                        <div key={li} className="font-mono leading-relaxed">
                          {line || "\u00A0"}
                        </div>
                      ))}
                      {song.lyrics.split("\n").length > 6 && (
                        <div className="text-stone-400 italic">...more lines</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => moveSong(ss.songId, -1)}
                      disabled={i === 0}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-50 disabled:opacity-30 transition-colors"
                      title="Move up"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 15l-6-6-6 6"/></svg>
                    </button>
                    <button
                      onClick={() => moveSong(ss.songId, 1)}
                      disabled={i === sundaySongs.length - 1}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-50 disabled:opacity-30 transition-colors"
                      title="Move down"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                    <button
                      onClick={() => transposeSundaySong(ss.songId, -1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors text-xs"
                      title="Transpose down"
                    >
                      ♭
                    </button>
                    <button
                      onClick={() => transposeSundaySong(ss.songId, 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors text-xs"
                      title="Transpose up"
                    >
                      ♮
                    </button>
                    <Link
                      href={`/songs/${song.id}`}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-gold hover:bg-gold-lighter transition-colors"
                      title="Edit in library"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </Link>
                    <button
                      onClick={() => removeSongFromSunday(ss.songId)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Remove from service"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add song section */}
      <div className="bg-white/60 rounded-2xl border border-dashed border-stone-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-stone-700">
            Add Song to Service
          </h2>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gold to-amber-500 text-white rounded-xl text-sm font-medium shadow-sm hover:shadow-md transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            {showSearch ? "Cancel" : "Add Song"}
          </button>
        </div>

        {showSearch && (
          <div className="space-y-3">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search songs by title or lyrics..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all"
                autoFocus
              />
            </div>

            {filteredAvailable.length > 0 && (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {filteredAvailable.map((song) => (
                  <button
                    key={song.id}
                    onClick={() => addSongToSunday(song.id)}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-gold-lighter transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-stone-800 group-hover:text-gold transition-colors">
                          {song.title}
                        </span>
                        <span className="text-xs text-stone-400 ml-2">
                          Key: {song.currentKey}
                        </span>
                      </div>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-stone-300 group-hover:text-gold transition-colors"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchQuery && filteredAvailable.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-stone-400">
                  No available songs match your search.
                </p>
                <Link
                  href="/songs/new"
                  className="inline-flex items-center gap-1 text-sm text-gold hover:text-amber-600 mt-2"
                >
                  Create a new song
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
