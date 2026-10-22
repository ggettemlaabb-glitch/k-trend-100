"use client";

import { useState } from "react";

type Candidate = { title: string; traffic: string; published: string; source: string };
type Result = { title: string; data: { period: string; ratio: number }[] };

async function readApiJson(response: Response) {
  const raw = await response.text();
  try {
    return JSON.parse(raw);
  } catch {
    const preview = raw.replace(/<[^>]*>/g, " ").replace(/\\s+/g, " ").trim().slice(0, 180);
    throw new Error(
      `API가 JSON이 아닌 응답을 반환했습니다 (HTTP ${response.status}). Vercel 배포 또는 API 경로를 확인해 주세요. ${preview}`
    );
  }
}

export default function Home() {
  const [period, setPeriod] = useState("date");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [terms, setTerms] = useState("");
  const [loading, setLoading] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fetchedAt, setFetchedAt] = useState("");
  const [debugStatus, setDebugStatus] = useState("아직 수집을 시작하지 않았습니다.");

  async function collect() {
    setLoading(true); setError(""); setNotice(""); setDebugStatus("서버에 데이터 수집을 요청했습니다...");
    try {
      const res = await fetch("/api/discover", { cache: "no-store" });
      const data = await readApiJson(res);
      if (!res.ok) throw new Error(data.error || "트렌드 수집에 실패했습니다.");
      setCandidates(Array.isArray(data.items) ? data.items.slice(0, 100) : []);
      setFetchedAt(data.fetchedAt || "");
      setNotice(data.note || "");
      setDebugStatus(`요청 성공 · ${Array.isArray(data.items) ? data.items.length : 0}개 항목 수신`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "수집 중 오류가 발생했습니다.";
      setError(message); setDebugStatus(`요청 실패 · ${message}`);
    } finally { setLoading(false); }
  }

  async function compare() {
    const keywords = terms.split(",").map(x => x.trim()).filter(Boolean).slice(0, 5);
    if (!keywords.length) { setError("비교할 검색어를 쉼표로 구분해 입력해 주세요."); return; }
    setCompareLoading(true); setError("");
    const end = new Date(); const start = new Date();
    start.setDate(start.getDate() - (period === "date" ? 30 : period === "week" ? 90 : 365));
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    try {
      const res = await fetch("/api/trends", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: fmt(start), endDate: fmt(end), timeUnit: period,
          keywordGroups: keywords.map(keyword => ({ groupName: keyword, keywords: [keyword] })) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "네이버 분석에 실패했습니다.");
      setResults(data.results || []);
    } catch (e) { setError(e instanceof Error ? e.message : "분석 중 오류가 발생했습니다."); }
    finally { setCompareLoading(false); }
  }

  const ranked = results.map(x => ({ name: x.title, value: Math.max(0, ...x.data.map(d => d.ratio)) }))
    .sort((a,b) => b.value-a.value);

  return <main className="min-h-screen bg-[#080b14] text-white">
    <header className="border-b border-white/10 px-6 py-5"><div className="mx-auto flex max-w-7xl items-center justify-between">
      <div><div className="text-2xl font-black">K-TREND <span className="text-cyan-400">100</span></div><p className="mt-1 text-xs text-slate-400">KOREA SEARCH INTELLIGENCE</p></div>
      <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">TREND SOURCES</span>
    </div></header>
    <section className="mx-auto max-w-7xl px-6 py-10">
      <p className="mb-3 text-sm font-semibold text-cyan-400">REAL-TIME TREND ANALYSIS</p>
      <h1 className="text-4xl font-black tracking-tight md:text-5xl">대한민국 검색 트렌드</h1>
      <p className="mt-4 text-slate-400">공개 트렌드 자료를 수집하고 네이버 검색 관심도를 비교합니다.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[[ "01 / DAILY", "일간 트렌드" ],[ "02 / WEEKLY", "주간 트렌드" ],[ "03 / MONTHLY", "월간 트렌드" ]].map(x =>
          <div key={x[0]} className="rounded-2xl border border-white/10 bg-[#111827] p-5"><p className="text-xs text-cyan-400">{x[0]}</p><p className="mt-3 text-xl font-bold">{x[1]}</p><p className="mt-1 text-sm text-slate-500">검색 관심도 분석</p></div>)}
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-[#111827] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">오늘의 공개 급상승 검색어</h2><p className="mt-1 text-sm text-slate-400">Google Trends 대한민국 공개 피드 · 최대 100개 표시</p></div>
          <button onClick={collect} disabled={loading} className="rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-50">{loading ? "수집 중..." : "인기 검색어 수집하기"}</button></div>
        <p className="mt-3 text-xs text-cyan-300" aria-live="polite">{debugStatus}</p>
        {notice && <p className="mt-4 text-xs text-slate-400">{notice}</p>}
        {candidates.length > 0 && <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-4 py-3 text-xs text-slate-400"><span>실제 수집 항목 <b className="text-cyan-300">{candidates.length}개</b> / 최대 100개</span><span>{fetchedAt ? `수집 시각 ${new Date(fetchedAt).toLocaleString("ko-KR")}` : "수집 완료"}</span></div>}
        {candidates.length === 0 ? <div className="py-10 text-center text-sm text-slate-500">{loading ? "Google Trends 데이터를 불러오는 중입니다..." : debugStatus.startsWith("요청 성공") ? "피드는 연결됐지만 표시할 검색어가 없습니다. 잠시 후 다시 시도해 주세요." : "버튼을 눌러 공개 인기 검색어를 수집하세요."}</div> :
          <div className="mt-5 divide-y divide-white/10">{candidates.map((x,i) => <div key={x.title} className="flex items-center justify-between gap-4 py-3"><div className="flex min-w-0 items-center gap-4"><b className="text-cyan-400">{String(i+1).padStart(2,"0")}</b><span className="truncate font-semibold">{x.title}</span></div><span className="shrink-0 text-xs text-slate-400">{x.traffic || "급상승"}</span></div>)}</div>}
        <p className="mt-4 text-xs leading-6 text-amber-300/80">현재는 Google 공개 피드에서 실제 제공된 항목만 표시합니다. 피드가 100개 미만을 제공하면 부족한 항목을 임의로 채우지 않습니다. 한국 전체 검색량 TOP100이나 네이버 순위가 아닙니다.</p>
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-[#111827] p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">네이버 검색 관심도 비교</h2>
          <select value={period} onChange={e=>setPeriod(e.target.value)} className="rounded-lg border border-white/10 bg-[#080b14] px-4 py-2 text-sm"><option value="date">일간</option><option value="week">주간</option><option value="month">월간</option></select></div>
        <label className="mb-2 block text-sm text-slate-400">비교할 검색어 (쉼표 구분, 최대 5개)</label>
        <textarea value={terms} onChange={e=>setTerms(e.target.value)} rows={3} className="w-full rounded-xl border border-white/10 bg-[#080b14] p-4 text-sm outline-none focus:border-cyan-400" placeholder="예: 아이폰, 갤럭시, 챗GPT, 다이소, 쿠팡" />
        <button onClick={compare} disabled={compareLoading} className="mt-4 w-full rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-50">{compareLoading ? "분석 중..." : "네이버 관심도 비교하기"}</button>
        {ranked.length > 0 && <div className="mt-7 space-y-5"><h3 className="font-bold">상대 관심도 순위</h3>{ranked.map((x,i)=><div key={x.name}><div className="mb-2 flex justify-between"><span>{i+1}. {x.name}</span><span className="text-slate-400">{x.value.toFixed(1)}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-cyan-400" style={{width:`${x.value}%`}} /></div></div>)}</div>}
      </div>
      {error && <p className="mt-5 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <footer className="mt-10 border-t border-white/10 py-6 text-center text-xs leading-6 text-slate-500">K-TREND 100 · Korea Search Intelligence<br/>공개 급상승 피드와 네이버 검색 상대지수는 전체 검색량과 다를 수 있습니다.</footer>
    </section>
  </main>;
}
