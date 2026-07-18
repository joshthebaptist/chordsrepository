export interface ChordPlacement {
  id: string;
  chord: string;
  position: number; // character position above the lyric line
  lineIndex: number; // which lyric line this chord sits above
}

export interface Song {
  id: string;
  title: string;
  lyrics: string; // raw lyrics text, one line per line
  chords: ChordPlacement[];
  currentKey: string;
  editedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SundaySong {
  songId: string;
  keyOverride: string; // the key used for this Sunday (may differ from library key)
  order: number;
}

export interface Sunday {
  date: string; // YYYY-MM-DD format
  songs: SundaySong[];
}
