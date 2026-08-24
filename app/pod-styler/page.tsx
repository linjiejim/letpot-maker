import type { Metadata } from "next";
import { PodStyler } from "../../components/PodStyler";
import { StructuredData } from "../../components/StructuredData";
import { absoluteUrl, createPageMetadata, getSiteUrl } from "../../lib/site-metadata";

const title = "LetPot Pod Styler — Preview printable 3D accessories";
const description =
  "Arrange printable low-poly accessories on four LetPot indoor garden layouts and preview the complete setup in an interactive 3D tool.";

export function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title,
    description,
    path: "/pod-styler",
    imageAlt: "LetPot Pod Styler interactive 3D accessory layout tool",
  });
}

export default async function PodStylerPage() {
  const siteUrl = await getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "LetPot Pod Styler",
    url: absoluteUrl("/pod-styler", siteUrl),
    description,
    applicationCategory: "DesignApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires a modern browser with WebGL support",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
    featureList: [
      "Four LetPot garden layouts",
      "Interactive 3D pod placement",
      "Printable low-poly accessory library",
      "Multi-pod arrangement preview",
    ],
  };

  return (
    <>
      <StructuredData data={structuredData} />
      <PodStyler />
    </>
  );
}
