import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RV University | Guest attendance",
  description: "RV University guest attendance registry"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
