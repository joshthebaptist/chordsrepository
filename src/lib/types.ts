export interface ChordPlacement {
  id: string;
  chord: string;
  position: number;
  lineIndex: number;
  sourceIndex?: number;
}

export type SectionType = "verse" | "pre-chorus" | "chorus" | "bridge";

export interface SongSection {
  id: string;
  type: SectionType;
  label: string;
  lyrics: string;
  order: number;
  chords: ChordPlacement[];
}

export interface Song {
  id: string;
  title: string;
  sections: SongSection[];
  currentKey: string;
  editedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SundaySong {
  songId: string;
  keyOverride: string;
  order: number;
}

export interface Sunday {
  date: string;
  songs: SundaySong[];
}
