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
  const [hoveredPoint, setHoveredPoint] = useState<{ name: string; period: string; ratio: number } | null>(null);
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

  const ranked = results.map(x => {
    const latest = x.data[x.data.length - 1]?.ratio ?? 0;
    const previous = x.data[x.data.length - 2]?.ratio ?? latest;
    const change = latest - previous;
    return { name: x.title, value: Math.max(0, ...x.data.map(d => d.ratio)), change };
  }).sort((a,b) => b.value-a.value);

  function downloadCsv() {
    if (!results.length) return;
    const periods = Array.from(new Set(results.flatMap(series => series.data.map(point => point.period))));
    const rows = [["날짜", ...results.map(series => series.title)]];
    for (const periodLabel of periods) {
      rows.push([periodLabel, ...results.map(series => {
        const point = series.data.find(item => item.period === periodLabel);
        return point ? point.ratio.toFixed(1) : "";
      })]);
    }
    const csv = "\\uFEFF" + rows.map(row => row.map(value => '"' + String(value).replace(/"/g, '""') + '"').join(",")).join("\\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "k-trend-네이버-관심도-비교.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const chartLength = Math.max(0, ...results.map(x => x.data.length));
  const chartLabels = results[0]?.data || [];
  const lineColors = ["#22d3ee", "#a78bfa", "#34d399", "#fbbf24", "#fb7185"];
  const chartPoints = (data: Result["data"]) => data.map((point, index) => {
    const x = chartLength <= 1 ? 0 : (index / (chartLength - 1)) * 1000;
    const y = 220 - (Math.max(0, Math.min(100, point.ratio)) / 100) * 200;
    return `${x},${y}`;
  }).join(" ");

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
        {[{ id: "date", code: "01 / DAILY", title: "일간 트렌드", detail: "최근 30일 관심도 비교" }, { id: "week", code: "02 / WEEKLY", title: "주간 트렌드", detail: "최근 90일 관심도 비교" }, { id: "month", code: "03 / MONTHLY", title: "월간 트렌드", detail: "최근 12개월 관심도 비교" }].map(x =>
          <button key={x.id} type="button" onClick={() => setPeriod(x.id)} aria-pressed={period === x.id}
            className={"rounded-2xl border p-5 text-left transition " + (period === x.id ? "border-cyan-400 bg-cyan-400/10 ring-1 ring-cyan-400/30" : "border-white/10 bg-[#111827] hover:border-cyan-400/50")}>
            <p className="text-xs text-cyan-400">{x.code}</p><p className="mt-3 text-xl font-bold">{x.title}</p>
            <p className="mt-1 text-sm text-slate-400">{x.detail}</p><p className="mt-3 text-xs text-cyan-300">{period === x.id ? "선택됨" : "눌러서 기간 선택 →"}</p>
          </button>) }
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
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">네이버 검색 관심도 비교</h2><p className="mt-1 text-xs text-slate-400">선택 기간: {period === "date" ? "일간 · 최근 30일" : period === "week" ? "주간 · 최근 90일" : "월간 · 최근 12개월"}</p></div>
          <select value={period} onChange={e=>setPeriod(e.target.value)} className="rounded-lg border border-white/10 bg-[#080b14] px-4 py-2 text-sm"><option value="date">일간</option><option value="week">주간</option><option value="month">월간</option></select></div>
        <label className="mb-2 block text-sm text-slate-400">비교할 검색어 (쉼표 구분, 최대 5개)</label>
        <textarea value={terms} onChange={e=>setTerms(e.target.value)} rows={3} className="w-full rounded-xl border border-white/10 bg-[#080b14] p-4 text-sm outline-none focus:border-cyan-400" placeholder="예: 아이폰, 갤럭시, 챗GPT, 다이소, 쿠팡" />
        <button onClick={compare} disabled={compareLoading} className="mt-4 w-full rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-50">{compareLoading ? "분석 중..." : "네이버 관심도 비교하기"}</button>
        {ranked.length > 0 && <div className="mt-7 space-y-6">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="font-bold">검색 관심도 변화</h3><p className="mt-1 text-xs text-slate-400">네이버 데이터랩 상대지수 · 최고값 100 기준</p></div>
              <button type="button" onClick={downloadCsv} className="rounded-lg border border-cyan-400/40 px-4 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-400/10">CSV 다운로드 ↓</button>
            </div>
            <div className="relative mt-4 overflow-x-auto rounded-xl border border-white/10 bg-[#080b14] p-3">
              {hoveredPoint && <div className="pointer-events-none absolute left-5 top-5 z-10 rounded-lg border border-cyan-400/40 bg-slate-900/95 px-4 py-3 text-sm shadow-xl">
                <p className="font-bold text-cyan-300">{hoveredPoint.name}</p>
                <p className="mt-1 text-slate-200">{hoveredPoint.period}</p>
                <p className="mt-1 text-slate-400">관심도 <b className="text-white">{hoveredPoint.ratio.toFixed(1)}</b></p>
              </div>}
              <svg viewBox="0 0 1000 250" role="img" aria-label="검색어별 상대 관심도 변화 그래프" className="h-64 min-w-[560px] w-full">
                {[0,25,50,75,100].map(v => <g key={v}><line x1="0" x2="1000" y1={220-v*2} y2={220-v*2} stroke="rgba(255,255,255,0.10)" strokeDasharray="5 7" /><text x="4" y={215-v*2} fill="#94a3b8" fontSize="12">{v}</text></g>)}
                {results.map((series,i) => <g key={series.title}>
                  <polyline points={chartPoints(series.data)} fill="none" stroke={lineColors[i % lineColors.length]} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  {series.data.map((point,index) => {
                    const x = chartLength <= 1 ? 0 : (index / (chartLength - 1)) * 1000;
                    const y = 220 - (Math.max(0, Math.min(100, point.ratio)) / 100) * 200;
                    return <circle key={`${series.title}-${point.period}-${index}`} cx={x} cy={y} r="9" fill={lineColors[i % lineColors.length]} stroke="#080b14" strokeWidth="3" className="cursor-crosshair"
                      onMouseEnter={() => setHoveredPoint({ name: series.title, period: point.period, ratio: point.ratio })}
                      onMouseLeave={() => setHoveredPoint(null)}
                      onFocus={() => setHoveredPoint({ name: series.title, period: point.period, ratio: point.ratio })}
                      onBlur={() => setHoveredPoint(null)}
                      tabIndex={0}>
                      <title>{series.title} · {point.period} · 관심도 {point.ratio.toFixed(1)}</title>
                    </circle>;
                  })}
                </g>) }
              </svg>
              <div className="mt-2 flex flex-wrap gap-4">{results.map((series,i)=><span key={series.title} className="flex items-center gap-2 text-xs text-slate-300"><i className="h-2.5 w-2.5 rounded-full" style={{backgroundColor:lineColors[i % lineColors.length]}} />{series.title}</span>)}</div>
              <div className="mt-3 flex justify-between text-[11px] text-slate-500"><span>{chartLabels[0]?.period || ""}</span><span>{chartLabels[chartLabels.length-1]?.period || ""}</span></div>
            </div>
          </div>
          <div><h3 className="font-bold">상대 관심도 순위</h3><p className="mt-1 text-xs text-slate-400">선택 기간 중 각 검색어의 최고 관심도 기준</p>
            <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
              {ranked.map((x,i)=><div key={x.name} className="flex items-center gap-3 border-b border-white/10 px-4 py-3 last:border-0">
                <b className="w-7 text-cyan-300">{String(i+1).padStart(2,"0")}</b><span className="min-w-0 flex-1 truncate font-medium">{x.name}</span>
                <span className="text-xs font-semibold tabular-nums" style={{color: x.change > 0 ? "#34d399" : x.change < 0 ? "#fb7185" : "#94a3b8"}}>{x.change > 0 ? "▲ 상승" : x.change < 0 ? "▼ 하락" : "－ 보합"}</span>
                <span className="text-sm tabular-nums text-slate-300">{x.value.toFixed(1)}</span>
                <div className="h-2 w-24 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-cyan-400" style={{width:`${x.value}%`}} /></div>
              </div>)}
            </div>
          </div>
        </div>}
      </div>
      {error && <p className="mt-5 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <footer className="mt-10 border-t border-white/10 py-6 text-center text-xs leading-6 text-slate-500">K-TREND 100 · Korea Search Intelligence<br/>공개 급상승 피드와 네이버 검색 상대지수는 전체 검색량과 다를 수 있습니다.</footer>
    </section>
  </main>;
}
