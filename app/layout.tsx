import type { Metadata } from "next";
import "./globals.css";
import { EventAudio } from "@/components/event-audio";

export const metadata: Metadata = {
  title: "RV University | Guest attendance",
  description: "RV University guest attendance registry"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <EventAudio />
        {children}
      </body>
    </html>
  );
}
