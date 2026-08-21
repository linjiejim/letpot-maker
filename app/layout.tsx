import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "LetPot Maker";
const description = "Open maker tools and printable 3D accessories for people who want more from their LetPot.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const socialImage = new URL("/og-maker.png", origin).toString();
  return {
    title,
    description,
    icons: { icon: "/favicon.svg?v=2", shortcut: "/favicon.svg?v=2" },
    openGraph: {
      type: "website",
      title,
      description,
      images: [{ url: socialImage, width: 1672, height: 941, alt: "LetPot Maker printable 3D accessories and maker tools" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [socialImage] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
