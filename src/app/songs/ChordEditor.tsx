"use client";

import { useState, useRef, useCallback } from "react";
import { ChordPlacement } from "@/lib/types";
import { transposeChord, transposeKey } from "@/lib/transpose";

interface ChordEditorProps {
  initialLyrics: string;
  initialChords: ChordPlacement[];
  initialKey: string;
  onChange: (lyrics: string, chords: ChordPlacement[], currentKey: string) => void;
  readOnly?: boolean;
}

const KEY_OPTIONS = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
  "Db", "Eb", "Gb", "Ab", "Bb",
];

export function ChordEditor({
  initialLyrics,
  initialChords,
  initialKey,
  onChange,
  readOnly = false,
}: ChordEditorProps) {
  const [lyrics, setLyrics] = useState(initialLyrics);
  const [chords, setChords] = useState<ChordPlacement[]>(initialChords);
  const [currentKey, setCurrentKey] = useState(initialKey);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [editingChordId, setEditingChordId] = useState<string | null>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  const emitChange = useCallback(
    (newLyrics: string, newChords: ChordPlacement[], newKey: string) => {
      onChange(newLyrics, newChords, newKey);
    },
    [onChange]
  );

  const handleLyricsChange = (value: string) => {
    setLyrics(value);
    // Remove chords that reference lines that no longer exist
    const lineCount = value.split("\n").length;
    const filtered = chords.filter((c) => c.lineIndex < lineCount);
    setChords(filtered);
    emitChange(value, filtered, currentKey);
  };

  const addChord = (lineIndex: number) => {
    if (readOnly) return;
    const newChord: ChordPlacement = {
      id: crypto.randomUUID(),
      chord: "C",
      position: 0,
      lineIndex,
    };
    const newChords = [...chords, newChord];
    setChords(newChords);
    setEditingChordId(newChord.id);
    emitChange(lyrics, newChords, currentKey);
  };

  const updateChord = (id: string, updates: Partial<ChordPlacement>) => {
    const newChords = chords.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
    setChords(newChords);
    emitChange(lyrics, newChords, currentKey);
  };

  const removeChord = (id: string) => {
    const newChords = chords.filter((c) => c.id !== id);
    setChords(newChords);
    emitChange(lyrics, newChords, currentKey);
  };

  const handleDragStart = (e: React.DragEvent, chordId: string) => {
    if (readOnly) return;
    setDraggingId(chordId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", chordId);
  };

  const handleDragOver = (e: React.DragEvent, lineIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, lineIndex: number) => {
    e.preventDefault();
    const chordId = e.dataTransfer.getData("text/plain");
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Calculate character position from x coordinate
    // Approximate: each character is ~8px wide at font-size 14px
    const charWidth = 8;
    const position = Math.max(0, Math.round(x / charWidth));

    updateChord(chordId, { lineIndex, position });
    setDraggingId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const handleTranspose = (semitones: number) => {
    const newKey = transposeKey(currentKey, semitones);
    const newChords = chords.map((c) => ({
      ...c,
      chord: transposeChord(c.chord, semitones),
    }));
    setCurrentKey(newKey);
    setChords(newChords);
    emitChange(lyrics, newChords, newKey);
  };

  const lines = lyrics.split("\n");

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Key</label>
          <select
            value={currentKey}
            onChange={(e) => {
              setCurrentKey(e.target.value);
              emitChange(lyrics, chords, e.target.value);
            }}
            className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-sm font-medium focus:border-gold focus:ring-1 focus:ring-gold/20 outline-none"
          >
            {KEY_OPTIONS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handleTranspose(-1)}
            className="px-3 py-1.5 text-sm font-medium bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
            title="Transpose down 1 semitone"
          >
            &#9837; Down
          </button>
          <button
            onClick={() => handleTranspose(1)}
            className="px-3 py-1.5 text-sm font-medium bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
            title="Transpose up 1 semitone"
          >
            &#9838; Up
          </button>
          <button
            onClick={() => handleTranspose(-5)}
            className="px-2 py-1.5 text-xs font-medium text-stone-500 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
            title="Transpose down 5 semitones (e.g. G -> C)"
          >
            -5
          </button>
          <button
            onClick={() => handleTranspose(5)}
            className="px-2 py-1.5 text-xs font-medium text-stone-500 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
            title="Transpose up 5 semitones (e.g. C -> G)"
          >
            +5
          </button>
        </div>

        <div className="text-xs text-stone-400">
          {chords.length} chord{chords.length !== 1 ? "s" : ""} placed
        </div>
      </div>

      {/* Lyrics + Chord editor area */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="p-1 sm:p-2">
          {lines.map((line, lineIdx) => (
            <div
              key={lineIdx}
              className="group/line"
            >
              {/* Chord row - thin strip above lyrics */}
              <div
                ref={(el) => { lineRefs.current[lineIdx] = el; }}
                className="relative min-h-[1.75rem] flex items-end px-3 py-0.5 border-b border-dashed border-stone-100"
                onDragOver={(e) => handleDragOver(e, lineIdx)}
                onDrop={(e) => handleDrop(e, lineIdx)}
              >
                {/* Placed chords */}
                {chords
                  .filter((c) => c.lineIndex === lineIdx)
                  .map((chord) => (
                    <div
                      key={chord.id}
                      draggable={!readOnly}
                      onDragStart={(e) => handleDragStart(e, chord.id)}
                      onDragEnd={handleDragEnd}
                      className={`chord-pill ${draggingId === chord.id ? "dragging" : ""}`}
                      style={{ left: `${chord.position * 8}px` }}
                    >
                      {editingChordId === chord.id ? (
                        <input
                          type="text"
                          value={chord.chord}
                          onChange={(e) => updateChord(chord.id, { chord: e.target.value })}
                          onBlur={() => setEditingChordId(null)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setEditingChordId(null);
                          }}
                          className="chord-text bg-transparent border-none outline-none w-12 text-center text-xs font-mono font-semibold"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="chord-text cursor-pointer"
                          onClick={() => !readOnly && setEditingChordId(chord.id)}
                        >
                          {chord.chord}
                        </span>
                      )}
                      {!readOnly && (
                        <button
                          className="chord-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeChord(chord.id);
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}

                {/* Add chord button (appears on hover) */}
                {!readOnly && (
                  <button
                    onClick={() => addChord(lineIdx)}
                    className="print-hide absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-stone-100 hover:bg-gold-lighter text-stone-400 hover:text-gold text-xs flex items-center justify-center opacity-0 group-hover/line:opacity-100 transition-opacity"
                    title="Add chord to this line"
                  >
                    +
                  </button>
                )}
              </div>

              {/* Lyric line */}
              <div className="px-3 py-1.5">
                {line.trim() === "" ? (
                  <div className="h-5" />
                ) : (
                  <div className="lyric-line font-mono text-sm text-stone-700 whitespace-pre-wrap">
                    {line}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lyrics textarea */}
      {!readOnly && (
        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
            Lyrics (edit text below, then place chords above)
          </label>
          <textarea
            value={lyrics}
            onChange={(e) => handleLyricsChange(e.target.value)}
            placeholder="Paste or type your lyrics here, one line per line..."
            className="w-full h-48 px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm font-mono text-stone-700 focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all resize-y"
          />
        </div>
      )}
    </div>
  );
}
