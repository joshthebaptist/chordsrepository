"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { SongSection, ChordPlacement, SectionType } from "@/lib/types";
import {
  transposeChord,
  transposeKey,
  semitoneDiff,
  FAMILY_CHART,
} from "@/lib/transpose";

interface ChordEditorProps {
  initialSections: SongSection[];
  initialKey: string;
  onChange: (sections: SongSection[], currentKey: string) => void;
  readOnly?: boolean;
}

const KEY_OPTIONS = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
  "Db", "Eb", "Gb", "Ab", "Bb",
];

const PILL_WIDTH = 7;
const NUDGE_SMALL = 2;
const NUDGE_LARGE = 6;

let sectionCounter = 0;
function makeSectionId() { return `sec-${Date.now()}-${++sectionCounter}`; }
function makeChordId() { return `chr-${Date.now()}-${++sectionCounter}`; }

function getVerse1(sections: SongSection[]): SongSection | undefined {
  return sections.find((s) => s.type === "verse" && s.label === "Verse 1");
}

function syncChordsFromVerse1(sections: SongSection[], overrides: Set<string>): SongSection[] {
  const verse1 = getVerse1(sections);
  if (!verse1) return sections;

  return sections.map((s) => {
    if (s.type !== "verse" || s.id === verse1.id) return s;

    const migratedChords = s.chords.map((c) => {
      if (c.sourceIndex !== undefined) return c;
      const v1LineChords = verse1.chords
        .filter((vc) => vc.lineIndex === c.lineIndex)
        .sort((a, b) => a.position - b.position);
      const sameLine = s.chords
        .filter((sc) => sc.lineIndex === c.lineIndex)
        .sort((a, b) => a.position - b.position);
      const idx = sameLine.indexOf(c);
      return { ...c, sourceIndex: idx < v1LineChords.length ? idx : undefined };
    });

    const newChords: ChordPlacement[] = [];
    const verse1Lines = verse1.lyrics.split("\n");

    for (let lineIdx = 0; lineIdx < verse1Lines.length; lineIdx++) {
      const v1LineChords = verse1.chords
        .filter((c) => c.lineIndex === lineIdx)
        .sort((a, b) => a.position - b.position);

      for (let i = 0; i < v1LineChords.length; i++) {
        const v1c = v1LineChords[i];
        const overrideKey = `${s.id}:${lineIdx}:${i}`;
        if (overrides.has(overrideKey)) continue;

        const existing = migratedChords.find((c) => c.lineIndex === lineIdx && c.sourceIndex === i);

        if (existing) {
          newChords.push({ ...existing, chord: v1c.chord });
        } else {
          newChords.push({
            id: makeChordId(),
            chord: v1c.chord,
            position: v1c.position,
            lineIndex: lineIdx,
            sourceIndex: i,
          });
        }
      }
    }

    for (const c of migratedChords) {
      if (!newChords.some((n) => n.id === c.id)) {
        newChords.push(c);
      }
    }

    return { ...s, chords: newChords };
  });
}

