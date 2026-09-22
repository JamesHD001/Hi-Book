import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-hibook",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Hi!Book — Connect Beyond Distance",
    template: "%s — Hi!Book",
  },
  description:
    "Hi!Book is a global social network designed to help people understand and connect across countries, cultures, languages, and backgrounds.",
};

export const viewport: Viewport = {
  themeColor: "#00B8A9",
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={figtree.variable}>{children}</body>
    </html>
  );
}
