import { getClient, initDb } from "./db";
import { Song, SongSection, Sunday, SundaySong, ChordPlacement } from "./types";

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

// --- Section helpers ---

async function loadSectionsForSong(db: ReturnType<typeof getClient>, songId: string): Promise<SongSection[]> {
  const sectionsResult = await db.execute({
    sql: "SELECT * FROM song_sections WHERE song_id = ? ORDER BY sort_order",
    args: [songId],
  });

  const sections: SongSection[] = [];
  for (const row of sectionsResult.rows) {
    const chordsResult = await db.execute({
      sql: "SELECT * FROM section_chords WHERE section_id = ? ORDER BY line_index, position",
      args: [row.id as string],
    });
    sections.push({
      id: row.id as string,
      type: row.type as SongSection["type"],
      label: row.label as string,
      lyrics: row.lyrics as string,
      order: row.sort_order as number,
      chords: chordsResult.rows.map((c) => ({
        id: c.id as string,
        chord: c.chord as string,
        position: c.position as number,
        lineIndex: c.line_index as number,
        ...(c.source_index != null ? { sourceIndex: c.source_index as number } : {}),
      })),
    });
  }
  return sections;
}

async function saveSectionsForSong(db: ReturnType<typeof getClient>, songId: string, sections: SongSection[]): Promise<void> {
  await db.execute({ sql: "DELETE FROM song_sections WHERE song_id = ?", args: [songId] });
  if (sections.length === 0) return;

  await db.batch(
    sections.map((s) => ({
      sql: "INSERT INTO song_sections (id, song_id, type, label, lyrics, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
      args: [s.id, songId, s.type, s.label, s.lyrics, s.order],
    }))
  );

  const chordBatch = sections.flatMap((s) =>
    s.chords.map((c) => ({
      sql: "INSERT INTO section_chords (id, section_id, chord, position, line_index, source_index) VALUES (?, ?, ?, ?, ?, ?)",
      args: [c.id, s.id, c.chord, c.position, c.lineIndex, c.sourceIndex ?? null],
    }))
  );
  if (chordBatch.length > 0) {
    await db.batch(chordBatch);
  }
}

async function migrateOldSong(db: ReturnType<typeof getClient>, row: Record<string, unknown>): Promise<SongSection[]> {
  const songId = row.id as string;
  const lyrics = (row.lyrics as string) || "";

  const chordsResult = await db.execute({
    sql: "SELECT * FROM chord_placements WHERE song_id = ? ORDER BY line_index, position",
    args: [songId],
  });

  const chords: ChordPlacement[] = chordsResult.rows.map((c) => ({
    id: c.id as string,
    chord: c.chord as string,
    position: c.position as number,
    lineIndex: c.line_index as number,
  }));

  const sectionId = crypto.randomUUID();
  const sections: SongSection[] = [{
    id: sectionId,
    type: "verse",
    label: "Verse 1",
    lyrics,
    order: 0,
    chords,
  }];

  await saveSectionsForSong(db, songId, sections);
  return sections;
}

// --- Songs ---

export async function getAllSongs(): Promise<Song[]> {
  await ensureDb();
  return timedQuery("getAllSongs", async () => {
    const db = getClient();
    const songsResult = await db.execute("SELECT * FROM songs ORDER BY title");
    const songs: Song[] = [];

    for (const row of songsResult.rows) {
      let sections = await loadSectionsForSong(db, row.id as string);
      if (sections.length === 0) {
        sections = await migrateOldSong(db, row);
      }
      songs.push({
        id: row.id as string,
        title: row.title as string,
        sections,
        currentKey: row.current_key as string,
        editedBy: row.edited_by as string,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      });
    }
    return songs;
  });
}

