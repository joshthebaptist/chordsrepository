"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChordEditor } from "../ChordEditor";
import { ChordPlacement, Song } from "@/lib/types";

export default function SongDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [song, setSong] = useState<Song | null>(null);
  const [title, setTitle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [chords, setChords] = useState<ChordPlacement[]>([]);
  const [currentKey, setCurrentKey] = useState("C");
  const [editedBy, setEditedBy] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/songs/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          router.push("/songs");
          return;
        }
        setSong(data);
        setTitle(data.title);
        setLyrics(data.lyrics);
        setChords(data.chords);
        setCurrentKey(data.currentKey);
        setEditedBy(data.editedBy);
        setLoading(false);
      });
  }, [id, router]);

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Please enter a song title.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/songs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          lyrics,
          chords,
          currentKey,
          editedBy: editedBy.trim(),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSong(updated);
        alert("Song saved!");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <button
            onClick={() => router.push("/songs")}
            className="text-sm text-stone-400 hover:text-stone-600 transition-colors mb-2 inline-flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Library
          </button>
          <h1 className="font-display text-3xl font-bold text-stone-800">
            Edit Song
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (confirm("Delete this song?")) {
                await fetch(`/api/songs/${id}`, { method: "DELETE" });
                router.push("/songs");
              }
            }}
            className="px-4 py-2 text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
          >
            Delete
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-amber-500 text-white rounded-xl font-medium shadow-sm hover:shadow-md transition-all duration-200 text-sm disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline points="17,21 17,13 7,13 7,21"/>
                <polyline points="7,3 7,8 15,8"/>
              </svg>
            )}
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">
            Song Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">
            Edited By
          </label>
          <input
            type="text"
            value={editedBy}
            onChange={(e) => setEditedBy(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all"
          />
        </div>
      </div>

      <ChordEditor
        initialLyrics={lyrics}
        initialChords={chords}
        initialKey={currentKey}
        onChange={(newLyrics, newChords, newKey) => {
          setLyrics(newLyrics);
          setChords(newChords);
          setCurrentKey(newKey);
        }}
      />

      {song && (
        <div className="text-xs text-stone-400 pt-4 border-t border-stone-100">
          Created: {new Date(song.createdAt).toLocaleDateString()} · 
          Last updated: {new Date(song.updatedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
