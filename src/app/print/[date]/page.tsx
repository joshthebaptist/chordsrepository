"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Song, Sunday, ChordPlacement } from "@/lib/types";
import { formatDateDisplay } from "@/lib/dates";
import { transposeChord } from "@/lib/transpose";

interface PrintSong extends Song {
  transposedKey: string;
  transposedChords: ChordPlacement[];
}

function SongForPrint({ song }: { song: PrintSong }) {
  const lines = song.lyrics.split("\n");

  return (
    <div className="song-block mb-8">
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="font-display text-2xl font-bold text-stone-800">
          {song.title}
        </h2>
        <span className="text-sm text-stone-500 font-medium">
          Key: {song.transposedKey}
        </span>
      </div>

      <div className="space-y-0">
        {lines.map((line, lineIdx) => {
          const lineChords = song.transposedChords.filter(
            (c) => c.lineIndex === lineIdx
          );
          return (
            <div key={lineIdx}>
              {/* Chord row */}
              <div className="chord-row relative min-h-[1.5rem]">
                {lineChords.map((chord) => (
                  <span
                    key={chord.id}
                    className="chord-pill"
                    style={{ left: `${chord.position * 8}px` }}
                  >
                    {chord.chord}
                  </span>
                ))}
              </div>
              {/* Lyric line */}
              <div className="lyric-line font-mono text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
                {line || "\u00A0"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
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

          // Calculate transposition difference
          const keyDiff = getKeyDiff(song.currentKey, ss.keyOverride);
          const transposedChords = song.chords.map((c) => ({
            ...c,
            chord: keyDiff === 0 ? c.chord : transposeChord(c.chord, keyDiff),
          }));

          return {
            ...song,
            transposedKey: ss.keyOverride,
            transposedChords,
          };
        })
        .filter(Boolean) as PrintSong[];

      setSongs(printSongs);
      setLoading(false);
    }
    load();
  }, [date]);

  function getKeyDiff(from: string, to: string): number {
    const keys = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const fromIdx = keys.indexOf(from);
    const toIdx = keys.indexOf(to);
    if (fromIdx === -1 || toIdx === -1) return 0;
    return (toIdx - fromIdx + 12) % 12;
  }

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
      <div className="text-center mb-8 pb-4 border-b-2 border-stone-200">
        <h1 className="font-display text-3xl font-bold text-stone-800">
          Worship Service
        </h1>
        <p className="text-stone-500 mt-1">{full}</p>
      </div>

      {/* Songs */}
      {songs.map((song) => (
        <SongForPrint key={song.id} song={song} />
      ))}

      {songs.length === 0 && (
        <div className="text-center py-16">
          <p className="text-stone-400">No songs in this service.</p>
        </div>
      )}
    </div>
  );
}
