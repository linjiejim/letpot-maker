import type { Metadata } from "next";
import { headers } from "next/headers";

export const SITE_NAME = "LetPot Maker";
export const SITE_DESCRIPTION =
  "Open-source browser tools and printable 3D accessories for customizing LetPot indoor gardens.";
export const SOCIAL_IMAGE_PATH = "/og-maker.png";
export const SOCIAL_IMAGE_ALT =
  "LetPot Maker library of printable 3D accessories and browser-based maker tools";
export const SOURCE_REPOSITORY = "https://github.com/linjiejim/letpot-maker";

const LOCAL_SITE_URL = "http://localhost:3000";

function normalizeSiteUrl(value: string | null | undefined): URL | null {
  if (!value?.trim()) return null;

  const candidate = value.includes("://") ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function configuredSiteUrl(): URL | null {
  return normalizeSiteUrl(
    process.env.LETPOT_SITE_URL
      ?? process.env.VERCEL_PROJECT_PRODUCTION_URL
      ?? process.env.CF_PAGES_URL
      ?? process.env.VERCEL_URL,
  );
}

function firstForwardedValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || null;
}

/**
 * Resolve the public origin from an explicit production setting first and the
 * current request second. This keeps canonical URLs correct behind a reverse
 * proxy while still making metadata routes useful in local development.
 */
export async function getSiteUrl(): Promise<URL> {
  const configured = configuredSiteUrl();
  if (configured) return configured;

  const requestHeaders = await headers();
  const host = firstForwardedValue(requestHeaders.get("x-forwarded-host"))
    ?? firstForwardedValue(requestHeaders.get("host"));
  const forwardedProtocol = firstForwardedValue(requestHeaders.get("x-forwarded-proto"));
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : host?.startsWith("localhost") || host?.startsWith("127.0.0.1")
      ? "http"
      : "https";

  return normalizeSiteUrl(host ? `${protocol}://${host}` : null)
    ?? new URL(LOCAL_SITE_URL);
}

export function absoluteUrl(path: string, siteUrl: URL) {
  return new URL(path, siteUrl).toString();
}

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  imageAlt?: string;
};

export async function createPageMetadata({
  title,
  description,
  path,
  imageAlt = SOCIAL_IMAGE_ALT,
}: PageMetadataOptions): Promise<Metadata> {
  const siteUrl = await getSiteUrl();
  const canonical = absoluteUrl(path, siteUrl);
  const socialImage = absoluteUrl(SOCIAL_IMAGE_PATH, siteUrl);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: canonical,
      siteName: SITE_NAME,
      title,
      description,
      images: [{
        url: socialImage,
        width: 1672,
        height: 941,
        alt: imageAlt,
        type: "image/png",
      }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: socialImage, alt: imageAlt }],
    },
  };
}
