"use client";

import { useMemo, useState } from "react";
import { createManualAllocation } from "@/app/actions/admin";
import { AdminCompanyPanel } from "@/components/admin-company-panel";
import { AdminImportPanel } from "@/components/admin-import-panel";
import { AdminLinkReview } from "@/components/admin-link-review";
import { AdminStoreOverview } from "@/components/admin-store-overview";
import {
  CompanyContentDashboard,
  type ContentFocus,
} from "@/components/company-content-dashboard";
import { PharListWithModal } from "@/components/phar-list-with-modal";
import {
  Field,
  Notice,
  fieldClass,
  primaryBtnClass,
} from "@/components/ui";
import { buildMockContentInsights } from "@/lib/content-insights-mock";
import { type ContentPeriod } from "@/lib/content-insights";
import { type AllocationWithRelations, type Company, type Store } from "@/lib/types";

export function AdminConsoleLayout({
  storeList,
  companyList,
  list,
  error,
  message,
}: {
  storeList: Store[];
  companyList: Company[];
  list: AllocationWithRelations[];
  error?: string;
  message?: string;
}) {
  const [manualOpen, setManualOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [view, setView] = useState<"alloc" | "content">("alloc");
  const [period, setPeriod] = useState<ContentPeriod>("month");
  const [contentFocus, setContentFocus] = useState<ContentFocus>(null);

  const filteredList = useMemo(() => {
    if (!selectedStoreId) return list;
    return list.filter((item) => item.store_id === selectedStoreId);
  }, [list, selectedStoreId]);

  const insights = useMemo(
    () => buildMockContentInsights(list, period),
    [list, period],
  );

  const selectedStoreName = selectedStoreId
    ? storeList.find((s) => s.id === selectedStoreId)?.name ||
      filteredList[0]?.stores?.name ||
      null
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <Notice error={error} message={message} />

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
        {view === "content" ? (
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
        ) : null}
      </div>

      {view === "content" ? (
        <CompanyContentDashboard
          snapshot={insights}
          focus={contentFocus}
          onFocus={setContentFocus}
          onOpenAllocation={() => {
            setView("alloc");
            setContentFocus(null);
          }}
        />
      ) : (
      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
          <AdminStoreOverview
            storeList={storeList}
            list={list}
            selectedStoreId={selectedStoreId}
            onSelectStore={setSelectedStoreId}
          />

          <AdminCompanyPanel companies={companyList} />

          <AdminLinkReview />

          <AdminImportPanel compact companies={companyList} />

          <section className="owm-panel border border-[var(--line)] bg-[var(--surface)] shadow-sm">
            <button
              type="button"
              onClick={() => setManualOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
              aria-expanded={manualOpen}
            >
              <h2
                className="text-lg text-[var(--ink)]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                수동 등록
              </h2>
              <span className="text-xs font-medium text-[var(--muted)]">
                {manualOpen ? "접기 ▲" : "펼치기 ▼"}
              </span>
            </button>

            {manualOpen ? (
              <form
                action={createManualAllocation}
                className="grid gap-3 border-t border-[var(--line)] px-5 pb-5 pt-4"
              >
                <Field label="회원사">
                  <select className={fieldClass} name="company_id" required>
                    <option value="">회원사 선택</option>
                    {companyList
                      .filter((c) => c.is_active)
                      .map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                  </select>
                </Field>
                {companyList.filter((c) => c.is_active).length === 0 && (
                  <p className="text-xs text-[var(--danger)]">
                    등록된 회원사가 없습니다. 회원사를 먼저 추가해 주세요.
                  </p>
                )}
                <Field label="이름">
                  <input
                    className={fieldClass}
                    name="name"
                    placeholder="김미나"
                  />
                </Field>
                <Field label="SNS_handle">
                  <input
                    className={fieldClass}
                    name="snsid"
                    placeholder="@velyMina"
                    required
                  />
                </Field>
                <Field label="snsurl (선택)">
                  <input
                    className={fieldClass}
                    name="snsurl"
                    placeholder="https://instagram.com/..."
                  />
                </Field>
                <Field label="방문 예정일">
                  <input
                    className={fieldClass}
                    name="visit_date"
                    type="date"
                    required
                  />
                </Field>
                <Field label="방문지점">
                  <select className={fieldClass} name="store_id" required>
                    <option value="">지점 선택</option>
                    {storeList.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {storeList.length === 0 && (
                  <p className="text-xs text-[var(--danger)]">
                    등록된 지점이 없습니다. DB stores 테이블에 지점을 먼저 추가해
                    주세요.
                  </p>
                )}
                <Field label="상품">
                  <input
                    className={fieldClass}
                    name="product"
                    placeholder="OO뷰티 클렌징폼"
                    required
                  />
                </Field>
                <Field label="수량">
                  <input
                    className={fieldClass}
                    name="quantity"
                    type="number"
                    min={1}
                    defaultValue={1}
                  />
                </Field>
                <Field label="방문 코드 (선택)">
                  <input className={fieldClass} name="visit_code" />
                </Field>
                <button
                  className={primaryBtnClass}
                  type="submit"
                  disabled={
                    storeList.length === 0 ||
                    companyList.filter((c) => c.is_active).length === 0
                  }
                >
                  등록
                </button>
              </form>
            ) : null}
          </section>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col">
          <div className="mb-3 flex shrink-0 flex-wrap items-end justify-between gap-2">
            <div>
              <h2
                className="text-lg"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                배정 현황
              </h2>
              <p className="mt-1 text-sm text-[var(--accent)]">
                {selectedStoreName
                  ? `${selectedStoreName}만 표시 중`
                  : "전체 지점 표시중"}
              </p>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <PharListWithModal
              items={filteredList}
              fillHeight
              lockedStoreId={selectedStoreId || undefined}
              allowAdminEdit
              storeList={storeList}
              companyList={companyList}
            />
          </div>
        </section>
      </div>
      )}
    </div>
  );
}
