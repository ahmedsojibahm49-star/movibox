import type { Metadata } from "next";
import { CatalogPage } from "@/components/browse/CatalogPage";

export const metadata: Metadata = { title: "Anime" };

export default function AnimePage() {
  return <CatalogPage type="anime" title="Anime" />;
}
