"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ChordPlacement } from "@/lib/types";
import {
  transposeChord,
  transposeKey,
  semitoneDiff,
  FAMILY_CHART,
} from "@/lib/transpose";

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

const CHORD_PILL_WIDTH_CHARS = 6;

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

  // Picker state
  const [picker, setPicker] = useState<{
    lineIndex: number;
    x: number;
    editingId: string | null;
  } | null>(null);
  const [customChord, setCustomChord] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  const emitChange = useCallback(
    (newLyrics: string, newChords: ChordPlacement[], newKey: string) => {
      onChange(newLyrics, newChords, newKey);
    },
    [onChange]
  );

  // Close picker when clicking outside
  useEffect(() => {
    if (!picker) return;
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPicker(null);
        setShowCustom(false);
        setCustomChord("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [picker]);

  const handleLyricsChange = (value: string) => {
    setLyrics(value);
    const lineCount = value.split("\n").length;
    const filtered = chords.filter((c) => c.lineIndex < lineCount);
    setChords(filtered);
    emitChange(value, filtered, currentKey);
  };

  // Find the nearest non-overlapping position for a new chord on a line
  const findOpenPosition = (lineIndex: number, preferredPos: number): number => {
    const lineChords = chords.filter((c) => c.lineIndex === lineIndex);
    if (lineChords.length === 0) return preferredPos;

    // Check if preferred position overlaps any existing chord
    const overlaps = lineChords.some((c) => {
      const chordStart = c.position;
      const chordEnd = c.position + CHORD_PILL_WIDTH_CHARS;
      const newStart = preferredPos;
      const newEnd = preferredPos + CHORD_PILL_WIDTH_CHARS;
      return newStart < chordEnd && newEnd > chordStart;
    });

    if (!overlaps) return preferredPos;

    // Find next open slot to the right
    const sorted = [...lineChords].sort((a, b) => a.position - b.position);
    for (const c of sorted) {
      const slotEnd = c.position + CHORD_PILL_WIDTH_CHARS;
      const testPos = slotEnd + 1;
      const stillOverlaps = lineChords.some((other) => {
        if (other.id === c.id) return false;
        const otherEnd = other.position + CHORD_PILL_WIDTH_CHARS;
        return testPos < otherEnd && (testPos + CHORD_PILL_WIDTH_CHARS) > other.position;
      });
      if (!stillOverlaps) return testPos;
    }

    // Fallback: place after the last chord
    const lastChord = sorted[sorted.length - 1];
    return lastChord.position + CHORD_PILL_WIDTH_CHARS + 2;
  };

  // Open picker for adding a new chord
  const openPickerForLine = (lineIndex: number, x: number) => {
    if (readOnly) return;
    setPicker({ lineIndex, x, editingId: null });
    setShowCustom(false);
    setCustomChord("");
  };

  // Open picker to edit an existing chord
  const openPickerForChord = (chordId: string) => {
    if (readOnly) return;
    const chord = chords.find((c) => c.id === chordId);
    if (!chord) return;
    setPicker({ lineIndex: chord.lineIndex, x: chord.position * 8, editingId: chordId });
    setShowCustom(false);
    setCustomChord("");
  };

  // Place or update a chord from the picker
  const placeChord = (chordText: string) => {
    if (!picker) return;

    if (picker.editingId) {
      // Updating existing chord
      const newChords = chords.map((c) =>
        c.id === picker.editingId ? { ...c, chord: chordText } : c
      );
      setChords(newChords);
      emitChange(lyrics, newChords, currentKey);
    } else {
      // Adding new chord — find open position
      const charPos = Math.max(0, Math.round(picker.x / 8));
      const position = findOpenPosition(picker.lineIndex, charPos);
      const newChord: ChordPlacement = {
        id: crypto.randomUUID(),
        chord: chordText,
        position,
        lineIndex: picker.lineIndex,
      };
      const newChords = [...chords, newChord];
      setChords(newChords);
      emitChange(lyrics, newChords, currentKey);
    }

    setPicker(null);
    setShowCustom(false);
    setCustomChord("");
  };

  const removeChord = (id: string) => {
    const newChords = chords.filter((c) => c.id !== id);
    setChords(newChords);
    emitChange(lyrics, newChords, currentKey);
    if (picker?.editingId === id) {
      setPicker(null);
    }
  };

  // Drag-and-drop
  const dragRef = useRef<{ id: string; startX: number; moved: boolean } | null>(null);

  const handlePointerDown = (e: React.PointerEvent, chordId: string) => {
    if (readOnly) return;
    dragRef.current = { id: chordId, startX: e.clientX, moved: false };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = Math.abs(e.clientX - dragRef.current.startX);
    if (dx > 4) {
      dragRef.current.moved = true;
      setDraggingId(dragRef.current.id);

      // Find which line we're over
      const chord = chords.find((c) => c.id === dragRef.current!.id);
      if (!chord) return;

      // Calculate new position based on mouse
      const lineEl = lineRefs.current[chord.lineIndex];
      if (!lineEl) return;
      const rect = lineEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const charPos = Math.max(0, Math.round(x / 8));

      const newChords = chords.map((c) =>
        c.id === dragRef.current!.id ? { ...c, position: charPos } : c
      );
      setChords(newChords);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const wasDrag = dragRef.current.moved;
    const chordId = dragRef.current.id;
    dragRef.current = null;
    setDraggingId(null);

    if (!wasDrag) {
      // It was a click, not a drag — open picker
      openPickerForChord(chordId);
    } else {
      // Finished dragging — emit final state
      emitChange(lyrics, chords, currentKey);
    }
  };

  const handleChordRowClick = (e: React.MouseEvent, lineIndex: number) => {
    if (readOnly) return;
    // Only open picker if clicking on empty space (not on a chord pill)
    const target = e.target as HTMLElement;
    if (target.closest(".chord-pill")) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    openPickerForLine(lineIndex, x);
  };

  const handleTranspose = (semitones: number) => {
    const newKey = transposeKey(currentKey, semitones);
    const newChords = chords.map((c) => ({
      ...c,
      chord: transposeChord(c.chord, semitones, newKey),
    }));
    setCurrentKey(newKey);
    setChords(newChords);
    emitChange(lyrics, newChords, newKey);
  };

  const diatonicChords = FAMILY_CHART[currentKey] || FAMILY_CHART["C"];
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
              const newKey = e.target.value;
              const diff = semitoneDiff(currentKey, newKey);
              const newChords = diff === 0 ? chords : chords.map((c) => ({
                ...c,
                chord: transposeChord(c.chord, diff, newKey),
              }));
              setCurrentKey(newKey);
              setChords(newChords);
              emitChange(lyrics, newChords, newKey);
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
          >
            &#9837; Down
          </button>
          <button
            onClick={() => handleTranspose(1)}
            className="px-3 py-1.5 text-sm font-medium bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
          >
            &#9838; Up
          </button>
          <button
            onClick={() => handleTranspose(-5)}
            className="px-2 py-1.5 text-xs font-medium text-stone-500 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
          >
            -5
          </button>
          <button
            onClick={() => handleTranspose(5)}
            className="px-2 py-1.5 text-xs font-medium text-stone-500 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
          >
            +5
          </button>
        </div>

        <div className="text-xs text-stone-400">
          {chords.length} chord{chords.length !== 1 ? "s" : ""} placed
        </div>
      </div>

      {/* Chord picker popup */}
      {picker && (
        <div
          ref={pickerRef}
          className="chord-picker bg-white rounded-xl border border-stone-200 shadow-lg p-3 z-50"
          style={{ maxWidth: "360px" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-stone-500">
              {picker.editingId ? "Change chord" : `Add chord — Key of ${currentKey}`}
            </span>
            {picker.editingId && (
              <button
                onClick={() => {
                  removeChord(picker.editingId!);
                }}
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                Remove
              </button>
            )}
          </div>

          {!showCustom ? (
            <>
              {/* Diatonic chords */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {diatonicChords.map((ch) => (
                  <button
                    key={ch}
                    onClick={() => placeChord(ch)}
                    className="px-3 py-1.5 text-sm font-semibold font-mono bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition-colors border border-amber-200/50"
                  >
                    {ch}
                  </button>
                ))}
              </div>

              {/* Other / custom chord button */}
              <button
                onClick={() => setShowCustom(true)}
                className="w-full px-3 py-1.5 text-sm text-stone-500 bg-stone-50 hover:bg-stone-100 rounded-lg transition-colors border border-dashed border-stone-300"
              >
                + Other chord...
              </button>
            </>
          ) : (
            /* Custom chord input */
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customChord}
                onChange={(e) => setCustomChord(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customChord.trim()) {
                    placeChord(customChord.trim());
                  }
                  if (e.key === "Escape") {
                    setPicker(null);
                    setShowCustom(false);
                  }
                }}
                placeholder="e.g. Cadd9, D/F#, Gsus4..."
                className="flex-1 px-3 py-1.5 text-sm font-mono bg-white border border-stone-200 rounded-lg focus:border-gold focus:ring-1 focus:ring-gold/20 outline-none"
                autoFocus
              />
              <button
                onClick={() => {
                  if (customChord.trim()) placeChord(customChord.trim());
                }}
                disabled={!customChord.trim()}
                className="px-3 py-1.5 text-sm font-medium bg-gold text-white rounded-lg hover:bg-amber-500 disabled:opacity-40 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowCustom(false);
                  setCustomChord("");
                }}
                className="px-2 py-1.5 text-sm text-stone-400 hover:text-stone-600 transition-colors"
              >
                ←
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lyrics + Chord editor area */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="p-1 sm:p-2">
          {lines.map((line, lineIdx) => (
            <div key={lineIdx} className="group/line">
              {/* Chord row */}
              <div
                ref={(el) => { lineRefs.current[lineIdx] = el; }}
                className="relative min-h-[1.75rem] px-3 py-0.5 border-b border-dashed border-stone-100 cursor-crosshair"
                onClick={(e) => handleChordRowClick(e, lineIdx)}
              >
                {/* Placed chords */}
                {chords
                  .filter((c) => c.lineIndex === lineIdx)
                  .map((chord) => (
                    <div
                      key={chord.id}
                      onPointerDown={(e) => handlePointerDown(e, chord.id)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      className={`chord-pill ${draggingId === chord.id ? "dragging" : ""} ${picker?.editingId === chord.id ? "ring-2 ring-gold" : ""}`}
                      style={{
                        left: `${chord.position * 8}px`,
                        touchAction: "none",
                      }}
                    >
                      <span className="chord-text select-none">
                        {chord.chord}
                      </span>

                      {!readOnly && (
                        <button
                          className="chord-delete"
                          onPointerDown={(e) => e.stopPropagation()}
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

                {/* Hint when empty */}
                {chords.filter((c) => c.lineIndex === lineIdx).length === 0 && !readOnly && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-stone-300 opacity-0 group-hover/line:opacity-100 transition-opacity pointer-events-none">
                    click to add chord
                  </div>
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
