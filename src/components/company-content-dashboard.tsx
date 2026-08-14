"use client";

import { useMemo, useState } from "react";
import { type CreatorPlatform } from "@/lib/creator-link";
import {
  engagementRate,
  formatMetric,
  type ContentInfluencerInsight,
  type ContentInsightsSnapshot,
  type ContentPostInsight,
  type ContentProductInsight,
} from "@/lib/content-insights";
import {
  countryOf,
  platformOf,
  type ContentCountryCode,
} from "@/lib/content-market";
import { contentThumbnailProxyUrl } from "@/lib/content-thumbnail";

export type ContentFocus =
  | { kind: "product"; productId: string }
  | { kind: "influencer"; influencerId: string }
  | { kind: "post"; id: string }
  | null;

type CountryFilter = ContentCountryCode | "all";
type PlatformFilter = CreatorPlatform | "all";

function ymdKst(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDaysYmd(ymd: string, days: number) {
  const [year, month, day] = ymd.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

function formatMdMidnight(ymd: string) {
  const [, month, day] = ymd.split("-").map(Number);
  return `${month}월 ${day}일 00:00`;
}

function contentRefreshCopy(source: ContentInsightsSnapshot["source"]) {
  const today = ymdKst();
  const todayLabel = formatMdMidnight(today);
  if (source === "mock") {
    return `${todayLabel} 기준 · ${formatMdMidnight(addDaysYmd(today, 1))}에 데이터를 갱신합니다.`;
  }
  return `${todayLabel} 수집 데이터`;
}

function summarizeMarkets(posts: ContentPostInsight[]) {
  const countries = new Map<
    ContentCountryCode,
    { posts: number; views: number }
  >();
  const platforms = new Map<
    CreatorPlatform,
    { posts: number; views: number }
  >();

  for (const post of posts) {
    const c = countries.get(post.countryCode) || { posts: 0, views: 0 };
    c.posts += 1;
    c.views += post.views;
    countries.set(post.countryCode, c);

    const p = platforms.get(post.platform) || { posts: 0, views: 0 };
    p.posts += 1;
    p.views += post.views;
    platforms.set(post.platform, p);
  }

  return {
    countries: [...countries.entries()]
      .map(([code, stats]) => ({ code, ...stats }))
      .sort((a, b) => b.views - a.views),
    platforms: [...platforms.entries()]
      .map(([platform, stats]) => ({ platform, ...stats }))
      .sort((a, b) => b.views - a.views),
  };
}

export function CompanyContentDashboard({
  snapshot,
  focus,
  onFocus,
  onOpenAllocation,
}: {
  snapshot: ContentInsightsSnapshot;
  focus: ContentFocus;
  onFocus: (next: ContentFocus) => void;
  onOpenAllocation: (opts: {
    allocationId?: string | null;
    search: string;
  }) => void;
}) {
  const [countryFilter, setCountryFilter] = useState<CountryFilter>("all");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");

  const markets = useMemo(
    () => summarizeMarkets(snapshot.posts),
    [snapshot.posts],
  );

  const filteredPosts = useMemo(
    () =>
      snapshot.posts.filter((post) => {
        if (countryFilter !== "all" && post.countryCode !== countryFilter) {
          return false;
        }
        if (platformFilter !== "all" && post.platform !== platformFilter) {
          return false;
        }
        return true;
      }),
    [snapshot.posts, countryFilter, platformFilter],
  );

  const filteredProducts = useMemo(() => {
    const map = new Map<string, ContentProductInsight & { codes: Set<string>; platforms: Set<CreatorPlatform> }>();
    for (const post of filteredPosts) {
      const key = post.productId || post.productName;
      const row = map.get(key) || {
        productId: post.productId || key,
        productName: post.productName,
        posts: 0,
        views: 0,
        likes: 0,
        comments: 0,
        influencerCount: 0,
        codes: new Set<string>(),
        platforms: new Set<CreatorPlatform>(),
      };
      row.posts += 1;
      row.views += post.views;
      row.likes += post.likes;
      row.comments += post.comments;
      if (post.influencerId) row.codes.add(post.influencerId);
      row.platforms.add(post.platform);
      map.set(key, row);
    }
    return [...map.values()]
      .map(({ codes, platforms, ...row }) => ({
        ...row,
        influencerCount: codes.size,
        countryCodes: [...new Set(filteredPosts.filter((p) => (p.productId || p.productName) === (row.productId || row.productName)).map((p) => p.countryCode))],
        platforms: [...platforms],
      }))
      .sort((a, b) => b.views - a.views);
  }, [filteredPosts]);

  const maxProductViews = filteredProducts[0]?.views || 1;

  const selectedPost =
    focus?.kind === "post"
      ? snapshot.posts.find((p) => p.id === focus.id) || null
      : null;
  const selectedProduct =
    focus?.kind === "product"
      ? filteredProducts.find((p) => p.productId === focus.productId) || null
      : selectedPost
        ? filteredProducts.find((p) => p.productId === selectedPost.productId) ||
          null
        : null;
  const selectedInfluencer =
    focus?.kind === "influencer"
      ? snapshot.influencers.find((p) => p.influencerId === focus.influencerId) ||
        null
      : selectedPost
        ? snapshot.influencers.find(
            (p) => p.influencerId === selectedPost.influencerId,
          ) || null
        : null;

  return (
    <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1.9fr)_minmax(280px,0.7fr)]">
      <div className="flex min-h-0 flex-col gap-3">
        <p className="shrink-0 text-xs text-[var(--muted)]">
          {contentRefreshCopy(snapshot.source)}
        </p>

        <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="조회수" value={formatMetric(snapshot.totals.views)} />
          <Kpi label="좋아요" value={formatMetric(snapshot.totals.likes)} />
          <Kpi label="콘텐츠" value={`${snapshot.totals.posts}`} unit="건" />
          <Kpi
            label="인플루언서"
            value={`${snapshot.totals.influencers}`}
            unit="명"
          />
        </div>

        {snapshot.posts.length === 0 ? (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-6 py-12 text-center">
            <div>
              <p className="font-medium text-[var(--ink)]">
                아직 성과로 볼 콘텐츠가 없습니다
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                수령·링크 등록이 쌓이면 국가·채널별 성과가 여기에 표시됩니다.
              </p>
            </div>
          </div>
        ) : (
          <>
            <section className="shrink-0 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-[var(--muted)]">
                  국가
                </span>
                <FilterChip
                  active={countryFilter === "all"}
                  onClick={() => setCountryFilter("all")}
                >
                  전체
                </FilterChip>
                {markets.countries.map(({ code, posts, views }) => {
                  const c = countryOf(code);
                  return (
                    <FilterChip
                      key={code}
                      active={countryFilter === code}
                      onClick={() => setCountryFilter(code)}
                    >
                      {c.flag} {c.label}
                      <span className="text-[var(--muted)]">
                        {posts}건 · {formatMetric(views)}
                      </span>
                    </FilterChip>
                  );
                })}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-2.5">
                <span className="text-xs font-medium text-[var(--muted)]">
                  채널
                </span>
                <FilterChip
                  active={platformFilter === "all"}
                  onClick={() => setPlatformFilter("all")}
                >
                  전체
                </FilterChip>
                {markets.platforms.map(({ platform, posts, views }) => {
                  const p = platformOf(platform);
                  return (
                    <FilterChip
                      key={platform}
                      active={platformFilter === platform}
                      onClick={() => setPlatformFilter(platform)}
                    >
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${p.dotClass}`}
                      />
                      {p.label}
                      <span className="text-[var(--muted)]">
                        {posts}건 · {formatMetric(views)}
                      </span>
                    </FilterChip>
                  );
                })}
              </div>
            </section>

            <section className="min-h-0 overflow-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
              <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-[var(--accent-soft)] px-4 py-3">
                <h2 className="text-sm font-semibold">상품별 성과</h2>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {filteredProducts.length}개 상품 · 필터{" "}
                  {filteredPosts.length}건
                </p>
              </header>
              <ul className="divide-y divide-[var(--line)]">
                {filteredProducts.map((row) => {
                  const active =
                    focus?.kind === "product" &&
                    focus.productId === row.productId;
                  return (
                    <li key={row.productId}>
                      <button
                        type="button"
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                          active
                            ? "bg-[var(--accent-soft)]"
                            : "hover:bg-[var(--accent-soft)]/40"
                        }`}
                        onClick={() =>
                          onFocus({ kind: "product", productId: row.productId })
                        }
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="font-semibold">{row.productName}</p>
                            {row.countryCodes.map((code) => (
                              <CountryBadge key={code} code={code} />
                            ))}
                            {row.platforms.map((platform) => (
                              <PlatformBadge
                                key={platform}
                                platform={platform}
                              />
                            ))}
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--accent-soft)]">
                            <div
                              className="h-full rounded-full bg-[var(--accent)]"
                              style={{
                                width: `${Math.max(8, (row.views / maxProductViews) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                        <dl className="grid shrink-0 grid-cols-2 gap-x-4 gap-y-1 text-right text-xs tabular-nums">
                          <div>
                            <dt className="text-[var(--muted)]">조회</dt>
                            <dd className="font-semibold text-[var(--accent)]">
                              {formatMetric(row.views)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[var(--muted)]">좋아요</dt>
                            <dd className="font-semibold">
                              {formatMetric(row.likes)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[var(--muted)]">콘텐츠</dt>
                            <dd>{row.posts}건</dd>
                          </div>
                          <div>
                            <dt className="text-[var(--muted)]">인플</dt>
                            <dd>{row.influencerCount}명</dd>
                          </div>
                        </dl>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="min-h-0 flex-1 overflow-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
              <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-[var(--accent-soft)] px-4 py-3">
                <h2 className="text-sm font-semibold">콘텐츠 피드</h2>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  국가 · 채널 · 썸네일로 한눈에 확인
                </p>
              </header>
              {filteredPosts.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
                  선택한 필터에 맞는 콘텐츠가 없습니다.
                </p>
              ) : (
                <ul className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
                  {filteredPosts.slice(0, 24).map((post) => {
                    const active =
                      focus?.kind === "post" && focus.id === post.id;
                    return (
                      <li key={post.id}>
                        <button
                          type="button"
                          className={`flex w-full overflow-hidden rounded-xl border text-left transition ${
                            active
                              ? "border-[var(--accent)] bg-[var(--accent-soft)]/50 shadow-sm"
                              : "border-[var(--line)] bg-white hover:border-[var(--accent)]/45"
                          }`}
                          onClick={() => onFocus({ kind: "post", id: post.id })}
                        >
                          <div className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden bg-[var(--accent-soft)] sm:w-28">
                            <img
                              src={contentThumbnailProxyUrl(
                                post.url,
                                post.influencerHandle,
                              )}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
                            <div className="flex flex-wrap gap-1">
                              <CountryBadge code={post.countryCode} />
                              <PlatformBadge platform={post.platform} />
                            </div>
                            <div>
                              <p className="truncate text-sm font-semibold">
                                {post.productName}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                                {post.influencerName} · {post.influencerHandle}
                              </p>
                            </div>
                            <p className="line-clamp-2 text-xs text-[var(--muted)]">
                              {post.caption}
                            </p>
                            <div className="mt-auto flex items-end justify-between gap-2 text-xs tabular-nums">
                              <span className="font-semibold text-[var(--accent)]">
                                {formatMetric(post.views)} 조회
                              </span>
                              <span className="text-[var(--muted)]">
                                {formatMetric(post.likes)} 좋아요
                              </span>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      <aside className="min-h-[50vh] min-w-0 overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm lg:min-h-0">
        {selectedPost ? (
          <PostDetail
            post={selectedPost}
            onBack={() => onFocus(null)}
            onOpenAllocation={() =>
              onOpenAllocation({
                allocationId: selectedPost.allocationId,
                search: selectedPost.influencerHandle.replace(/^@/, ""),
              })
            }
          />
        ) : selectedProduct ? (
          <ProductDetail
            product={selectedProduct}
            posts={filteredPosts.filter(
              (p) => p.productId === selectedProduct.productId,
            )}
            onBack={() => onFocus(null)}
            onOpenAllocation={() =>
              onOpenAllocation({ search: selectedProduct.productName })
            }
            onSelectPost={(id) => onFocus({ kind: "post", id })}
          />
        ) : selectedInfluencer ? (
          <InfluencerDetail
            influencer={selectedInfluencer}
            posts={filteredPosts.filter(
              (p) => p.influencerId === selectedInfluencer.influencerId,
            )}
            onBack={() => onFocus(null)}
            onOpenAllocation={() =>
              onOpenAllocation({
                search: selectedInfluencer.handle.replace(/^@/, ""),
              })
            }
            onSelectPost={(id) => onFocus({ kind: "post", id })}
          />
        ) : (
          <InfluencerRank
            influencers={snapshot.influencers}
            onSelect={(influencerId) =>
              onFocus({ kind: "influencer", influencerId })
            }
          />
        )}
      </aside>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
        active
          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
          : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--accent)]/40"
      }`}
    >
      {children}
    </button>
  );
}

function CountryBadge({ code }: { code: ContentCountryCode }) {
  const c = countryOf(code);
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink)]">
      {c.flag} {c.label}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: CreatorPlatform }) {
  const p = platformOf(platform);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${p.chipClass}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${p.dotClass}`} />
      {p.label}
    </span>
  );
}

function AsideBack({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)]"
    >
      ← 뒤로
    </button>
  );
}

function Kpi({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-4">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--accent)]">
        {value}
        {unit ? (
          <span className="ml-1 text-sm font-medium text-[var(--muted)]">
            {unit}
          </span>
        ) : null}
      </p>
    </div>
  );
}

function PostDetail({
  post,
  onBack,
  onOpenAllocation,
}: {
  post: ContentPostInsight;
  onBack: () => void;
  onOpenAllocation: () => void;
}) {
  const er = engagementRate(post.views, post.likes, post.comments);
  return (
    <div>
      <AsideBack onBack={onBack} />
      <div className="flex flex-wrap gap-1.5">
        <CountryBadge code={post.countryCode} />
        <PlatformBadge platform={post.platform} />
      </div>
      <h3 className="mt-3 text-xl font-bold text-[var(--ink)]">
        {post.productName}
      </h3>
      <p className="mt-1 text-sm text-[var(--accent)]">
        {post.influencerName} · {post.influencerHandle}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">{post.storeName}</p>
      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--line)]">
        <img
          src={contentThumbnailProxyUrl(post.url, post.influencerHandle)}
          alt=""
          className="aspect-[4/5] w-full object-cover"
        />
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">{post.caption}</p>
      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-[var(--accent-soft)]/50 px-3 py-4 text-center">
        <div>
          <dt className="text-[11px] text-[var(--muted)]">조회</dt>
          <dd className="mt-1 font-semibold tabular-nums">
            {formatMetric(post.views)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-[var(--muted)]">좋아요</dt>
          <dd className="mt-1 font-semibold tabular-nums">
            {formatMetric(post.likes)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-[var(--muted)]">댓글</dt>
          <dd className="mt-1 font-semibold tabular-nums">
            {formatMetric(post.comments)}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-[var(--muted)]">
        참여율 {er.toFixed(1)}%
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex justify-center rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold !text-white"
        >
          {platformOf(post.platform).label}에서 열기
        </a>
        <button
          type="button"
          onClick={onOpenAllocation}
          className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-medium"
        >
          배정에서 보기
        </button>
      </div>
    </div>
  );
}

function ProductDetail({
  product,
  posts,
  onBack,
  onOpenAllocation,
  onSelectPost,
}: {
  product: ContentProductInsight & {
    countryCodes?: ContentCountryCode[];
    platforms?: CreatorPlatform[];
  };
  posts: ContentPostInsight[];
  onBack: () => void;
  onOpenAllocation: () => void;
  onSelectPost: (id: string) => void;
}) {
  return (
    <div>
      <AsideBack onBack={onBack} />
      <div className="flex flex-wrap gap-1.5">
        {(product.countryCodes || []).map((code) => (
          <CountryBadge key={code} code={code} />
        ))}
        {(product.platforms || []).map((platform) => (
          <PlatformBadge key={platform} platform={platform} />
        ))}
      </div>
      <h3 className="mt-3 text-xl font-bold text-[var(--ink)]">
        {product.productName}
      </h3>
      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-[var(--accent-soft)]/50 px-4 py-4">
        <div>
          <dt className="text-xs text-[var(--muted)]">조회수</dt>
          <dd className="mt-1 font-semibold tabular-nums">
            {formatMetric(product.views)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted)]">좋아요</dt>
          <dd className="mt-1 font-semibold tabular-nums">
            {formatMetric(product.likes)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted)]">콘텐츠</dt>
          <dd className="mt-1 font-semibold">{product.posts}건</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted)]">인플루언서</dt>
          <dd className="mt-1 font-semibold">{product.influencerCount}명</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={onOpenAllocation}
        className="mt-4 w-full rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-medium"
      >
        이 상품 배정 보기
      </button>
      <ul className="mt-4 space-y-2">
        {posts.map((post) => (
          <li key={post.id}>
            <button
              type="button"
              onClick={() => onSelectPost(post.id)}
              className="flex w-full items-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2.5 text-left text-sm"
            >
              <img
                src={contentThumbnailProxyUrl(
                  post.url,
                  post.influencerHandle,
                )}
                alt=""
                className="h-12 w-10 shrink-0 rounded-lg object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap gap-1">
                  <CountryBadge code={post.countryCode} />
                  <PlatformBadge platform={post.platform} />
                </span>
                <span className="mt-1 block truncate font-medium">
                  {post.influencerName}
                </span>
                <span className="text-xs text-[var(--muted)]">
                  {formatMetric(post.views)} 조회 · {formatMetric(post.likes)}{" "}
                  좋아요
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InfluencerDetail({
  influencer,
  posts,
  onBack,
  onOpenAllocation,
  onSelectPost,
}: {
  influencer: ContentInfluencerInsight;
  posts: ContentPostInsight[];
  onBack: () => void;
  onOpenAllocation: () => void;
  onSelectPost: (id: string) => void;
}) {
  const countries = [...new Set(posts.map((p) => p.countryCode))];
  const platforms = [...new Set(posts.map((p) => p.platform))];

  return (
    <div>
      <AsideBack onBack={onBack} />
      <div className="flex flex-wrap gap-1.5">
        {countries.map((code) => (
          <CountryBadge key={code} code={code} />
        ))}
        {platforms.map((platform) => (
          <PlatformBadge key={platform} platform={platform} />
        ))}
      </div>
      <h3 className="mt-3 text-xl font-bold text-[var(--ink)]">
        {influencer.name}
      </h3>
      <p className="mt-1 text-[var(--accent)]">{influencer.handle}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-[var(--accent-soft)]/50 px-4 py-4">
        <div>
          <dt className="text-xs text-[var(--muted)]">조회수</dt>
          <dd className="mt-1 font-semibold tabular-nums">
            {formatMetric(influencer.views)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted)]">좋아요</dt>
          <dd className="mt-1 font-semibold tabular-nums">
            {formatMetric(influencer.likes)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted)]">콘텐츠</dt>
          <dd className="mt-1 font-semibold">{influencer.posts}건</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted)]">상품</dt>
          <dd className="mt-1 text-sm">{influencer.productNames.join(", ")}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={onOpenAllocation}
        className="mt-4 w-full rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-medium"
      >
        이 인플루언서 배정 보기
      </button>
      <ul className="mt-4 space-y-2">
        {posts.map((post) => (
          <li key={post.id}>
            <button
              type="button"
              onClick={() => onSelectPost(post.id)}
              className="flex w-full items-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2.5 text-left text-sm"
            >
              <img
                src={contentThumbnailProxyUrl(
                  post.url,
                  post.influencerHandle,
                )}
                alt=""
                className="h-12 w-10 shrink-0 rounded-lg object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap gap-1">
                  <CountryBadge code={post.countryCode} />
                  <PlatformBadge platform={post.platform} />
                </span>
                <span className="mt-1 block truncate font-medium">
                  {post.productName}
                </span>
                <span className="text-xs text-[var(--muted)]">
                  {formatMetric(post.views)} 조회 · {formatMetric(post.likes)}{" "}
                  좋아요
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InfluencerRank({
  influencers,
  onSelect,
}: {
  influencers: ContentInfluencerInsight[];
  onSelect: (id: string) => void;
}) {
  if (influencers.length === 0) {
    return (
      <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
        <p className="text-base font-medium text-[var(--ink)]">
          콘텐츠를 선택하면 상세가 여기에 표시됩니다
        </p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs tracking-[0.18em] text-[var(--muted)] uppercase">
        Ranking
      </p>
      <h3 className="mt-1 text-lg font-bold text-[var(--ink)]">
        인플루언서 성과
      </h3>
      <ul className="mt-4 space-y-2">
        {influencers.slice(0, 8).map((row, idx) => (
          <li key={row.influencerId}>
            <button
              type="button"
              onClick={() => onSelect(row.influencerId)}
              className="flex w-full items-center gap-3 rounded-xl border border-[var(--line)] px-3 py-2.5 text-left"
            >
              <span className="w-5 text-xs font-semibold text-[var(--muted)]">
                {idx + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {row.name}
                </span>
                <span className="text-xs text-[var(--muted)]">{row.handle}</span>
              </span>
              <span className="text-right text-xs tabular-nums text-[var(--muted)]">
                <span className="block font-semibold text-[var(--accent)]">
                  {formatMetric(row.views)}
                </span>
                조회
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
