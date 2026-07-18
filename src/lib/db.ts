import { createClient, Client } from "@libsql/client";

let client: Client | null = null;

export function getClient(): Client {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

export async function initDb() {
  const db = getClient();

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      lyrics TEXT DEFAULT '',
      current_key TEXT DEFAULT 'C',
      edited_by TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chord_placements (
      id TEXT PRIMARY KEY,
      song_id TEXT NOT NULL,
      chord TEXT NOT NULL,
      position INTEGER DEFAULT 0,
      line_index INTEGER DEFAULT 0,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sundays (
      date TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS sunday_songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sunday_date TEXT NOT NULL,
      song_id TEXT NOT NULL,
      key_override TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (sunday_date) REFERENCES sundays(date) ON DELETE CASCADE,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
    );
  `);
}
