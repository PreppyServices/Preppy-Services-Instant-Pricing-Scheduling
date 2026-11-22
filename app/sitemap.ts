import type { MetadataRoute } from "next";
import { SITEMAP_URLS } from "../lib/sitemapUrls";

export default function sitemap(): MetadataRoute.Sitemap {
  return SITEMAP_URLS.map((url) => ({
    url,
    changeFrequency: "weekly" as const,
    priority: url.endsWith("/storefront") ? 0.8 : 1,
  }));
}
