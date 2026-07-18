import Link from "next/link";
import { getAllSundaysOptimized, getAllSongTitles, ensureUpcomingSundays } from "@/lib/store";
import { formatDateDisplay, generateUpcomingSundays } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function SundaysPage() {
  const upcomingDates = generateUpcomingSundays(52);
  await ensureUpcomingSundays(upcomingDates);
  const [sundays, songTitles] = await Promise.all([
    getAllSundaysOptimized(),
    getAllSongTitles(),
  ]);
  const songMap = new Map(songTitles.map((s) => [s.id, s.title]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-stone-800">
          Sunday Services
        </h1>
        <p className="text-stone-500 mt-1">
          Plan worship sets for upcoming Sundays
        </p>
      </div>

      <div className="grid gap-4">
        {sundays.map((sunday) => {
          const { day, month, year, full } = formatDateDisplay(sunday.date);
          const hasSongs = sunday.songs.length > 0;

          return (
            <Link
              key={sunday.date}
              href={`/sundays/${sunday.date}`}
              className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-100 hover:border-gold-light hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4 sm:gap-6">
                {/* Date display */}
                <div className="text-center shrink-0 w-16 sm:w-20">
                  <div className="text-xs text-stone-400 uppercase tracking-wide font-medium">
                    {month}
                  </div>
                  <div className="font-display text-3xl sm:text-4xl font-bold text-stone-800 group-hover:text-gold transition-colors leading-none mt-0.5">
                    {day}
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">{year}</div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg font-semibold text-stone-800 group-hover:text-gold transition-colors">
                    {full}
                  </h3>
                  {hasSongs ? (
                    <div className="mt-2 space-y-1">
                      {sunday.songs.map((ss, i) => (
                        <div key={ss.songId} className="flex items-center gap-2 text-sm text-stone-500">
                          <span className="w-5 h-5 rounded-full bg-gold-lighter text-amber-700 text-xs font-medium flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <span className="truncate">
                            {songMap.get(ss.songId) || "Unknown song"}
                          </span>
                          <span className="text-xs text-stone-400">({ss.keyOverride})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-stone-400 mt-2 italic">
                      No songs planned yet — click to add songs
                    </p>
                  )}
                </div>

                {/* Arrow */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="text-stone-300 group-hover:text-gold transition-colors shrink-0 mt-2"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
