const SHARP_KEYS = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

const FLAT_KEYS = [
  "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B",
];

const CHORD_REGEX = /^([A-G][#b]?)(.*)/;

function normalizeKey(key: string): { root: string; useFlats: boolean } {
  const isFlat = key.includes("b") && key !== "B";
  return { root: key, useFlats: isFlat };
}

export function transposeChord(chord: string, semitones: number): string {
  const match = chord.match(CHORD_REGEX);
  if (!match) return chord;

  const root = match[1];
  const suffix = match[2];

  const isFlat = root.includes("b");
  const keys = isFlat ? FLAT_KEYS : SHARP_KEYS;

  let idx = keys.indexOf(root);
  if (idx === -1) {
    const otherKeys = isFlat ? SHARP_KEYS : FLAT_KEYS;
    idx = otherKeys.indexOf(root);
    if (idx === -1) return chord;
    const newIdx = (idx + semitones + 12) % 12;
    return keys[newIdx] + suffix;
  }

  const newIdx = (idx + semitones + 12) % 12;
  return keys[newIdx] + suffix;
}

export function transposeKey(key: string, semitones: number): string {
  return transposeChord(key, semitones);
}

export function getKeyOptions(): string[] {
  return SHARP_KEYS;
}
