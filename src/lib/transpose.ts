// Chromatic scale — sharps as default
const CHROMATIC_SHARP = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

// Chromatic scale — flats
const CHROMATIC_FLAT = [
  "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B",
];

// Map every note to its semitone index (0–11)
const NOTE_TO_SEMITONE: Record<string, number> = {};
CHROMATIC_SHARP.forEach((n, i) => (NOTE_TO_SEMITONE[n] = i));
CHROMATIC_FLAT.forEach((n, i) => (NOTE_TO_SEMITONE[n] = i));

/**
 * Calculate the semitone difference between two notes.
 * Positive = up, negative = down.
 */
export function semitoneDiff(from: string, to: string): number {
  const fromIdx = NOTE_TO_SEMITONE[from];
  const toIdx = NOTE_TO_SEMITONE[to];
  if (fromIdx === undefined || toIdx === undefined) return 0;
  return (toIdx - fromIdx + 12) % 12;
}

// Keys that use flat spelling in the target key context
const FLAT_KEYS = new Set(["Db", "Eb", "Gb", "Ab", "Bb"]);

/**
 * Determine whether to spell the result with sharps or flats,
 * based on the target key context.
 */
function useFlatsForKey(targetKey: string): boolean {
  return FLAT_KEYS.has(targetKey);
}

/**
 * Pick the correct enharmonic spelling for a semitone index
 * based on whether we're in a flat or sharp context.
 */
function spellNote(semitone: number, flats: boolean): string {
  return flats ? CHROMATIC_FLAT[semitone] : CHROMATIC_SHARP[semitone];
}

/**
 * Transpose a single note (root or bass) by semitones,
 * returning the spelled result for the given key context.
 */
function transposeNote(note: string, semitones: number, flats: boolean): string {
  const idx = NOTE_TO_SEMITONE[note];
  if (idx === undefined) return note;
  const newIdx = (idx + semitones + 120) % 12;
  return spellNote(newIdx, flats);
}

/**
 * Full chord regex:
 *   root   = one of A–G with optional #/b
 *   suffix = everything after root (m, 7, maj7, sus4, add9, dim, aug, °, etc.)
 *   /bass  = optional slash chord bass note
 *
 * Examples matched:
 *   C → root=C, suffix="", slash=""
 *   F#m7 → root=F#, suffix=m7, slash=""
 *   G/B → root=G, suffix="", bass=B
 *   Cmaj7/F# → root=C, suffix=maj7, bass=F#
 */
const CHORD_FULL_REGEX = /^([A-G][#b]?)(.*?)(?:\/([A-G][#b]?))?$/;

/**
 * Transpose a full chord string by a given number of semitones.
 *
 * @param chord    - e.g. "Cadd9", "F#m7", "G/B", "Cmaj7/F#"
 * @param semitones - shift amount (+1 = up one semitone, -1 = down one, etc.)
 * @param targetKey - the key context for sharp/flat spelling decisions
 */
export function transposeChord(
  chord: string,
  semitones: number,
  targetKey?: string
): string {
  const trimmed = chord.trim();
  const match = trimmed.match(CHORD_FULL_REGEX);
  if (!match) return trimmed;

  const root = match[1];
  const suffix = match[2];
  const bass = match[3];

  // Decide sharp vs flat based on target key, or fall back to input style
  const flats = targetKey !== undefined
    ? useFlatsForKey(targetKey)
    : root.includes("b") && root !== "B";

  const newRoot = transposeNote(root, semitones, flats);

  if (bass) {
    const newBass = transposeNote(bass, semitones, flats);
    return `${newRoot}${suffix}/${newBass}`;
  }

  return `${newRoot}${suffix}`;
}

/**
 * Transpose a key name itself (no suffix, just a note name).
 */
export function transposeKey(key: string, semitones: number): string {
  const flats = useFlatsForKey(key);
  return transposeNote(key, semitones, flats);
}

/**
 * Transpose a chord, deriving the target key automatically
 * from the original chord's input spelling context.
 */
export function transposeChordAuto(chord: string, semitones: number): string {
  const trimmed = chord.trim();
  const match = trimmed.match(CHORD_FULL_REGEX);
  if (!match) return trimmed;

  const root = match[1];
  const flats = root.includes("b") && root !== "B";
  const targetKey = flats ? "Bb" : "C";

  return transposeChord(chord, semitones, targetKey);
}

/**
 * Parse a chord into its component parts.
 */
export function parseChord(chord: string): {
  root: string;
  suffix: string;
  bass: string | null;
} {
  const match = chord.trim().match(CHORD_FULL_REGEX);
  if (!match) return { root: chord, suffix: "", bass: null };
  return {
    root: match[1],
    suffix: match[2],
    bass: match[3] || null,
  };
}

/**
 * Get the full list of key options for the UI selector.
 */
export function getKeyOptions(): string[] {
  return [...CHROMATIC_SHARP, "Db", "Eb", "Gb", "Ab", "Bb"];
}

// Family chord chart — reference table for diatonic chords per key
// Used for validation/highlighting, NOT as the transpose mechanism
export const FAMILY_CHART: Record<string, string[]> = {
  C:  ["C", "Dm", "Em", "F", "G", "Am", "Bdim"],
  G:  ["G", "Am", "Bm", "C", "D", "Em", "F#dim"],
  D:  ["D", "Em", "F#m", "G", "A", "Bm", "C#dim"],
  A:  ["A", "Bm", "C#m", "D", "E", "F#m", "G#dim"],
  E:  ["E", "F#m", "G#m", "A", "B", "C#m", "D#dim"],
  B:  ["B", "C#m", "D#m", "E", "F#", "G#m", "A#dim"],
  F:  ["F", "Gm", "Am", "Bb", "C", "Dm", "Edim"],
  "F#": ["F#", "G#m", "A#m", "B", "C#", "D#m", "E#dim"],
  "Db": ["Db", "Ebm", "Fm", "Gb", "Ab", "Bbm", "Cdim"],
  "Ab": ["Ab", "Bbm", "Cm", "Db", "Eb", "Fm", "Gdim"],
  "Eb": ["Eb", "Fm", "Gm", "Ab", "Bb", "Cm", "Ddim"],
  "Bb": ["Bb", "Cm", "Dm", "Eb", "F", "Gm", "Adim"],
};

/**
 * Check if a chord is diatonic (in the family) for a given key.
 */
export function isDiatonic(chord: string, key: string): boolean {
  const family = FAMILY_CHART[key];
  if (!family) return false;

  const parsed = parseChord(chord);
  // Normalize: check root + any basic quality
  const simplified = `${parsed.root}${parsed.suffix}`;
  return family.some(
    (f) => f === simplified || f === parsed.root
  );
}