export function ChordEditor({ initialSections, initialKey, onChange, readOnly = false }: ChordEditorProps) {
  const [sections, setSections] = useState<SongSection[]>(
    initialSections.length > 0 ? initialSections : []
  );
  const [currentKey, setCurrentKey] = useState(initialKey);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const overridesRef = useRef<Set<string>>(new Set());

  const [picker, setPicker] = useState<{ sectionId: string; lineIndex: number; charPos: number; editingId: string | null } | null>(null);
  const [customText, setCustomText] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const emitChange = useCallback(
    (s: SongSection[], k: string) => onChange(s, k),
    [onChange]
  );

  const applyUpdate = useCallback((newSections: SongSection[]) => {
    const synced = syncChordsFromVerse1(newSections, overridesRef.current);
    setSections(synced);
    emitChange(synced, currentKey);
  }, [currentKey, emitChange]);

  const updateSections = useCallback((newSections: SongSection[], skipSync = false) => {
    if (skipSync) {
      setSections(newSections);
      emitChange(newSections, currentKey);
    } else {
      applyUpdate(newSections);
    }
  }, [currentKey, emitChange, applyUpdate]);

  // --- Collision detection ---

  function getOccupied(sectionId: string, excludeId?: string, lineIndex?: number) {
    const sec = sections.find((s) => s.id === sectionId);
    if (!sec) return [];
    return sec.chords
      .filter((c) => c.id !== excludeId && (lineIndex === undefined || c.lineIndex === lineIndex))
      .map((c) => ({ id: c.id, start: c.position, end: c.position + PILL_WIDTH }))
      .sort((a, b) => a.start - b.start);
  }

  function isOccupied(pos: number, occupied: { start: number; end: number }[]) {
    const newEnd = pos + PILL_WIDTH;
    return occupied.some((r) => pos < r.end && newEnd > r.start);
  }

  function findOpenPosition(sectionId: string, preferred: number, excludeId?: string, lineIndex?: number): number {
    const occ = getOccupied(sectionId, excludeId, lineIndex);
    if (occ.length === 0) return Math.max(0, preferred);
    if (!isOccupied(preferred, occ)) return preferred;
    for (let try_ = preferred; try_ < 200; try_++) {
      if (!isOccupied(try_, occ)) return try_;
    }
    for (let try_ = preferred - 1; try_ >= 0; try_--) {
      if (!isOccupied(try_, occ)) return try_;
    }
    const last = occ[occ.length - 1];
    return last.end + 1;
  }

  function isVerse1(sectionId: string): boolean {
    const sec = sections.find((s) => s.id === sectionId);
    return sec?.type === "verse" && sec?.label === "Verse 1";
  }

  function updateChord(sectionId: string, chordId: string, patch: Partial<ChordPlacement>) {
    const updated = sections.map((s) => {
      if (s.id !== sectionId) return s;
      return { ...s, chords: s.chords.map((c) => c.id === chordId ? { ...c, ...patch } : c) };
    });
    updateSections(updated);
  }

  function removeChord(sectionId: string, chordId: string) {
    if (!isVerse1(sectionId)) {
      const sec = sections.find((s) => s.id === sectionId);
      const chord = sec?.chords.find((c) => c.id === chordId);
      if (chord && chord.sourceIndex !== undefined) {
        overridesRef.current.add(`${sectionId}:${chord.lineIndex}:${chord.sourceIndex}`);
      }
    }

    const updated = sections.map((s) => {
      if (s.id !== sectionId) return s;
      return { ...s, chords: s.chords.filter((c) => c.id !== chordId) };
    });
    updateSections(updated);
    if (picker?.editingId === chordId) setPicker(null);
  }

  function nudgeChord(sectionId: string, chordId: string, delta: number) {
    const sec = sections.find((s) => s.id === sectionId);
    if (!sec) return;
    const chord = sec.chords.find((c) => c.id === chordId);
    if (!chord) return;

    const newPos = Math.max(0, chord.position + delta);
    const safePos = findOpenPosition(sectionId, newPos, chordId, chord.lineIndex);
    if (safePos === chord.position) return;
    updateChord(sectionId, chordId, { position: safePos });
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
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;

      const chordSection = sections.find((s) => s.chords.some((c) => c.id === selectedId));
      if (!chordSection) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        nudgeChord(chordSection.id, selectedId, e.shiftKey ? -NUDGE_LARGE : -NUDGE_SMALL);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nudgeChord(chordSection.id, selectedId, e.shiftKey ? NUDGE_LARGE : NUDGE_SMALL);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeChord(chordSection.id, selectedId);
        setSelectedId(null);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const chord = chordSection.chords.find((c) => c.id === selectedId);
        if (chord) setPicker({ sectionId: chordSection.id, lineIndex: chord.lineIndex, charPos: chord.position, editingId: chord.id });
      } else if (e.key === "Escape") {
        setSelectedId(null);
        setPicker(null);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selectedId, readOnly, sections]);

  // --- Picker ---
  const openPicker = (sectionId: string, lineIndex: number, charPos: number, editingId?: string) => {
    if (readOnly) return;
    setSelectedId(editingId || null);
    setPicker({ sectionId, lineIndex, charPos, editingId: editingId || null });
    setShowCustom(false);
    setCustomText("");
  };

  const placeChord = (text: string) => {
    if (!picker) return;

    const updated = sections.map((s) => {
      if (s.id !== picker.sectionId) return s;

      if (picker.editingId) {
        const chord = s.chords.find((c) => c.id === picker.editingId);
        if (chord && !isVerse1(s.id) && chord.sourceIndex !== undefined) {
          overridesRef.current.add(`${s.id}:${chord.lineIndex}:${chord.sourceIndex}`);
        }
        return { ...s, chords: s.chords.map((c) => c.id === picker.editingId ? { ...c, chord: text } : c) };
      }

      const pos = findOpenPosition(picker.sectionId, picker.charPos, undefined, picker.lineIndex);
      const newChord: ChordPlacement = { id: makeChordId(), chord: text, position: pos, lineIndex: picker.lineIndex };
      return { ...s, chords: [...s.chords, newChord] };
    });

    updateSections(updated);
    setPicker(null);
    setShowCustom(false);
    setCustomText("");
  };

  // --- Section management ---
  function addSection(type: SectionType, label: string, copyChordsFrom?: SongSection) {
    const newSection: SongSection = {
      id: makeSectionId(),
      type,
      label,
      lyrics: "",
      order: sections.length,
      chords: [],
    };

    if (copyChordsFrom) {
      newSection.chords = copyChordsFrom.chords.map((c) => {
        const lineChords = copyChordsFrom.chords
          .filter((vc) => vc.lineIndex === c.lineIndex)
          .sort((a, b) => a.position - b.position);
        const idx = lineChords.indexOf(c);
        return {
          id: makeChordId(),
          chord: c.chord,
          position: c.position,
          lineIndex: c.lineIndex,
          sourceIndex: idx,
        };
      });
    }

    updateSections([...sections, newSection]);
  }

  function addVerse() {
    const verseCount = sections.filter((s) => s.type === "verse").length;
    const verse1 = getVerse1(sections);
    addSection("verse", `Verse ${verseCount + 1}`, verseCount >= 1 ? verse1 : undefined);
  }

  function addChorus() {
    if (sections.some((s) => s.type === "chorus")) return;
    addSection("chorus", "Chorus");
  }

  function addPreChorus() {
    if (sections.some((s) => s.type === "pre-chorus")) return;
    addSection("pre-chorus", "Pre-Chorus");
  }

  function addBridge() {
    if (sections.some((s) => s.type === "bridge")) return;
    addSection("bridge", "Bridge");
  }

  function removeSection(sectionId: string) {
    updateSections(sections.filter((s) => s.id !== sectionId));
  }

  function updateSectionLyrics(sectionId: string, lyrics: string) {
    const updated = sections.map((s) => s.id === sectionId ? { ...s, lyrics } : s);
    updateSections(updated);
  }

  // --- Drag ---
  const dragRef = useRef<{ id: string; sectionId: string; startX: number; moved: boolean } | null>(null);

  const handlePointerDown = (e: React.PointerEvent, chordId: string, sectionId: string) => {
    if (readOnly) return;
    e.stopPropagation();
    dragRef.current = { id: chordId, sectionId, startX: e.clientX, moved: false };
    setSelectedId(chordId);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = Math.abs(e.clientX - dragRef.current.startX);
    if (dx > 4) {
      dragRef.current.moved = true;
      const { sectionId, id } = dragRef.current;
      const chord = sections.find((s) => s.id === sectionId)?.chords.find((c) => c.id === id);
      if (!chord) return;
      const lineEl = lineRefs.current[`${sectionId}-${chord.lineIndex}`];
      if (!lineEl) return;
      const rect = lineEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const rawPos = Math.max(0, Math.round(x / 8));
      const safePos = findOpenPosition(sectionId, rawPos, id, chord.lineIndex);

      updateChord(sectionId, id, { position: safePos });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { id, sectionId, moved } = dragRef.current;
    dragRef.current = null;
    if (!moved) {
      const sec = sections.find((s) => s.id === sectionId);
      const chord = sec?.chords.find((c) => c.id === id);
      if (chord) openPicker(sectionId, chord.lineIndex, chord.position, id);
    }
  };

  // --- Transpose ---
  const handleTranspose = (semitones: number) => {
    const newKey = transposeKey(currentKey, semitones);
    const updated = sections.map((s) => ({
      ...s,
      chords: s.chords.map((c) => ({ ...c, chord: transposeChord(c.chord, semitones, newKey) })),
    }));
    setCurrentKey(newKey);
    updateSections(updated);
  };

  const diatonicChords = FAMILY_CHART[currentKey] || FAMILY_CHART["C"];

  const leftSections = sections.filter((s) => s.type === "verse");
  const rightSections = sections.filter((s) => s.type !== "verse");

  function renderSectionEditor(sec: SongSection) {
    const isCollapsed = collapsed[sec.id];
    const lines = sec.lyrics.split("\n");

    return (
      <div key={sec.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {/* Section header */}
        <div
          className="flex items-center gap-2 px-4 py-2.5 bg-stone-50 border-b border-stone-100 cursor-pointer select-none"
          onClick={() => setCollapsed((c) => ({ ...c, [sec.id]: !c[sec.id] }))}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            className={`text-stone-400 transition-transform ${isCollapsed ? "" : "rotate-90"}`}>
            <path d="M9 18l6-6-6-6" />
          </svg>
          <span className="font-medium text-sm text-stone-700">{sec.label}</span>
          {sec.type === "verse" && sec.label !== "Verse 1" && (
            <span className="text-xs text-stone-300 italic">synced from Verse 1</span>
          )}
          {sec.chords.length > 0 && (
            <span className="text-xs text-stone-400">{sec.chords.length} chords</span>
          )}
          <div className="flex-1" />
          {!readOnly && (
            <button
              onClick={(e) => { e.stopPropagation(); removeSection(sec.id); }}
              className="text-xs text-stone-400 hover:text-red-500 transition-colors px-2 py-0.5"
            >
              Remove
            </button>
          )}
        </div>

        {/* Section body */}
        {!isCollapsed && (
          <div className="p-2 sm:p-3">
            {lines.map((line, lineIdx) => {
              return (
                <div key={lineIdx} className="group/line px-3">
                  <div
                    ref={(el) => { lineRefs.current[`${sec.id}-${lineIdx}`] = el; }}
                    className="relative min-h-[1.75rem] py-0.5 border-b border-dashed border-stone-100 cursor-crosshair"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest(".chord-pill")) return;
                      if (readOnly) return;
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      openPicker(sec.id, lineIdx, Math.max(0, Math.round(x / 8)));
                    }}
                  >
                    {sec.chords
                      .filter((c) => c.lineIndex === lineIdx)
                      .map((chord) => {
                        const isChordOverridden = !isVerse1(sec.id) && chord.sourceIndex !== undefined &&
                          overridesRef.current.has(`${sec.id}:${lineIdx}:${chord.sourceIndex}`);
                        return (
                          <div
                            key={chord.id}
                            onPointerDown={(e) => handlePointerDown(e, chord.id, sec.id)}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            className={`chord-pill ${selectedId === chord.id ? "selected" : ""}`}
                            style={{ left: `${chord.position * 8}px`, touchAction: "none" }}
                          >
                            <span className="chord-text select-none">{chord.chord}</span>
                            {isChordOverridden && !readOnly && (
                              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[7px] text-amber-600 font-sans font-medium pointer-events-none whitespace-nowrap">edited</span>
                            )}
                            {!readOnly && (
                              <button
                                className="chord-delete"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => { e.stopPropagation(); removeChord(sec.id, chord.id); setSelectedId(null); }}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        );
                      })}

                    {sec.chords.filter((c) => c.lineIndex === lineIdx).length === 0 && !readOnly && (
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-stone-300 opacity-0 group-hover/line:opacity-100 transition-opacity pointer-events-none">
                        click to add chord
                      </div>
                    )}
                  </div>

                  <div className="py-1.5">
                    {line.trim() === "" ? (
                      <div className="h-5" />
                    ) : (
                      <div className="lyric-line font-mono text-sm text-stone-700 whitespace-pre-wrap">{line}</div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Lyrics textarea */}
            {!readOnly && (
              <div className="mt-2">
                <textarea
                  value={sec.lyrics}
                  onChange={(e) => updateSectionLyrics(sec.id, e.target.value)}
                  placeholder="Paste lyrics for this section..."
                  className="w-full h-24 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono text-stone-600 focus:border-gold focus:ring-1 focus:ring-gold/20 outline-none transition-all resize-y"
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

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
              const updated = diff === 0 ? sections : sections.map((s) => ({
                ...s,
                chords: s.chords.map((c) => ({ ...c, chord: transposeChord(c.chord, diff, newKey) })),
              }));
              setCurrentKey(newKey);
              updateSections(updated);
            }}
            className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-sm font-medium focus:border-gold focus:ring-1 focus:ring-gold/20 outline-none"
          >
            {KEY_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => handleTranspose(-1)} className="px-3 py-1.5 text-sm font-medium bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors" title="Down 1 semitone">&#9837; Down</button>
          <button onClick={() => handleTranspose(1)} className="px-3 py-1.5 text-sm font-medium bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors" title="Up 1 semitone">&#9838; Up</button>
        </div>

        {selectedId && <span className="text-xs text-gold">Arrow keys to nudge</span>}
      </div>

      {/* Chord picker popup */}
      {picker && (
        <div ref={pickerRef} className="chord-picker bg-white rounded-xl border border-stone-200 shadow-lg p-3 z-50" style={{ maxWidth: "360px" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-stone-500">
              {picker.editingId ? "Change chord" : `Add chord — Key of ${currentKey}`}
            </span>
            {picker.editingId && (
              <button onClick={() => { const sec = sections.find((s) => s.id === picker.sectionId); if (sec) removeChord(sec.id, picker.editingId!); setSelectedId(null); }} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                Remove
              </button>
            )}
          </div>

          {!showCustom ? (
            <>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {diatonicChords.map((ch) => (
                  <button key={ch} onClick={() => placeChord(ch)} className="px-3 py-1.5 text-sm font-semibold font-mono bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition-colors border border-amber-200/50">
                    {ch}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowCustom(true)} className="w-full px-3 py-1.5 text-sm text-stone-500 bg-stone-50 hover:bg-stone-100 rounded-lg transition-colors border border-dashed border-stone-300">
                + Other chord...
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <input type="text" value={customText} onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customText.trim()) placeChord(customText.trim());
                  if (e.key === "Escape") { setPicker(null); setShowCustom(false); }
                }}
                placeholder="e.g. Cadd9, D/F#, Gsus4..." className="flex-1 px-3 py-1.5 text-sm font-mono bg-white border border-stone-200 rounded-lg focus:border-gold focus:ring-1 focus:ring-gold/20 outline-none" autoFocus />
              <button onClick={() => { if (customText.trim()) placeChord(customText.trim()); }} disabled={!customText.trim()} className="px-3 py-1.5 text-sm font-medium bg-gold text-white rounded-lg hover:bg-amber-500 disabled:opacity-40 transition-colors">Add</button>
              <button onClick={() => { setShowCustom(false); setCustomText(""); }} className="px-2 py-1.5 text-sm text-stone-400 hover:text-stone-600 transition-colors">←</button>
            </div>
          )}
        </div>
      )}

      {/* Two-column section layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Verses */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Verses</h3>
            {!readOnly && (
              <button onClick={addVerse} className="text-xs font-medium text-gold hover:text-amber-600 transition-colors">
                + Add Verse
              </button>
            )}
          </div>
          {leftSections.length === 0 && !readOnly && (
            <button onClick={addVerse} className="w-full py-8 border-2 border-dashed border-stone-200 rounded-xl text-sm text-stone-400 hover:border-gold hover:text-gold transition-colors">
              + Add Verse 1
            </button>
          )}
          {leftSections.map(renderSectionEditor)}
        </div>

        {/* Right: Pre-Chorus, Chorus, Bridge */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Pre-Chorus / Chorus / Bridge</h3>
          </div>

          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              {!sections.some((s) => s.type === "pre-chorus") && (
                <button onClick={addPreChorus} className="px-3 py-1.5 text-xs font-medium bg-sage-light text-green-800 rounded-lg hover:bg-green-200 transition-colors">+ Pre-Chorus</button>
              )}
              {!sections.some((s) => s.type === "chorus") && (
                <button onClick={addChorus} className="px-3 py-1.5 text-xs font-medium bg-gold-lighter text-amber-700 rounded-lg hover:bg-amber-200 transition-colors">+ Chorus</button>
              )}
              {!sections.some((s) => s.type === "bridge") && (
                <button onClick={addBridge} className="px-3 py-1.5 text-xs font-medium bg-sky-light text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">+ Bridge</button>
              )}
            </div>
          )}

          {rightSections.length === 0 && readOnly && (
            <p className="text-sm text-stone-400 italic py-4">No pre-chorus, chorus, or bridge defined.</p>
          )}

          {rightSections.map(renderSectionEditor)}
        </div>
      </div>
    </div>
  );
}
