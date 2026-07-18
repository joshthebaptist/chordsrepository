"use client";

import { useState } from "react";
import { SongSection, ChordPlacement } from "@/lib/types";
import { transposeChord, semitoneDiff } from "@/lib/transpose";

interface SongChordViewProps {
  sections: SongSection[];
  originalKey: string;
  displayKey: string;
}

export function SongChordView({ sections, originalKey, displayKey }: SongChordViewProps) {
  const diff = semitoneDiff(originalKey, displayKey);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const transpose = (chords: ChordPlacement[]) =>
    diff === 0 ? chords : chords.map((c) => ({ ...c, chord: transposeChord(c.chord, diff, displayKey) }));

  const leftSections = sections.filter((s) => s.type === "verse");
  const rightSections = sections.filter((s) => s.type !== "verse");

  function renderSection(sec: SongSection) {
    const isCollapsed = collapsed[sec.id];
    const chords = transpose(sec.chords);
    const lines = sec.lyrics.split("\n");

    return (
      <div key={sec.id} className="mb-4">
        <div
          className="flex items-center gap-2 mb-1 cursor-pointer select-none"
          onClick={() => setCollapsed((c) => ({ ...c, [sec.id]: !c[sec.id] }))}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            className={`text-stone-400 transition-transform ${isCollapsed ? "" : "rotate-90"}`}>
            <path d="M9 18l6-6-6-6" />
          </svg>
          <h4 className="font-display text-sm font-bold text-stone-600 uppercase tracking-wide">{sec.label}</h4>
        </div>

        {!isCollapsed && (
          <div className="ml-3">
            {lines.map((line, lineIdx) => {
              const lineChords = chords.filter((c) => c.lineIndex === lineIdx);
              return (
                <div key={lineIdx}>
                  <div className="relative min-h-[1.2rem]">
                    {lineChords.map((chord) => (
                      <span key={chord.id} className="chord-pill" style={{ left: `${chord.position * 8}px` }}>
                        {chord.chord}
                      </span>
                    ))}
                  </div>
                  <div className="lyric-line font-mono text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
                    {line || "\u00A0"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
      <div>
        {leftSections.map(renderSection)}
      </div>
      <div>
        {rightSections.map(renderSection)}
      </div>
    </div>
  );
}
