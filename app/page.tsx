import type { Metadata } from "next";
import { LandingPage } from "../components/LandingPage";

export const metadata: Metadata = {
  title: "LetPot Maker — Find, remix and print 3D accessories",
  description: "Explore printable 3D assets, customize modular designs and make new accessories for your LetPot.",
};

export default function Home() {
  return <LandingPage />;
}
