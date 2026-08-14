"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  CompanyContentDashboard,
  type ContentFocus,
} from "@/components/company-content-dashboard";
import { buildMockContentInsights } from "@/lib/content-insights-mock";
import { formatMetric } from "@/lib/content-insights";
import {
  ALLOCATION_LINK_LABEL,
  summarizeAllocationLinks,
  type AllocationLinkSummary,
} from "@/lib/creator-link";
import { demoAvatarUrl } from "@/lib/demo-avatars";
import { pickContentCoverUrl } from "@/lib/content-thumbnail";
import {
  allocationStatusDisplayLabel,
  type AllocationWithRelations,
  type Company,
  type CreatorLink,
} from "@/lib/types";

function visitKey(item: AllocationWithRelations) {
  return item.visit_date ? String(item.visit_date).slice(0, 10) : "";
}

function todayYmdKst() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function statusRank(item: AllocationWithRelations) {
  if (item.status === "picked_up" || item.picked_up_at) return 0;
  if (item.status === "visited" || item.status === "ready") return 1;
  if (item.status === "cancelled") return 3;
  return 2;
}

function formatKst(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

function formatHandle(item: AllocationWithRelations) {
  const raw =
    item.influencers?.instagram_handle_normalized ||
    item.influencers?.instagram_handle ||
    "";
  const n = raw.replace(/^@+/, "").trim();
  return n ? `@${n}` : "—";
}

function snsUrl(url?: string | null) {
  const raw = (url || "").trim();
  if (!raw) return null;
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function matchesSearch(item: AllocationWithRelations, q: string) {
  if (!q) return true;
  const hay = [
    item.influencers?.name,
    item.influencers?.instagram_handle,
    item.influencers?.instagram_handle_normalized,
    item.products?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function formatVisitLabel(ymd: string) {
  if (!ymd) return "날짜 미정";
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return `${m}월 ${d}일`;
}

function statusChipClass(item: AllocationWithRelations) {
  if (item.status === "cancelled") return "bg-[#f0ece6] text-[#8a8074]";
  if (item.status === "picked_up") return "bg-[#e7f3ea] text-[#2f6b3c]";
  if (item.status === "visited" || item.status === "ready") {
    return "bg-[#f8ecd8] text-[#8a4b12]";
  }
  return "bg-[#f5ede3] text-[#6b3b1f]";
}

function statusChipLabel(item: AllocationWithRelations) {
  if (item.status === "cancelled") return "취소";
  if (item.status === "picked_up") return "수령 완료";
  if (item.status === "pending") return "대기";
  return allocationStatusDisplayLabel(item);
}

function linkChipClass(sum: AllocationLinkSummary) {
  if (sum === "approved") return "bg-[#e7f3ea] text-[#2f6b3c]";
  if (sum === "reviewing") return "bg-[#f8ecd8] text-[#8a4b12]";
  if (sum === "rejected") return "bg-[#f8e4e4] text-[#9b2c2c]";
  return "bg-[#f0ece6] text-[#8a8074]";
}

function handleRaw(item: AllocationWithRelations) {
  return (
    item.influencers?.instagram_handle_normalized ||
    item.influencers?.instagram_handle ||
    ""
  )
    .replace(/^@+/, "")
    .trim();
}

function fallbackAvatarUrl(handle: string, name: string) {
  const seed = encodeURIComponent(handle || name || "creator");
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${seed}&backgroundColor=d4ebe1,e8eef0,f5ede3`;
}

/** 공개 초상(Wikimedia) → 없으면 Dicebear. */
function profileAvatarUrl(handle: string, name: string) {
  return demoAvatarUrl(handle) || fallbackAvatarUrl(handle, name);
}

function InfluencerAvatar({
  src,
  fallbackSrc,
  className,
  alt = "",
}: {
  src: string;
  fallbackSrc: string;
  className?: string;
  alt?: string;
}) {
  const [current, setCurrent] = useState(src);
  useEffect(() => {
    setCurrent(src);
  }, [src]);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      className={className}
      loading="lazy"
      draggable={false}
      referrerPolicy="no-referrer"
      onError={() => {
        if (current !== fallbackSrc) setCurrent(fallbackSrc);
      }}
    />
  );
}

type InfluencerBoardCard = {
  influencerId: string;
  name: string;
  handle: string;
  coverUrl: string | null;
  coverFallback: string;
  stores: string[];
  products: string[];
  latestVisit: string;
  hasToday: boolean;
  allocCount: number;
  primary: AllocationWithRelations;
  linkSum: AllocationLinkSummary;
  statusLabel: string;
  statusClass: string;
};

function buildInfluencerCards(
  items: AllocationWithRelations[],
  today: string,
): InfluencerBoardCard[] {
  const map = new Map<string, AllocationWithRelations[]>();
  for (const item of items) {
    const key = item.influencer_id || item.id;
    const list = map.get(key) || [];
    list.push(item);
    map.set(key, list);
  }

  const cards: InfluencerBoardCard[] = [];
  for (const [influencerId, rows] of map) {
    const sorted = [...rows].sort((a, b) => {
      const da = visitKey(a);
      const db = visitKey(b);
      if (da !== db) return db.localeCompare(da);
      return statusRank(a) - statusRank(b);
    });
    const primary = sorted[0];
    const handle = handleRaw(primary);
    const name = (primary.influencers?.name || "").trim() || handle || "인플루언서";
    const stores = [
      ...new Set(
        sorted.map((r) => r.stores?.name || "").filter(Boolean) as string[],
      ),
    ];
    const products = [
      ...new Set(
        sorted.map((r) => r.products?.name || "").filter(Boolean) as string[],
      ),
    ];
    const visits = sorted.map(visitKey).filter(Boolean);
    const latestVisit = visits[0] || "";
    const hasToday = visits.includes(today);
    const allLinks = sorted.flatMap((r) => r.creator_links || []);
    const linkSum = summarizeAllocationLinks(allLinks);
    const best =
      sorted.find((r) => r.status === "picked_up") ||
      sorted.find((r) => r.status === "visited" || r.status === "ready") ||
      primary;

    cards.push({
      influencerId,
      name,
      handle: handle ? `@${handle}` : "—",
      coverUrl: pickContentCoverUrl(allLinks, handle) || demoAvatarUrl(handle),
      coverFallback: fallbackAvatarUrl(handle, name),
      stores,
      products,
      latestVisit,
      hasToday,
      allocCount: sorted.length,
      primary,
      linkSum,
      statusLabel: statusChipLabel(best),
      statusClass: statusChipClass(best),
    });
  }

  return cards.sort((a, b) => {
    if (a.hasToday !== b.hasToday) return a.hasToday ? -1 : 1;
    return b.latestVisit.localeCompare(a.latestVisit);
  });
}

export function CompanyConsole({
  items,
}: {
  company: Company;
  items: AllocationWithRelations[];
}) {
  const [view, setView] = useState<"alloc" | "content">("alloc");
  const [period, setPeriod] = useState<"month" | "all">("month");
  const [searchQ, setSearchQ] = useState("");
  const [storeId, setStoreId] = useState("");
  const [status, setStatus] = useState("");
  const [linkFilter, setLinkFilter] = useState<
    "all" | "none" | "has" | "approved"
  >("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [contentFocus, setContentFocus] = useState<ContentFocus>(null);
  const deferredQ = useDeferredValue(searchQ.trim().toLowerCase());
  const today = todayYmdKst();
  const monthKey = today.slice(0, 7);

  const scoped = useMemo(() => {
    return items.filter((item) => {
      const d = visitKey(item);
      if (period === "month" && (!d || !d.startsWith(monthKey))) return false;
      return true;
    });
  }, [items, period, monthKey]);

  const counters = useMemo(() => {
    let total = 0;
    let visited = 0;
    let picked = 0;
    let linked = 0;
    for (const item of scoped) {
      if (item.status === "cancelled") continue;
      total += 1;
      if (item.status === "visited" || item.status === "ready") {
        visited += 1;
      }
      if (item.status === "picked_up") picked += 1;
      if (summarizeAllocationLinks(item.creator_links || []) === "approved") {
        linked += 1;
      }
    }
    return { total, visited, picked, linked };
  }, [scoped]);

  const insights = useMemo(
    () => buildMockContentInsights(items, period),
    [items, period],
  );

  const storeOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      if (item.store_id && item.stores?.name) {
        map.set(item.store_id, item.stores.name);
      }
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [items]);

  const filtered = useMemo(() => {
    const next = items.filter((item) => {
      const d = visitKey(item);
      if (period === "month" && (!d || !d.startsWith(monthKey))) return false;
      if (storeId && item.store_id !== storeId) return false;
      if (status === "visited") {
        if (item.status !== "visited" && item.status !== "ready") return false;
      } else if (status && item.status !== status) {
        return false;
      }
      if (!matchesSearch(item, deferredQ)) return false;
      const linkSum = summarizeAllocationLinks(item.creator_links || []);
      if (linkFilter === "none" && linkSum !== "none") return false;
      if (linkFilter === "has" && linkSum === "none") return false;
      if (linkFilter === "approved" && linkSum !== "approved") return false;
      return true;
    });
    return next.sort((a, b) => {
      const da = visitKey(a);
      const db = visitKey(b);
      if (da !== db) return db.localeCompare(da);
      const sa = statusRank(a);
      const sb = statusRank(b);
      if (sa !== sb) return sa - sb;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [items, period, monthKey, storeId, status, deferredQ, linkFilter]);

  const selected = items.find((i) => i.id === openId) || null;
  const related = selected
    ? items.filter((i) => i.influencer_id === selected.influencer_id)
    : [];

  const boardCards = useMemo(
    () => buildInfluencerCards(filtered, today),
    [filtered, today],
  );

  const counterActive = {
    all: status === "" && linkFilter === "all",
    visited: status === "visited" && linkFilter === "all",
    picked: status === "picked_up" && linkFilter === "all",
    linked: linkFilter === "approved" && status === "",
  };

  function applyCounter(key: "all" | "visited" | "picked" | "linked") {
    if (key === "all" || counterActive[key]) {
      setStatus("");
      setLinkFilter("all");
      return;
    }
    if (key === "visited") {
      setStatus("visited");
      setLinkFilter("all");
      return;
    }
    if (key === "picked") {
      setStatus("picked_up");
      setLinkFilter("all");
      return;
    }
    setStatus("");
    setLinkFilter("approved");
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function openAllocFromContent(opts: {
    allocationId?: string | null;
    search: string;
  }) {
    setView("alloc");
    setSearchQ(opts.search);
    setStoreId("");
    setStatus("");
    setLinkFilter("all");
    setOpenId(opts.allocationId || null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div
          className="flex rounded-full border border-[var(--line)] bg-white p-0.5"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === "alloc"}
            onClick={() => setView("alloc")}
            className={`rounded-full px-3.5 py-2 text-xs font-semibold ${
              view === "alloc"
                ? "bg-[var(--accent)] !text-white"
                : "text-[var(--muted)]"
            }`}
          >
            배정 현황
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "content"}
            onClick={() => setView("content")}
            className={`rounded-full px-3.5 py-2 text-xs font-semibold ${
              view === "content"
                ? "bg-[var(--accent)] !text-white"
                : "text-[var(--muted)]"
            }`}
          >
            콘텐츠
          </button>
        </div>
        <div
          className="flex rounded-full border border-[var(--line)] bg-white p-0.5"
          role="group"
        >
          <button
            type="button"
            aria-pressed={period === "month"}
            onClick={() => setPeriod("month")}
            className={`rounded-full px-3.5 py-2 text-xs font-semibold ${
              period === "month"
                ? "bg-[var(--accent)] !text-white"
                : "text-[var(--muted)]"
            }`}
          >
            이번달
          </button>
          <button
            type="button"
            aria-pressed={period === "all"}
            onClick={() => setPeriod("all")}
            className={`rounded-full px-3.5 py-2 text-xs font-semibold ${
              period === "all"
                ? "bg-[var(--accent)] !text-white"
                : "text-[var(--muted)]"
            }`}
          >
            전체
          </button>
        </div>
      </div>

      {view === "content" ? (
        <CompanyContentDashboard
          snapshot={insights}
          focus={contentFocus}
          onFocus={setContentFocus}
          onOpenAllocation={openAllocFromContent}
        />
      ) : (
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1.9fr)_minmax(280px,0.7fr)]">
        <div className="flex min-h-0 flex-col gap-3">
      <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["all", "배정", counters.total, counterActive.all],
            ["visited", "방문 완료", counters.visited, counterActive.visited],
            ["picked", "수령 완료", counters.picked, counterActive.picked],
            ["linked", "링크 제출", counters.linked, counterActive.linked],
          ] as const
        ).map(([key, label, value, active]) => (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => applyCounter(key)}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              active
                ? "border-[var(--accent)] bg-white"
                : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--accent)]/50"
            }`}
          >
            <p className="text-xs text-[var(--muted)]">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--accent)]">
              {value}
              <span className="ml-1 text-sm font-medium text-[var(--muted)]">
                건
              </span>
            </p>
          </button>
        ))}
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        <input
          className="h-10 min-w-[12rem] flex-1 rounded-xl border border-[var(--line)] bg-white px-3 text-sm"
          placeholder="인플루언서 · 상품 검색"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
        />
        <select
          className="h-10 rounded-xl border border-[var(--line)] bg-white px-3 text-sm"
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
        >
          <option value="">매장 전체</option>
          {storeOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-xl border border-[var(--line)] bg-white px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">진행 상태</option>
          <option value="pending">대기</option>
          <option value="visited">방문 완료</option>
          <option value="picked_up">수령 완료</option>
          <option value="cancelled">취소</option>
        </select>
        <button
          type="button"
          onClick={() =>
            setLinkFilter((v) =>
              v === "all" ? "has" : v === "has" ? "none" : "all",
            )
          }
          className={`h-10 rounded-xl border px-3 text-sm font-medium ${
            linkFilter === "all"
              ? "border-[var(--line)] text-[var(--muted)]"
              : "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
          }`}
        >
          링크{" "}
          {linkFilter === "all"
            ? "전체"
            : linkFilter === "none"
              ? "미제출"
              : linkFilter === "approved"
                ? "제출 완료"
                : "제출"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 sm:p-4">
        {boardCards.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
            조건에 맞는 배정이 없습니다.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {boardCards.map((card) => {
              const selectedActive =
                selected?.influencer_id === card.influencerId;
              return (
                <button
                  key={card.influencerId}
                  type="button"
                  onClick={() =>
                    setOpenId((id) =>
                      id === card.primary.id ? null : card.primary.id,
                    )
                  }
                  className={`flex flex-col overflow-hidden rounded-2xl border text-left transition ${
                    selectedActive
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]/50 shadow-sm"
                      : "border-[var(--line)] bg-white hover:border-[var(--accent)]/45 hover:bg-[var(--accent-soft)]/25"
                  }`}
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--accent-soft)]">
                    {card.coverUrl ? (
                      <InfluencerAvatar
                        src={card.coverUrl}
                        fallbackSrc={card.coverFallback}
                        alt=""
                        className="h-full w-full object-cover object-center"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-[var(--accent-soft)] to-[#dfe8e3] px-4 text-center">
                        <p className="text-sm font-medium text-[var(--ink)]">
                          {card.name}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          제출 콘텐츠 없음
                        </p>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0b1712]/75 to-transparent px-2.5 pb-2 pt-8">
                      <p className="truncate text-sm font-semibold text-white">
                        {card.name}
                      </p>
                      <p className="truncate text-[11px] text-white/85">
                        {card.handle}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${card.statusClass}`}
                      >
                        {card.statusLabel}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${linkChipClass(card.linkSum)}`}
                      >
                        {ALLOCATION_LINK_LABEL[card.linkSum]}
                      </span>
                      {card.hasToday ? (
                        <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[11px] font-semibold !text-white">
                          오늘
                        </span>
                      ) : null}
                    </div>
                    <dl className="space-y-1 text-[11px] text-[var(--muted)]">
                      <div className="flex gap-2">
                        <dt className="w-10 shrink-0">매장</dt>
                        <dd className="min-w-0 font-medium text-[var(--ink)]">
                          {card.stores.length > 0
                            ? card.stores.join(" · ")
                            : "—"}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="w-10 shrink-0">방문</dt>
                        <dd className="font-medium text-[var(--ink)]">
                          {formatVisitLabel(card.latestVisit)}
                          {card.allocCount > 1
                            ? ` · 배정 ${card.allocCount}건`
                            : ""}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="w-10 shrink-0">상품</dt>
                        <dd className="min-w-0 truncate font-medium text-[var(--ink)]">
                          {card.products.length > 0
                            ? card.products.slice(0, 2).join(" · ")
                            : "—"}
                          {card.products.length > 2
                            ? ` 외 ${card.products.length - 2}`
                            : ""}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

        </div>

        <aside className="min-h-[50vh] min-w-0 overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm lg:min-h-0">
          {selected ? (
            <CompanyInfPanel
              item={selected}
              related={related}
              insight={
                insights.posts.find((p) => p.allocationId === selected.id) ||
                null
              }
              onClose={() => setOpenId(null)}
              onSelect={(id) => setOpenId(id)}
              onOpenContent={(postId) => {
                setView("content");
                setContentFocus({ kind: "post", id: postId });
              }}
            />
          ) : (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
              <p className="text-base font-medium text-[var(--ink)]">
                카드를 선택하면 상세가 여기에 표시됩니다
              </p>
              <p className="mt-2 text-sm leading-5 text-[var(--muted)]">
                보드에서 인플루언서를 선택하세요
              </p>
            </div>
          )}
        </aside>
      </div>
      )}
    </div>
  );
}

function CompanyInfPanel({
  item,
  related,
  insight,
  onClose,
  onSelect,
  onOpenContent,
}: {
  item: AllocationWithRelations;
  related: AllocationWithRelations[];
  insight: {
    id: string;
    views: number;
    likes: number;
    comments: number;
    source: "mock" | "apify";
  } | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onOpenContent: (postId: string) => void;
}) {
  const [relatedOpen, setRelatedOpen] = useState(false);
  useEffect(() => {
    setRelatedOpen(false);
  }, [item.influencer_id]);
  const handle = formatHandle(item);
  const handleKey = handleRaw(item);
  const name = (item.influencers?.name || "").trim() || handleKey || "인플루언서";
  const sns = snsUrl(item.influencers?.sns_url);
  const links = (item.creator_links || []) as CreatorLink[];
  const linkSum = summarizeAllocationLinks(links);
  const avatarUrl = profileAvatarUrl(handleKey, name);
  const avatarFallback = fallbackAvatarUrl(handleKey, name);

  return (
    <div>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <InfluencerAvatar
              src={avatarUrl}
              fallbackSrc={avatarFallback}
              alt={name}
              className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-[var(--line)]"
            />
            <div className="min-w-0">
              <p className="text-xs tracking-[0.18em] text-[var(--muted)] uppercase">
                Influencer
              </p>
              <h3 className="mt-1 text-2xl font-bold text-[var(--ink)]">
                {item.influencers?.name || handle}
              </h3>
              <p className="mt-1 text-[var(--accent)]">{handle}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusChipClass(item)}`}
                >
                  {statusChipLabel(item)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${linkChipClass(linkSum)}`}
                >
                  {ALLOCATION_LINK_LABEL[linkSum]}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[var(--muted)]"
          >
            닫기
          </button>
        </div>

        {sns ? (
          <a
            href={sns}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-5 inline-flex rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold !text-white"
          >
            SNS 프로필
          </a>
        ) : null}

        <dl className="grid gap-3 rounded-2xl bg-[var(--accent-soft)]/50 px-4 py-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--muted)]">상품</dt>
            <dd className="mt-1 font-semibold">
              {item.products?.name || "상품"}
              {item.products?.sku ? (
                <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                  SKU {item.products.sku}
                </span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">수량</dt>
            <dd className="mt-1 font-semibold">{item.quantity}개</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">매장</dt>
            <dd className="mt-1">{item.stores?.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">방문 예정일</dt>
            <dd className="mt-1">{formatVisitLabel(visitKey(item))}</dd>
          </div>
          {item.visit_code ? (
            <div>
              <dt className="text-xs text-[var(--muted)]">방문 코드</dt>
              <dd className="mt-1">{item.visit_code}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-[var(--muted)]">최초 방문</dt>
            <dd className="mt-1 text-sm">{formatKst(item.verified_at)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">최근 방문</dt>
            <dd className="mt-1 text-sm">{formatKst(item.last_visited_at)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">수령일시</dt>
            <dd className="mt-1 text-sm">{formatKst(item.picked_up_at)}</dd>
          </div>
        </dl>

        {insight ? (
          <div className="mt-5 rounded-2xl border border-[var(--line)] px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">콘텐츠 성과</h4>
              <span className="text-[11px] text-[var(--muted)]">
                {insight.source === "mock" ? "미리보기" : "수집"}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <dt className="text-[11px] text-[var(--muted)]">조회</dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums">
                  {formatMetric(insight.views)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--muted)]">좋아요</dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums">
                  {formatMetric(insight.likes)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--muted)]">댓글</dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums">
                  {formatMetric(insight.comments)}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => onOpenContent(insight.id)}
              className="mt-3 w-full rounded-xl border border-[var(--line)] px-3 py-2 text-xs font-medium"
            >
              콘텐츠 대시보드에서 보기
            </button>
          </div>
        ) : null}

        <div className="mt-5">
          <h4 className="mb-2 text-sm font-semibold">콘텐츠 링크</h4>
          {links.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">제출된 링크가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {links.map((link) => (
                <li
                  key={link.id}
                  className="rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm"
                >
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-[var(--accent)] underline"
                  >
                    {link.url}
                  </a>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {link.platform} ·{" "}
                    {
                      ALLOCATION_LINK_LABEL[
                        link.status === "approved"
                          ? "approved"
                          : link.status === "submitted"
                            ? "reviewing"
                            : "rejected"
                      ]
                    }{" "}
                    · {formatKst(link.submitted_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {related.length > 1 ? (
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setRelatedOpen((v) => !v)}
              className="w-full rounded-xl border border-[var(--line)] px-4 py-3 text-left text-sm"
            >
              이 인플루언서 자사 배정 {related.length}건{" "}
              {relatedOpen ? "▲" : "▼"}
            </button>
            {relatedOpen ? (
              <ul className="mt-2 space-y-2">
                {related.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(row.id)}
                      className={`w-full rounded-xl border px-4 py-3 text-left text-sm ${
                        row.id === item.id
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : "border-[var(--line)]"
                      }`}
                    >
                      {row.products?.name || "상품"} ·{" "}
                      {formatVisitLabel(visitKey(row))} ·{" "}
                      {allocationStatusDisplayLabel(row)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
    </div>
  );
}
