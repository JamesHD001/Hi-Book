import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hi!Book — Connect Beyond Distance",
  description:
    "A global social network designed to help people understand and connect across countries, cultures, languages, and backgrounds.",
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
