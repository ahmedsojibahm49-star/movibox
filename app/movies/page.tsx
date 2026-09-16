import type { Metadata } from "next";
import { CatalogPage } from "@/components/browse/CatalogPage";

export const metadata: Metadata = { title: "Movies" };

export default function MoviesPage() {
  return <CatalogPage type="movies" title="Movies" />;
}
