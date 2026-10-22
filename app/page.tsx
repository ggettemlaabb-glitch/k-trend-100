
"use client";

import { useState } from "react";

type Trend = {
  title: string;
  keywords: string[];
  data: { period: string; ratio: number }[];
};

export default function Home() {
  const [terms, setTerms] = useState(
    "아이폰, 갤럭시, 챗GPT, 다이소, 쿠팡"
  );
  const [period, setPeriod] = useState("date");
  const [loading, setLoading] = useState(false);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [error, setError] = useState("");

  async function search() {
    const keywords = terms
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .slice(0, 5);

    if (!keywords.length) {
      setError("검색어를 입력해 주세요.");
      return;
    }

    setLoading(true);
    setError("");

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (period === "date" ? 30 : period === "week" ? 90 : 365));

    const format = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    try {
      const response = await fetch("/api/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: format(start),
          endDate: format(end),
          timeUnit: period,
          keywordGroups: keywords.map((keyword) => ({
            groupName: keyword,
            keywords: [keyword],
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "데이터를 불러오지 못했습니다.");
      }

      setTrends(result.results || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const ranked = trends
    .map((item) => ({
      name: item.title,
      value: Math.max(0, ...item.data.map((d) => d.ratio)),
      data: item.data,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <main className="min-h-screen bg-[#080b14] text-white">
      <header className="border-b border-white/10 px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <div className="text-2xl font-black tracking-tight">
              K-TREND <span className="text-cyan-400">100</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              KOREA SEARCH INTELLIGENCE
            </p>
          </div>
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
            NAVER DATA
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <p className="mb-3 text-sm font-semibold text-cyan-400">
            REAL-TIME TREND ANALYSIS
          </p>
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            대한민국 검색 트렌드
          </h1>
          <p className="mt-4 text-slate-400">
            지금 주목받는 검색어를 비교하고 분석하세요.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          {[
            ["01", "DAILY", "일간 트렌드"],
            ["02", "WEEKLY", "주간 트렌드"],
            ["03", "MONTHLY", "월간 트렌드"],
          ].map(([number, label, desc]) => (
            <div key={number} className="rounded-2xl border border-white/10 bg-[#111827] p-5">
              <p className="text-xs text-cyan-400">{number} / {label}</p>
              <p className="mt-3 text-xl font-bold">{desc}</p>
              <p className="mt-1 text-sm text-slate-500">검색 관심도 분석</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">검색어 비교 분석</h2>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#080b14] px-4 py-2 text-sm"
            >
              <option value="date">일간</option>
              <option value="week">주간</option>
              <option value="month">월간</option>
            </select>
          </div>

          <label className="mb-2 block text-sm text-slate-400">
            비교할 검색어 (쉼표로 구분, 최대 5개)
          </label>
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-[#080b14] p-4 text-sm outline-none focus:border-cyan-400"
            placeholder="아이폰, 갤럭시, 다이소..."
          />

          <button
            onClick={search}
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
          >
            {loading ? "데이터 분석 중..." : "트렌드 분석하기"}
          </button>

          {error && (
            <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-[#111827] p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">검색 관심도 순위</h2>
              <p className="mt-1 text-sm text-slate-500">
                네이버 검색 트렌드 상대지수 기준
              </p>
            </div>
            <span className="text-xs text-slate-500">TOP 5 비교</span>
          </div>

          {ranked.length === 0 ? (
            <div className="py-14 text-center text-sm text-slate-500">
              검색어를 입력하고 분석을 시작해 주세요.
            </div>
          ) : (
            <div className="space-y-5">
              {ranked.map((item, index) => (
                <div key={item.name}>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-cyan-400">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="font-semibold">{item.name}</span>
                    </div>
                    <span className="text-sm text-slate-400">
                      {item.value.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-cyan-400"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="mt-10 border-t border-white/10 py-6 text-center text-xs leading-6 text-slate-500">
          K-TREND 100 · Korea Search Intelligence
          <br />
          검색 관심도는 상대지수이며 실제 검색량과 다를 수 있습니다.
        </footer>
      </section>
    </main>
  );
}
