import fs from "fs";
import path from "path";
import { Song, Sunday } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const SONGS_FILE = path.join(DATA_DIR, "songs.json");
const SUNDAYS_FILE = path.join(DATA_DIR, "sundays.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON<T>(filePath: string, fallback: T): T {
  ensureDataDir();
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf-8");
    return fallback;
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function writeJSON(filePath: string, data: unknown) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// Songs
export function getAllSongs(): Song[] {
  return readJSON<Song[]>(SONGS_FILE, []);
}

export function getSong(id: string): Song | undefined {
  const songs = getAllSongs();
  return songs.find((s) => s.id === id);
}

export function createSong(song: Song): Song {
  const songs = getAllSongs();
  songs.push(song);
  writeJSON(SONGS_FILE, songs);
  return song;
}

export function updateSong(id: string, updates: Partial<Song>): Song | null {
  const songs = getAllSongs();
  const idx = songs.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  songs[idx] = { ...songs[idx], ...updates, updatedAt: new Date().toISOString() };
  writeJSON(SONGS_FILE, songs);
  return songs[idx];
}

export function deleteSong(id: string): boolean {
  const songs = getAllSongs();
  const filtered = songs.filter((s) => s.id !== id);
  if (filtered.length === songs.length) return false;
  writeJSON(SONGS_FILE, filtered);
  return true;
}

export function searchSongs(query: string): Song[] {
  const songs = getAllSongs();
  const q = query.toLowerCase();
  return songs.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.lyrics.toLowerCase().includes(q)
  );
}

// Sundays
export function getAllSundays(): Sunday[] {
  return readJSON<Sunday[]>(SUNDAYS_FILE, []);
}

export function getSunday(date: string): Sunday | undefined {
  const sundays = getAllSundays();
  return sundays.find((s) => s.date === date);
}

export function createOrUpdateSunday(sunday: Sunday): Sunday {
  const sundays = getAllSundays();
  const idx = sundays.findIndex((s) => s.date === sunday.date);
  if (idx >= 0) {
    sundays[idx] = sunday;
  } else {
    sundays.push(sunday);
  }
  sundays.sort((a, b) => a.date.localeCompare(b.date));
  writeJSON(SUNDAYS_FILE, sundays);
  return sunday;
}

export function addSongToSunday(date: string, songId: string, keyOverride: string): Sunday | null {
  const sundays = getAllSundays();
  const idx = sundays.findIndex((s) => s.date === date);
  if (idx === -1) return null;

  const existing = sundays[idx].songs.find((ss) => ss.songId === songId);
  if (existing) {
    existing.keyOverride = keyOverride;
  } else {
    sundays[idx].songs.push({
      songId,
      keyOverride,
      order: sundays[idx].songs.length,
    });
  }
  writeJSON(SUNDAYS_FILE, sundays);
  return sundays[idx];
}

export function removeSongFromSunday(date: string, songId: string): Sunday | null {
  const sundays = getAllSundays();
  const idx = sundays.findIndex((s) => s.date === date);
  if (idx === -1) return null;

  sundays[idx].songs = sundays[idx].songs
    .filter((ss) => ss.songId !== songId)
    .map((ss, i) => ({ ...ss, order: i }));
  writeJSON(SUNDAYS_FILE, sundays);
  return sundays[idx];
}
