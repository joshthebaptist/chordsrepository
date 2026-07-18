import { getClient, initDb } from "./db";
import { Song, Sunday, SundaySong, ChordPlacement } from "./types";

let dbReady = false;

async function ensureDb() {
  if (!dbReady) {
    await initDb();
    dbReady = true;
  }
}

async function timedQuery<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  const result = await fn();
  const ms = Date.now() - start;
  console.log(`[DB] ${label}: ${ms}ms`);
  return result;
}

// --- Songs ---

export async function getAllSongs(): Promise<Song[]> {
  await ensureDb();
  return timedQuery("getAllSongs", async () => {
    const db = getClient();

    const songsResult = await db.execute("SELECT * FROM songs ORDER BY title");
    const songs: Song[] = [];

    for (const row of songsResult.rows) {
      const chordsResult = await db.execute({
        sql: "SELECT * FROM chord_placements WHERE song_id = ? ORDER BY line_index, position",
        args: [row.id as string],
      });

      songs.push({
        id: row.id as string,
        title: row.title as string,
        lyrics: row.lyrics as string,
        currentKey: row.current_key as string,
        editedBy: row.edited_by as string,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
        chords: chordsResult.rows.map((c) => ({
          id: c.id as string,
          chord: c.chord as string,
          position: c.position as number,
          lineIndex: c.line_index as number,
        })),
      });
    }

    return songs;
  });
}

export async function getSong(id: string): Promise<Song | null> {
  await ensureDb();
  return timedQuery("getSong", async () => {
    const db = getClient();

    const result = await db.execute({
      sql: "SELECT * FROM songs WHERE id = ?",
      args: [id],
    });

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const chordsResult = await db.execute({
      sql: "SELECT * FROM chord_placements WHERE song_id = ? ORDER BY line_index, position",
      args: [id],
    });

    return {
      id: row.id as string,
      title: row.title as string,
      lyrics: row.lyrics as string,
      currentKey: row.current_key as string,
      editedBy: row.edited_by as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      chords: chordsResult.rows.map((c) => ({
        id: c.id as string,
        chord: c.chord as string,
        position: c.position as number,
        lineIndex: c.line_index as number,
      })),
    };
  });
}

export async function createSong(song: Song): Promise<Song> {
  await ensureDb();
  const db = getClient();

  await db.execute({
    sql: "INSERT INTO songs (id, title, lyrics, current_key, edited_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [
      song.id,
      song.title,
      song.lyrics,
      song.currentKey,
      song.editedBy,
      song.createdAt,
      song.updatedAt,
    ],
  });

  if (song.chords.length > 0) {
    await db.batch(
      song.chords.map((c) => ({
        sql: "INSERT INTO chord_placements (id, song_id, chord, position, line_index) VALUES (?, ?, ?, ?, ?)",
        args: [c.id, song.id, c.chord, c.position, c.lineIndex],
      }))
    );
  }

  return song;
}

export async function updateSong(
  id: string,
  updates: Partial<Song>
): Promise<Song | null> {
  await ensureDb();
  const db = getClient();
  const now = new Date().toISOString();

  const existing = await getSong(id);
  if (!existing) return null;

  const updated = { ...existing, ...updates, updatedAt: now };

  await db.execute({
    sql: "UPDATE songs SET title = ?, lyrics = ?, current_key = ?, edited_by = ?, updated_at = ? WHERE id = ?",
    args: [
      updated.title,
      updated.lyrics,
      updated.currentKey,
      updated.editedBy,
      now,
      id,
    ],
  });

  // Replace all chord placements
  await db.execute({
    sql: "DELETE FROM chord_placements WHERE song_id = ?",
    args: [id],
  });

  if (updated.chords.length > 0) {
    await db.batch(
      updated.chords.map((c) => ({
        sql: "INSERT INTO chord_placements (id, song_id, chord, position, line_index) VALUES (?, ?, ?, ?, ?)",
        args: [c.id, id, c.chord, c.position, c.lineIndex],
      }))
    );
  }

  return updated;
}

export async function deleteSong(id: string): Promise<boolean> {
  await ensureDb();
  const db = getClient();

  await db.execute({
    sql: "DELETE FROM chord_placements WHERE song_id = ?",
    args: [id],
  });

  const result = await db.execute({
    sql: "DELETE FROM songs WHERE id = ?",
    args: [id],
  });

  return (result.rowsAffected ?? 0) > 0;
}

