import type { MetadataRoute } from "next";
import { absoluteUrl, getSiteUrl } from "../lib/site-metadata";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = await getSiteUrl();
  const routes = ["/", "/studio", "/pod-styler"];

  return routes.map((route) => ({ url: absoluteUrl(route, siteUrl) }));
}
