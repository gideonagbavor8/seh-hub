import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

// Display face — a warm, slightly bookish serif for headings and numerals.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

// Body face — high legibility at small sizes on low-end phones.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SEH Hub",
    template: "%s | SEH Hub",
  },
  description:
    "School-Home Engagement Hub — announcements, messages and school updates for parents, teachers and students.",
  applicationName: "SEH Hub",
};

// Light is the default, so the browser chrome colour matches the light canvas.
export const viewport: Viewport = {
  themeColor: "#FDFCF9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        {/* Applies a stored dark preference before first paint, so a dark-mode
            user never sees a flash of the light palette. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-canvas text-ink">{children}</body>
    </html>
  );
}
