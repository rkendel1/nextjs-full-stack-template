import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FeltDB Full-Stack Next.js Starter",
  description: "A FeltDB-first starter integrating Next.js, AppPort services, AuthBoundry, and Runora.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
