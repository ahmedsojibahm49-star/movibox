// Browser-side API client (calls our Next.js proxy routes)
import type {
  Title,
  Suggestion,
  HomeData,
  Detail,
  StreamResult,
  CatalogType,
  SortKey,
} from "./types";

export interface MidnightData {
  picks: Title[];
  anime: Title[];
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Request failed: " + res.status);
  return res.json() as Promise<T>;
}

export const api = {
  home: () => getJSON<HomeData>("/api/home"),
  midnight: () => getJSON<MidnightData>("/api/midnight"),
  catalog: (type: CatalogType, page: number, sort: SortKey) =>
    getJSON<{ page: number; total: number; items: Title[]; hasMore: boolean }>(
      `/api/catalog?type=${type}&page=${page}&sort=${sort}`
    ),
  search: (q: string, page: number) =>
    getJSON<{ query: string; total: number; items: Title[]; hasMore: boolean }>(
      `/api/search?q=${encodeURIComponent(q)}&page=${page}`
    ),
  suggest: (q: string) =>
    getJSON<Suggestion[]>(`/api/suggest?q=${encodeURIComponent(q)}`),
  detail: (slug: string) =>
    getJSON<Detail>(`/api/detail/${encodeURIComponent(slug)}`),
  stream: (subjectId: string, slug: string, se: number, ep: number) =>
    getJSON<StreamResult>(
      `/api/stream/${subjectId}?slug=${encodeURIComponent(slug)}&se=${se}&ep=${ep}`
    ),
  captions: (subjectId: string, slug: string, se: number, ep: number) =>
    getJSON<unknown[]>(
      `/api/captions/${subjectId}?slug=${encodeURIComponent(slug)}&se=${se}&ep=${ep}`
    ),
};