export async function getSong(id: string): Promise<Song | null> {
  await ensureDb();
  return timedQuery("getSong", async () => {
    const db = getClient();
    const result = await db.execute({ sql: "SELECT * FROM songs WHERE id = ?", args: [id] });
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    let sections = await loadSectionsForSong(db, id);
    if (sections.length === 0) {
      sections = await migrateOldSong(db, row);
    }

    return {
      id: row.id as string,
      title: row.title as string,
      sections,
      currentKey: row.current_key as string,
      editedBy: row.edited_by as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  });
}

export async function createSong(song: Song): Promise<Song> {
  await ensureDb();
  const db = getClient();

  await db.execute({
    sql: "INSERT INTO songs (id, title, lyrics, current_key, edited_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [song.id, song.title, "", song.currentKey, song.editedBy, song.createdAt, song.updatedAt],
  });

  await saveSectionsForSong(db, song.id, song.sections);
  return song;
}

export async function updateSong(id: string, updates: Partial<Song>): Promise<Song | null> {
  await ensureDb();
  const db = getClient();
  const now = new Date().toISOString();

  const existing = await getSong(id);
  if (!existing) return null;

  const updated = { ...existing, ...updates, updatedAt: now };

  await db.execute({
    sql: "UPDATE songs SET title = ?, current_key = ?, edited_by = ?, updated_at = ? WHERE id = ?",
    args: [updated.title, updated.currentKey, updated.editedBy, now, id],
  });

  if (updated.sections) {
    await saveSectionsForSong(db, id, updated.sections);
  }

  return updated;
}

export async function deleteSong(id: string): Promise<boolean> {
  await ensureDb();
  const db = getClient();
  await db.execute({ sql: "DELETE FROM chord_placements WHERE song_id = ?", args: [id] });
  const result = await db.execute({ sql: "DELETE FROM songs WHERE id = ?", args: [id] });
  return (result.rowsAffected ?? 0) > 0;
}

export async function searchSongs(query: string): Promise<Song[]> {
  await ensureDb();
  return timedQuery("searchSongs", async () => {
    const db = getClient();
    const q = `%${query}%`;
    const songsResult = await db.execute({
      sql: "SELECT * FROM songs WHERE title LIKE ? ORDER BY title",
      args: [q],
    });

    const songs: Song[] = [];
    for (const row of songsResult.rows) {
      let sections = await loadSectionsForSong(db, row.id as string);
      if (sections.length === 0) {
        sections = await migrateOldSong(db, row);
      }
      songs.push({
        id: row.id as string,
        title: row.title as string,
        sections,
        currentKey: row.current_key as string,
        editedBy: row.edited_by as string,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      });
    }
    return songs;
  });
}

// --- Single-call optimized query for Sundays page ---

export async function loadSundaysPageData(upcomingDates: string[]): Promise<{
  sundays: Sunday[];
  songTitles: { id: string; title: string }[];
}> {
  await ensureDb();
  return timedQuery("loadSundaysPageData", async () => {
    const db = getClient();

    const countResult = await db.execute("SELECT COUNT(*) as cnt FROM sundays");
    const count = countResult.rows[0].cnt as number;

    let sundaysResult, sundaySongsResult, songTitlesResult;

    if (count < upcomingDates.length) {
      const batch = [
        ...upcomingDates.map((d) => ({
          sql: "INSERT OR IGNORE INTO sundays (date) VALUES (?)",
          args: [d],
        })),
        { sql: "SELECT date FROM sundays ORDER BY date", args: [] },
        { sql: "SELECT sunday_date, song_id, key_override, sort_order FROM sunday_songs", args: [] },
        { sql: "SELECT id, title FROM songs ORDER BY title", args: [] },
      ];
      const results = await db.batch(batch);
      const insertCount = upcomingDates.length;
      sundaysResult = results[insertCount];
      sundaySongsResult = results[insertCount + 1];
      songTitlesResult = results[insertCount + 2];
    } else {
      const results = await db.batch([
        { sql: "SELECT date FROM sundays ORDER BY date", args: [] },
        { sql: "SELECT sunday_date, song_id, key_override, sort_order FROM sunday_songs", args: [] },
        { sql: "SELECT id, title FROM songs ORDER BY title", args: [] },
      ]);
      sundaysResult = results[0];
      sundaySongsResult = results[1];
      songTitlesResult = results[2];
    }

    const songsBySunday = new Map<string, SundaySong[]>();
    for (const row of sundaySongsResult.rows) {
      const date = row.sunday_date as string;
      if (!songsBySunday.has(date)) songsBySunday.set(date, []);
      songsBySunday.get(date)!.push({
        songId: row.song_id as string,
        keyOverride: row.key_override as string,
        order: row.sort_order as number,
      });
    }

    const sundays: Sunday[] = sundaysResult.rows.map((r) => ({
      date: r.date as string,
      songs: songsBySunday.get(r.date as string) || [],
    }));

    const songTitles = songTitlesResult.rows.map((r) => ({
      id: r.id as string,
      title: r.title as string,
    }));

    return { sundays, songTitles };
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
    const result = await db.execute({ sql: "SELECT * FROM sundays WHERE date = ?", args: [date] });
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

  await db.execute({ sql: "INSERT OR IGNORE INTO sundays (date) VALUES (?)", args: [sunday.date] });
  await db.execute({ sql: "DELETE FROM sunday_songs WHERE sunday_date = ?", args: [sunday.date] });

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

export async function addSongToSunday(date: string, songId: string, keyOverride: string): Promise<Sunday | null> {
  await ensureDb();
  const db = getClient();

  await db.execute({ sql: "INSERT OR IGNORE INTO sundays (date) VALUES (?)", args: [date] });

  const existing = await db.execute({
    sql: "SELECT id FROM sunday_songs WHERE sunday_date = ? AND song_id = ?",
    args: [date, songId],
  });

  if (existing.rows.length > 0) {
    await db.execute({
      sql: "UPDATE sunday_songs SET key_override = ? WHERE sunday_date = ? AND song_id = ?",
      args: [keyOverride, date, songId],
    });
  } else {
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

export async function removeSongFromSunday(date: string, songId: string): Promise<Sunday | null> {
  await ensureDb();
  const db = getClient();

  await db.execute({ sql: "DELETE FROM sunday_songs WHERE sunday_date = ? AND song_id = ?", args: [date, songId] });

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
