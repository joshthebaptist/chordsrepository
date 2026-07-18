import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="text-center py-12">
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-stone-800 mb-4">
          Worship Chords & Lyrics
        </h1>
        <p className="text-lg text-stone-500 max-w-xl mx-auto mb-8">
          Manage your worship team&apos;s song library and weekly service sets.
          Find songs, transpose keys, and print chord sheets with ease.
        </p>

        <div className="ornament-divider">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gold">
            <path d="M12 2L15 8.5L22 9.5L17 14.5L18 21.5L12 18.5L6 21.5L7 14.5L2 9.5L9 8.5L12 2Z" 
                  fill="currentColor" opacity="0.5"/>
          </svg>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto mt-8">
          <Link
            href="/songs"
            className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg border border-amber-100/50 transition-all duration-300 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-lighter to-gold-light flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gold">
                <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2"/>
                <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <h2 className="font-display text-xl font-semibold text-stone-800 mb-2">
              Song Library
            </h2>
            <p className="text-stone-500 text-sm">
              Browse, search, and manage all your worship songs with lyrics and chord placements.
            </p>
          </Link>

          <Link
            href="/sundays"
            className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg border border-sage-light/50 transition-all duration-300 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sage-light to-sage/30 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-sage">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 className="font-display text-xl font-semibold text-stone-800 mb-2">
              Sunday Services
            </h2>
            <p className="text-stone-500 text-sm">
              Plan your weekly worship sets. Add songs, adjust keys, and print chord sheets.
            </p>
          </Link>
        </div>
      </section>

      <section className="bg-white/60 rounded-2xl p-8 border border-stone-100">
        <h2 className="font-display text-2xl font-semibold text-stone-800 mb-4 text-center">
          Quick Start
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-stone-600">
          <div className="text-center">
            <div className="w-8 h-8 rounded-full bg-gold-lighter text-gold font-bold flex items-center justify-center mx-auto mb-3">1</div>
            <h3 className="font-semibold text-stone-800 mb-1">Add Songs</h3>
            <p>Create songs with lyrics and place chords above the lines using the drag editor.</p>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 rounded-full bg-sage-light text-sage font-bold flex items-center justify-center mx-auto mb-3">2</div>
            <h3 className="font-semibold text-stone-800 mb-1">Plan Sundays</h3>
            <p>Pick songs from your library for each Sunday service and transpose to the right key.</p>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 rounded-full bg-sky-light text-sky font-bold flex items-center justify-center mx-auto mb-3">3</div>
            <h3 className="font-semibold text-stone-800 mb-1">Print &amp; Play</h3>
            <p>Print a clean chord sheet for your team — no UI clutter, just music.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
