"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChordEditor } from "../ChordEditor";
import { SongSection } from "@/lib/types";

export default function NewSongPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [sections, setSections] = useState<SongSection[]>([]);
  const [currentKey, setCurrentKey] = useState("C");
  const [editedBy, setEditedBy] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Please enter a song title.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          sections,
          currentKey,
          editedBy: editedBy.trim(),
        }),
      });
      if (res.ok) {
        const song = await res.json();
        router.push(`/songs/${song.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-stone-800">New Song</h1>
          <p className="text-stone-500 mt-1">Add sections, lyrics, and place chords above the lines.</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-amber-500 text-white rounded-xl font-medium shadow-sm hover:shadow-md transition-all duration-200 text-sm disabled:opacity-50">
          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
              <polyline points="17,21 17,13 7,13 7,21"/>
              <polyline points="7,3 7,8 15,8"/>
            </svg>
          )}
          Save Song
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">Song Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Amazing Grace"
            className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all" />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">Edited By</label>
          <input type="text" value={editedBy} onChange={(e) => setEditedBy(e.target.value)} placeholder="Your name"
            className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all" />
        </div>
      </div>

      <ChordEditor initialSections={sections} initialKey={currentKey}
        onChange={(newSections, newKey) => { setSections(newSections); setCurrentKey(newKey); }} />
    </div>
  );
}
