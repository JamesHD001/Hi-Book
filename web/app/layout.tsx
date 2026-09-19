import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Hi!Book — Connect Beyond Distance",
    template: "%s — Hi!Book",
  },
  description:
    "Hi!Book is a global social network designed to help people understand and connect across countries, cultures, languages, and backgrounds.",
};

export const viewport: Viewport = {
  themeColor: "#f7f3ea",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
