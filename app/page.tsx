import type { Metadata } from "next";
import { LandingPage } from "../components/LandingPage";
import { StructuredData } from "../components/StructuredData";
import {
  absoluteUrl,
  createPageMetadata,
  getSiteUrl,
  SITE_DESCRIPTION,
  SITE_NAME,
  SOCIAL_IMAGE_PATH,
  SOURCE_REPOSITORY,
} from "../lib/site-metadata";
import {
  ADAPTER_STANDARD,
  getDefaultShapeParameters,
  MODEL_LIBRARY,
} from "../lib/model-factory";

const title = "LetPot Maker — Customize & print 3D garden accessories";
const description =
  "Explore 80 printable LetPot accessories, customize modular 3D designs, and export STL, OBJ, or Bambu 3MF files in your browser.";
const landingModels = MODEL_LIBRARY.map((model) => ({
  id: model.id,
  number: model.number,
  name: model.name,
  subtitle: model.subtitle,
  parts: model.parts,
  style: model.style,
  tags: model.tags,
  officialMesh: model.officialMesh,
  defaults: model.defaults,
  shape: getDefaultShapeParameters(model),
}));

export function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({ title, description, path: "/" });
}

export default async function Home() {
  const siteUrl = await getSiteUrl();
  const homeUrl = absoluteUrl("/", siteUrl);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${homeUrl}#website`,
        url: homeUrl,
        name: SITE_NAME,
        alternateName: "LetPot 3D accessory maker",
        description: SITE_DESCRIPTION,
        inLanguage: "en",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${homeUrl}#application`,
        name: SITE_NAME,
        url: homeUrl,
        image: absoluteUrl(SOCIAL_IMAGE_PATH, siteUrl),
        description,
        applicationCategory: "DesignApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires a modern browser with WebGL support",
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: 0,
          priceCurrency: "USD",
        },
        codeRepository: SOURCE_REPOSITORY,
        license: `${SOURCE_REPOSITORY}/blob/main/LICENSE`,
      },
    ],
  };

  return (
    <>
      <StructuredData data={structuredData} />
      <LandingPage models={landingModels} adapterStandard={ADAPTER_STANDARD} />
    </>
  );
}
