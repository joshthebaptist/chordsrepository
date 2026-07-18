"use client";

import { ChordPlacement } from "@/lib/types";
import { transposeChord, semitoneDiff } from "@/lib/transpose";

interface SongChordViewProps {
  lyrics: string;
  chords: ChordPlacement[];
  originalKey: string;
  displayKey: string;
}

export function SongChordView({
  lyrics,
  chords,
  originalKey,
  displayKey,
}: SongChordViewProps) {
  const diff = semitoneDiff(originalKey, displayKey);

  const transposedChords = diff === 0
    ? chords
    : chords.map((c) => ({
        ...c,
        chord: transposeChord(c.chord, diff, displayKey),
      }));

  const lines = lyrics.split("\n");

  return (
    <div className="space-y-0">
      {lines.map((line, lineIdx) => {
        const lineChords = transposedChords.filter((c) => c.lineIndex === lineIdx);
        return (
          <div key={lineIdx}>
            {/* Chord row */}
            <div className="relative min-h-[1.5rem]">
              {lineChords.map((chord) => (
                <span
                  key={chord.id}
                  className="chord-pill print:shadow-none print:border print:border-stone-400"
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
  );
}
