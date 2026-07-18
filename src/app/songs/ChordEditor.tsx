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

const PILL_WIDTH = 7; // approx character-width of a chord pill
const NUDGE_SMALL = 2; // arrow key nudge in chars
const NUDGE_LARGE = 6; // shift+arrow nudge in chars

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
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Picker
  const [picker, setPicker] = useState<{
    lineIndex: number;
    charPos: number;
    editingId: string | null;
  } | null>(null);
  const [customText, setCustomText] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  const emitChange = useCallback(
    (l: string, c: ChordPlacement[], k: string) => onChange(l, c, k),
    [onChange]
  );

  // --- Collision detection ---

  function getOccupied(lineIndex: number, excludeId?: string) {
    return chords
      .filter((c) => c.lineIndex === lineIndex && c.id !== excludeId)
      .map((c) => ({ id: c.id, start: c.position, end: c.position + PILL_WIDTH }))
      .sort((a, b) => a.start - b.start);
  }

  function isOccupied(pos: number, occupied: { start: number; end: number }[]) {
    const newEnd = pos + PILL_WIDTH;
    return occupied.some((r) => pos < r.end && newEnd > r.start);
  }

  function findOpenPosition(lineIndex: number, preferred: number, excludeId?: string): number {
    const occ = getOccupied(lineIndex, excludeId);
    if (occ.length === 0) return Math.max(0, preferred);

    // Try preferred position first
    if (!isOccupied(preferred, occ)) return preferred;

    // Search right for a gap
    for (let try_ = preferred; try_ < 200; try_++) {
      if (!isOccupied(try_, occ)) return try_;
    }

    // Search left
    for (let try_ = preferred - 1; try_ >= 0; try_--) {
      if (!isOccupied(try_, occ)) return try_;
    }

    // Fallback: after last chord
    const last = occ[occ.length - 1];
    return last.end + 1;
  }

  function nudgeChord(id: string, delta: number) {
    const chord = chords.find((c) => c.id === id);
    if (!chord) return;
    const newPos = Math.max(0, chord.position + delta);
    const safePos = findOpenPosition(chord.lineIndex, newPos, id);
    if (safePos === chord.position) return;
    const updated = chords.map((c) => c.id === id ? { ...c, position: safePos } : c);
    setChords(updated);
    emitChange(lyrics, updated, currentKey);
  }

  // --- Close picker on outside click ---

  useEffect(() => {
    if (!picker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPicker(null);
        setShowCustom(false);
        setCustomText("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [picker]);

  // --- Keyboard ---

  useEffect(() => {
    if (readOnly || !selectedId) return;
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in an input/textarea
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        nudgeChord(selectedId, e.shiftKey ? -NUDGE_LARGE : -NUDGE_SMALL);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nudgeChord(selectedId, e.shiftKey ? NUDGE_LARGE : NUDGE_SMALL);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeChord(selectedId);
        setSelectedId(null);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openPickerForChord(selectedId);
      } else if (e.key === "Escape") {
        setSelectedId(null);
        setPicker(null);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selectedId, readOnly, chords, lyrics, currentKey]);

  // --- Lyrics ---

  const handleLyricsChange = (value: string) => {
    setLyrics(value);
    const lineCount = value.split("\n").length;
    const filtered = chords.filter((c) => c.lineIndex < lineCount);
    setChords(filtered);
    emitChange(value, filtered, currentKey);
  };

  // --- Picker ---

  const openPickerForLine = (lineIndex: number, charPos: number) => {
    if (readOnly) return;
    setSelectedId(null);
    setPicker({ lineIndex, charPos, editingId: null });
    setShowCustom(false);
    setCustomText("");
  };

  const openPickerForChord = (chordId: string) => {
    if (readOnly) return;
    const chord = chords.find((c) => c.id === chordId);
    if (!chord) return;
    setSelectedId(chordId);
    setPicker({ lineIndex: chord.lineIndex, charPos: chord.position, editingId: chordId });
    setShowCustom(false);
    setCustomText("");
  };

  const placeChord = (text: string) => {
    if (!picker) return;

    if (picker.editingId) {
      const updated = chords.map((c) =>
        c.id === picker.editingId ? { ...c, chord: text } : c
      );
      setChords(updated);
      emitChange(lyrics, updated, currentKey);
    } else {
      const pos = findOpenPosition(picker.lineIndex, picker.charPos);
      const newChord: ChordPlacement = {
        id: crypto.randomUUID(),
        chord: text,
        position: pos,
        lineIndex: picker.lineIndex,
      };
      const updated = [...chords, newChord];
      setChords(updated);
      emitChange(lyrics, updated, currentKey);
    }

    setPicker(null);
    setShowCustom(false);
    setCustomText("");
  };

  const removeChord = (id: string) => {
    const updated = chords.filter((c) => c.id !== id);
    setChords(updated);
    emitChange(lyrics, updated, currentKey);
    if (picker?.editingId === id) setPicker(null);
  };

  // --- Drag ---

  const dragRef = useRef<{ id: string; startX: number; moved: boolean } | null>(null);

  const handlePointerDown = (e: React.PointerEvent, chordId: string) => {
    if (readOnly) return;
    e.stopPropagation();
    dragRef.current = { id: chordId, startX: e.clientX, moved: false };
    setSelectedId(chordId);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = Math.abs(e.clientX - dragRef.current.startX);
    if (dx > 4) {
      dragRef.current.moved = true;

      const chord = chords.find((c) => c.id === dragRef.current!.id);
      if (!chord) return;

      const lineEl = lineRefs.current[chord.lineIndex];
      if (!lineEl) return;
      const rect = lineEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const rawPos = Math.max(0, Math.round(x / 8));

      // Collision check during drag
      const safePos = findOpenPosition(chord.lineIndex, rawPos, dragRef.current!.id);
      const updated = chords.map((c) =>
        c.id === dragRef.current!.id ? { ...c, position: safePos } : c
      );
      setChords(updated);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const wasDrag = dragRef.current.moved;
    const chordId = dragRef.current.id;
    dragRef.current = null;

    if (!wasDrag) {
      openPickerForChord(chordId);
    } else {
      emitChange(lyrics, chords, currentKey);
    }
  };

  const handleChordRowClick = (e: React.MouseEvent, lineIndex: number) => {
    if (readOnly) return;
    if ((e.target as HTMLElement).closest(".chord-pill")) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const charPos = Math.max(0, Math.round(x / 8));
    openPickerForLine(lineIndex, charPos);
  };

  // --- Transpose ---

  const handleTranspose = (semitones: number) => {
    const newKey = transposeKey(currentKey, semitones);
    const updated = chords.map((c) => ({
      ...c,
      chord: transposeChord(c.chord, semitones, newKey),
    }));
    setCurrentKey(newKey);
    setChords(updated);
    emitChange(lyrics, updated, newKey);
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
              const updated = diff === 0 ? chords : chords.map((c) => ({
                ...c,
                chord: transposeChord(c.chord, diff, newKey),
              }));
              setCurrentKey(newKey);
              setChords(updated);
              emitChange(lyrics, updated, newKey);
            }}
            className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-sm font-medium focus:border-gold focus:ring-1 focus:ring-gold/20 outline-none"
          >
            {KEY_OPTIONS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => handleTranspose(-1)} className="px-3 py-1.5 text-sm font-medium bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors" title="Transpose down 1 semitone">&#9837; Down</button>
          <button onClick={() => handleTranspose(1)} className="px-3 py-1.5 text-sm font-medium bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors" title="Transpose up 1 semitone">&#9838; Up</button>
          <button onClick={() => handleTranspose(-5)} className="px-2 py-1.5 text-xs font-medium text-stone-500 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors" title="Transpose down 5 semitones">-5</button>
          <button onClick={() => handleTranspose(5)} className="px-2 py-1.5 text-xs font-medium text-stone-500 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors" title="Transpose up 5 semitones">+5</button>
        </div>

        <div className="text-xs text-stone-400">
          {chords.length} chord{chords.length !== 1 ? "s" : ""}
          {selectedId && <span className="ml-2 text-gold">selected — arrow keys to nudge</span>}
        </div>
      </div>

      {/* Chord picker popup */}
      {picker && (
        <div ref={pickerRef} className="chord-picker bg-white rounded-xl border border-stone-200 shadow-lg p-3 z-50" style={{ maxWidth: "360px" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-stone-500">
              {picker.editingId ? "Change chord" : `Add chord — Key of ${currentKey}`}
            </span>
            {picker.editingId && (
              <button onClick={() => { removeChord(picker.editingId!); setSelectedId(null); }} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                Remove
              </button>
            )}
          </div>

          {!showCustom ? (
            <>
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
              <button
                onClick={() => setShowCustom(true)}
                className="w-full px-3 py-1.5 text-sm text-stone-500 bg-stone-50 hover:bg-stone-100 rounded-lg transition-colors border border-dashed border-stone-300"
              >
                + Other chord...
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customText.trim()) placeChord(customText.trim());
                  if (e.key === "Escape") { setPicker(null); setShowCustom(false); }
                }}
                placeholder="e.g. Cadd9, D/F#, Gsus4..."
                className="flex-1 px-3 py-1.5 text-sm font-mono bg-white border border-stone-200 rounded-lg focus:border-gold focus:ring-1 focus:ring-gold/20 outline-none"
                autoFocus
              />
              <button
                onClick={() => { if (customText.trim()) placeChord(customText.trim()); }}
                disabled={!customText.trim()}
                className="px-3 py-1.5 text-sm font-medium bg-gold text-white rounded-lg hover:bg-amber-500 disabled:opacity-40 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => { setShowCustom(false); setCustomText(""); }}
                className="px-2 py-1.5 text-sm text-stone-400 hover:text-stone-600 transition-colors"
              >
                ←
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lyrics + Chord editor */}
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
                {chords
                  .filter((c) => c.lineIndex === lineIdx)
                  .map((chord) => (
                    <div
                      key={chord.id}
                      onPointerDown={(e) => handlePointerDown(e, chord.id)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      className={`chord-pill ${selectedId === chord.id ? "selected" : ""}`}
                      style={{ left: `${chord.position * 8}px`, touchAction: "none" }}
                    >
                      <span className="chord-text select-none">{chord.chord}</span>
                      {!readOnly && (
                        <button
                          className="chord-delete"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); removeChord(chord.id); setSelectedId(null); }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}

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
                  <div className="lyric-line font-mono text-sm text-stone-700 whitespace-pre-wrap">{line}</div>
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
