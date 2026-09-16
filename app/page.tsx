"use client";
import * as React from "react";
import { Home as HomeIcon } from "lucide-react";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { ContentRow, rowHref } from "@/components/rows/ContentRow";
import { WideCard } from "@/components/cards/MovieCard";
import { Button, EmptyState } from "@/components/ui/primitives";
import { api } from "@/lib/api-client";
import { useStore, continueWatching } from "@/lib/store";
import type { HomeData, Title } from "@/lib/types";
import { libraryToTitle } from "@/lib/utils";

export default function HomePage() {
  const [data, setData] = React.useState<HomeData | null>(null);
  const [error, setError] = React.useState(false);
  const history = useStore((s) => s.history);
  const removeHistory = useStore((s) => s.removeHistory);
  const library = useStore((s) => s.library);

  const load = React.useCallback(() => {
    setError(false);
    api
      .home()
      .then(setData)
      .catch(() => setError(true));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const cw = continueWatching(history);

  const toWide = (e: (typeof cw)[number]) =>
    ({
      name: e.name,
      slug: e.slug,
      subjectId: e.subjectId,
      poster: e.poster,
    }) as Title;

  if (error && !data) {
    return (
      <div className="pt-24">
        <EmptyState
          icon={<HomeIcon size={28} />}
          title="Something went wrong"
          hint="Please try again."
          action={<Button onClick={load} icon={<HomeIcon size={15} />}>Try again</Button>}
        />
      </div>
    );
  }

  return (
    <div>
      {data ? (
        <HeroCarousel banner={data.banner} />
      ) : (
        <div className="h-[68vh] min-h-[480px] w-full bg-gradient-to-b from-white/5 to-base sm:h-[74vh]">
          <div className="container-site flex h-full items-center">
            <div className="w-full max-w-2xl">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton mt-4 h-12 w-4/5" />
              <div className="skeleton mt-3 h-4 w-3/5" />
              <div className="skeleton mt-5 h-4 w-full" />
              <div className="skeleton mt-2 h-4 w-2/3" />
              <div className="mt-7 flex gap-3">
                <div className="skeleton h-12 w-36" />
                <div className="skeleton h-12 w-32" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="-mt-2 sm:-mt-4">
        {cw.length > 0 && (
          <ContentRow
            label="Continue Watching"
            items={cw.map(toWide)}
            seeAllHref="/profile"
          >
            {cw.map((e) => (
              <WideCard
                key={e.slug + (e.se || 0) + "-" + (e.ep || 0)}
                t={toWide(e)}
                progress={e.progress}
                duration={e.duration}
                label={e.se && e.ep ? `S${e.se} · E${e.ep}` : undefined}
                onRemove={() => removeHistory(e.slug, e.se, e.ep)}
              />
            ))}
          </ContentRow>
        )}

        {library.length > 0 && (
          <ContentRow label="My Collection" items={library.map(libraryToTitle)} />
        )}

        {data?.sections.map((s) => (
          <ContentRow
            key={s.label}
            label={s.label}
            items={s.items}
            seeAllHref={rowHref(s.label)}
          />
        ))}
      </div>
    </div>
  );
}