export async function searchSongs(query: string): Promise<Song[]> {
  await ensureDb();
  return timedQuery("searchSongs", async () => {
    const db = getClient();
    const q = `%${query}%`;

    const songsResult = await db.execute({
      sql: "SELECT * FROM songs WHERE title LIKE ? OR lyrics LIKE ? ORDER BY title",
      args: [q, q],
    });

    const songs: Song[] = [];

    for (const row of songsResult.rows) {
      const chordsResult = await db.execute({
        sql: "SELECT * FROM chord_placements WHERE song_id = ? ORDER BY line_index, position",
        args: [row.id as string],
      });

      songs.push({
        id: row.id as string,
        title: row.title as string,
        lyrics: row.lyrics as string,
        currentKey: row.current_key as string,
        editedBy: row.edited_by as string,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
        chords: chordsResult.rows.map((c) => ({
          id: c.id as string,
          chord: c.chord as string,
          position: c.position as number,
          lineIndex: c.line_index as number,
        })),
      });
    }

    return songs;
  });
}

// --- Sundays ---

export async function getAllSundays(): Promise<Sunday[]> {
  await ensureDb();
  return timedQuery("getAllSundays", async () => {
    const db = getClient();

    const sundaysResult = await db.execute("SELECT * FROM sundays ORDER BY date");
    const sundays: Sunday[] = [];

    for (const row of sundaysResult.rows) {
      const songsResult = await db.execute({
        sql: "SELECT * FROM sunday_songs WHERE sunday_date = ? ORDER BY sort_order",
        args: [row.date as string],
      });

      sundays.push({
        date: row.date as string,
        songs: songsResult.rows.map((s) => ({
          songId: s.song_id as string,
          keyOverride: s.key_override as string,
          order: s.sort_order as number,
        })),
      });
    }

    return sundays;
  });
}

export async function getSunday(date: string): Promise<Sunday | null> {
  await ensureDb();
  return timedQuery("getSunday", async () => {
    const db = getClient();

    const result = await db.execute({
      sql: "SELECT * FROM sundays WHERE date = ?",
      args: [date],
    });

    if (result.rows.length === 0) return null;

    const songsResult = await db.execute({
      sql: "SELECT * FROM sunday_songs WHERE sunday_date = ? ORDER BY sort_order",
      args: [date],
    });

    return {
      date: result.rows[0].date as string,
      songs: songsResult.rows.map((s) => ({
        songId: s.song_id as string,
        keyOverride: s.key_override as string,
        order: s.sort_order as number,
      })),
    };
  });
}

export async function createOrUpdateSunday(sunday: Sunday): Promise<Sunday> {
  await ensureDb();
  const db = getClient();

  // Ensure the Sunday date exists
  await db.execute({
    sql: "INSERT OR IGNORE INTO sundays (date) VALUES (?)",
    args: [sunday.date],
  });

  // Replace all songs for this Sunday
  await db.execute({
    sql: "DELETE FROM sunday_songs WHERE sunday_date = ?",
    args: [sunday.date],
  });

  if (sunday.songs.length > 0) {
    await db.batch(
      sunday.songs.map((ss) => ({
        sql: "INSERT INTO sunday_songs (sunday_date, song_id, key_override, sort_order) VALUES (?, ?, ?, ?)",
        args: [sunday.date, ss.songId, ss.keyOverride, ss.order],
      }))
    );
  }

  return sunday;
}

export async function addSongToSunday(
  date: string,
  songId: string,
  keyOverride: string
): Promise<Sunday | null> {
  await ensureDb();
  const db = getClient();

  // Ensure the Sunday exists
  await db.execute({
    sql: "INSERT OR IGNORE INTO sundays (date) VALUES (?)",
    args: [date],
  });

  // Check if song already exists for this Sunday
  const existing = await db.execute({
    sql: "SELECT id FROM sunday_songs WHERE sunday_date = ? AND song_id = ?",
    args: [date, songId],
  });

  if (existing.rows.length > 0) {
    // Update key
    await db.execute({
      sql: "UPDATE sunday_songs SET key_override = ? WHERE sunday_date = ? AND song_id = ?",
      args: [keyOverride, date, songId],
    });
  } else {
    // Get max sort order
    const maxOrder = await db.execute({
      sql: "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM sunday_songs WHERE sunday_date = ?",
      args: [date],
    });
    const order = maxOrder.rows[0].next_order as number;

    await db.execute({
      sql: "INSERT INTO sunday_songs (sunday_date, song_id, key_override, sort_order) VALUES (?, ?, ?, ?)",
      args: [date, songId, keyOverride, order],
    });
  }

  return getSunday(date);
}

export async function removeSongFromSunday(
  date: string,
  songId: string
): Promise<Sunday | null> {
  await ensureDb();
  const db = getClient();

  await db.execute({
    sql: "DELETE FROM sunday_songs WHERE sunday_date = ? AND song_id = ?",
    args: [date, songId],
  });

  // Re-order remaining songs
  const remaining = await db.execute({
    sql: "SELECT id FROM sunday_songs WHERE sunday_date = ? ORDER BY sort_order",
    args: [date],
  });

  await db.batch(
    remaining.rows.map((row, i) => ({
      sql: "UPDATE sunday_songs SET sort_order = ? WHERE id = ?",
      args: [i, row.id],
    }))
  );

  return getSunday(date);
}
