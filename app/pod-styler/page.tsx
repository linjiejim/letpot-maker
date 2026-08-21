import type { Metadata } from "next";
import { PodStyler } from "../../components/PodStyler";

const title = "Pod Styler · LetPot Maker";
const description = "Place printable low-poly characters on a LetPot garden and preview the full setup before printing.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, images: [] },
  twitter: { title, description, images: [] },
};

export default function PodStylerPage() {
  return <PodStyler />;
}
