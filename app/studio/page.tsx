import type { Metadata } from "next";
import { Studio } from "../../components/Studio";
import { StructuredData } from "../../components/StructuredData";
import {
  absoluteUrl,
  createPageMetadata,
  getSiteUrl,
  SOURCE_REPOSITORY,
} from "../../lib/site-metadata";

const title = "Maker Studio — LetPot Maker";
const description =
  "Customize 80 print-ready LetPot accessories and export STL, OBJ, or Bambu 3MF files from the free browser-based 3D Maker Studio.";

export function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title,
    description,
    path: "/studio",
    imageAlt: "LetPot Maker Studio for customizing printable 3D garden accessories",
  });
}

export default async function StudioPage() {
  const siteUrl = await getSiteUrl();
  const url = absoluteUrl("/studio", siteUrl);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "LetPot Maker Studio",
    url,
    description,
    applicationCategory: "DesignApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires a modern browser with WebGL support",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
    codeRepository: SOURCE_REPOSITORY,
    featureList: [
      "Parametric 3D accessory customization",
      "STL and OBJ export",
      "Bambu Studio 3MF export",
      "Print-readiness guidance",
    ],
  };

  return (
    <>
      <StructuredData data={structuredData} />
      <Studio />
    </>
  );
}
