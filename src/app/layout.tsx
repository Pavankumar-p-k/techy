import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Student Tool Hub",
  description: "Free AI tools and useful student platforms with ratings, reviews, and profiles.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${jetBrainsMono.variable}`}>
        <div className="page-shell min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)]">
          <SiteHeader />
          <main className="min-h-[calc(100vh-150px)]">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
