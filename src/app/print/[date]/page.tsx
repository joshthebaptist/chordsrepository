"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Song, Sunday } from "@/lib/types";
import { formatDateDisplay } from "@/lib/dates";
import { SongChordView } from "@/app/songs/SongChordView";

interface PrintSong extends Song {
  displayKey: string;
}

export default function PrintPage() {
  const params = useParams();
  const date = params.date as string;
  const [songs, setSongs] = useState<PrintSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);

  const { full } = formatDateDisplay(date);

  useEffect(() => {
    async function load() {
      const [sundayRes, songsRes] = await Promise.all([
        fetch(`/api/sundays/${date}`),
        fetch("/api/songs"),
      ]);
      const sunday: Sunday = await sundayRes.json();
      const allSongs: Song[] = await songsRes.json();

      const printSongs: PrintSong[] = sunday.songs
        .map((ss) => {
          const song = allSongs.find((s) => s.id === ss.songId);
          if (!song) return null;
          return {
            ...song,
            displayKey: ss.keyOverride,
          };
        })
        .filter(Boolean) as PrintSong[];

      setSongs(printSongs);
      setLoading(false);
    }
    load();
  }, [date]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="print-view max-w-3xl mx-auto">
      {/* Controls (hidden in print) */}
      {showControls && (
        <div className="print-hide mb-8 flex items-center justify-between bg-white rounded-xl p-4 border border-stone-200">
          <div>
            <h1 className="font-display text-xl font-bold text-stone-800">
              Print Preview
            </h1>
            <p className="text-sm text-stone-500">{full}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-amber-500 text-white rounded-xl font-medium shadow-sm hover:shadow-md transition-all text-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="6,9 6,2 18,2 18,9"/>
                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print Chord Sheet
            </button>
            <button
              onClick={() => setShowControls(false)}
              className="px-4 py-2 text-sm text-stone-500 bg-stone-50 hover:bg-stone-100 rounded-xl transition-colors"
            >
              Preview Only
            </button>
          </div>
        </div>
      )}

      {!showControls && (
        <div className="print-hide mb-4 text-center">
          <button
            onClick={() => setShowControls(true)}
            className="text-sm text-stone-400 hover:text-stone-600"
          >
            Show controls
          </button>
        </div>
      )}

      {/* Header for print */}
      <div className="print-header text-center mb-8 pb-4 border-b-2 border-stone-200">
        <h1 className="font-display text-3xl font-bold text-stone-800">
          Worship Service
        </h1>
        <p className="text-stone-500 mt-1">{full}</p>
      </div>

      {/* Songs */}
      {songs.map((song, i) => (
        <div key={song.id} className="song-block mb-10 pb-8 border-b border-stone-200 last:border-0">
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-sm font-bold text-stone-400">{i + 1}.</span>
            <h2 className="font-display text-2xl font-bold text-stone-800">
              {song.title}
            </h2>
            <span className="text-sm text-stone-500 font-medium">
              Key: {song.displayKey}
            </span>
          </div>

          <SongChordView
            lyrics={song.lyrics}
            chords={song.chords}
            originalKey={song.currentKey}
            displayKey={song.displayKey}
          />
        </div>
      ))}

      {songs.length === 0 && (
        <div className="text-center py-16">
          <p className="text-stone-400">No songs in this service.</p>
        </div>
      )}
    </div>
  );
}
