import type { Metadata } from "next";
import { Lora, Nunito, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Worship Chords & Lyrics",
  description: "Manage song lyrics and chords for your worship team",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${lora.variable} ${nunito.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-cream font-sans text-stone-800">
        <nav className="bg-white/80 backdrop-blur-sm border-b border-amber-100 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-200 to-amber-400 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-amber-800">
                    <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <span className="font-display text-lg font-semibold text-stone-800 hidden sm:block">
                  Worship Chords
                </span>
              </Link>

              <div className="flex items-center gap-1 sm:gap-2">
                <Link
                  href="/"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-amber-50 transition-colors"
                >
                  Home
                </Link>
                <Link
                  href="/songs"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-amber-50 transition-colors"
                >
                  Songs
                </Link>
                <Link
                  href="/sundays"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-amber-50 transition-colors"
                >
                  Sundays
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
