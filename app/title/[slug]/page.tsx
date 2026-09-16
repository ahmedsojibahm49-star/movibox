"use client";
import { Suspense } from "react";
import { DetailClient, DetailSkeleton } from "@/components/detail/DetailClient";

export default function TitlePage({ params }: { params: { slug: string } }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <DetailClient slug={params.slug} />
    </Suspense>
  );
}
