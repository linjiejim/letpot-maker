import type { Metadata, Viewport } from "next";
import "./globals.css";
import {
  absoluteUrl,
  getSiteUrl,
  SITE_DESCRIPTION,
  SITE_NAME,
  SOCIAL_IMAGE_ALT,
  SOCIAL_IMAGE_PATH,
} from "../lib/site-metadata";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#ffffff",
};

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = await getSiteUrl();
  const socialImage = absoluteUrl(SOCIAL_IMAGE_PATH, siteUrl);
  const googleVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const bingVerification = process.env.BING_SITE_VERIFICATION?.trim();

  return {
    metadataBase: siteUrl,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    creator: "LetPot Maker contributors",
    publisher: "LetPot Maker contributors",
    category: "3D design and printing",
    referrer: "origin-when-cross-origin",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    alternates: { canonical: siteUrl },
    icons: { icon: "/favicon.svg?v=2", shortcut: "/favicon.svg?v=2" },
    manifest: "/manifest.webmanifest",
    verification: googleVerification || bingVerification ? {
      ...(googleVerification ? { google: googleVerification } : {}),
      ...(bingVerification ? { other: { "msvalidate.01": bingVerification } } : {}),
    } : undefined,
    openGraph: {
      type: "website",
      locale: "en_US",
      url: siteUrl,
      siteName: SITE_NAME,
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [{
        url: socialImage,
        width: 1672,
        height: 941,
        alt: SOCIAL_IMAGE_ALT,
        type: "image/png",
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [{ url: socialImage, alt: SOCIAL_IMAGE_ALT }],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
