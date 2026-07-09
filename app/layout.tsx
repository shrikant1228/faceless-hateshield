import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Faceless — Arenas without identities",
  description: "Group chat, no names attached. Enter an arena with a room code.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
