import type { Metadata } from "next";
import { CatalogPage } from "@/components/browse/CatalogPage";

export const metadata: Metadata = { title: "Series" };

export default function SeriesPage() {
  return <CatalogPage type="series" title="Series" />;
}
