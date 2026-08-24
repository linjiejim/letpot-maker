import type { MetadataRoute } from "next";
import { absoluteUrl, getSiteUrl } from "../lib/site-metadata";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = await getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: absoluteUrl("/sitemap.xml", siteUrl),
    host: siteUrl.origin,
  };
}
