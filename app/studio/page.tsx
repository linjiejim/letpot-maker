import type { Metadata } from "next";
import { Studio } from "../../components/Studio";

const title = "Maker Studio — LetPot Maker";
const description = "Choose, customize and export print-ready 3D accessories for LetPot gardens.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, images: [] },
  twitter: { title, description, images: [] },
};

export default function StudioPage() {
  return <Studio />;
}
