"use client";

import { useId, useState } from "react";
import { ChevronDown, TrendingUp } from "lucide-react";
import { formatMoney, formatPercent } from "@/lib/format";
import { DEMO_MONTHLY_SALES } from "./demo-data";

export function SalesChart() {
  const [period, setPeriod] = useState("6");
  const chartId = useId();
  const months = DEMO_MONTHLY_SALES.slice(-Number(period));
  const total = months.reduce((sum, month) => sum + month.value, 0);
  const last = months[months.length - 1];
  const first = months[0];
  const growth = ((last.value - first.value) / first.value) * 100;
  const ceiling = Math.ceil(Math.max(...months.map((month) => month.value)) / 20000) * 20000;
  const points = months.map((month, index) => ({
    x: 58 + (index / (months.length - 1)) * 642,
    y: 219 - (month.value / ceiling) * 184,
    ...month,
  }));
  const line = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  const area = `${line} L 700 219 L 58 219 Z`;

  return (
    <section aria-labelledby="sales-heading" className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="sales-heading" className="text-[15px] font-semibold text-slate-900">Rendimiento de ventas</h2>
          <p className="mt-1 text-xs text-slate-500">La evolución de tus resultados comerciales</p>
        </div>
        <div className="relative">
          <label htmlFor={`${chartId}-period`} className="sr-only">Período del gráfico de ventas</label>
          <select id={`${chartId}-period`} value={period} onChange={(event) => setPeriod(event.target.value)} className="h-8 appearance-none rounded-lg border border-slate-200 bg-white py-1 pr-8 pl-3 text-xs text-slate-600 outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <option value="6">Últimos 6 meses</option>
            <option value="3">Últimos 3 meses</option>
          </select>
          <ChevronDown className="pointer-events-none absolute top-2 right-2.5 size-3.5 text-slate-400" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-[26px] font-semibold tracking-tight text-slate-900">{formatMoney(total)}</span>
          <span className="ml-2 text-[11px] text-slate-500">en este período</span>
        </div>
        <span className="mb-1 inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700"><TrendingUp className="size-3.5" aria-hidden="true" />+{formatPercent(growth)} desde {first.label.toLowerCase()}</span>
      </div>
      <div className="mt-3 w-full overflow-hidden">
        <svg viewBox="0 0 748 262" className="h-auto min-h-40 w-full" role="img" aria-labelledby={`${chartId}-title ${chartId}-desc`}>
          <title id={`${chartId}-title`}>Ventas de {first.label.toLowerCase()} a septiembre de 2026</title>
          <desc id={`${chartId}-desc`}>{months.map((month) => `${month.label}: ${formatMoney(month.value)}`).join(". ")}.</desc>
          <defs><linearGradient id={`${chartId}-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4b7cf3" stopOpacity="0.18" /><stop offset="100%" stopColor="#4b7cf3" stopOpacity="0.01" /></linearGradient></defs>
          {[0, 1, 2, 3].map((tick) => {
            const value = (tick / 3) * ceiling;
            const y = 219 - (value / ceiling) * 184;
            return <g key={tick}><line x1="58" x2="716" y1={y} y2={y} stroke="#e8edf3" strokeDasharray="4 5" /><text x="43" y={y + 4} textAnchor="end" fill="#64748b" fontSize="11">{value === 0 ? "0" : `${value / 1000} mil`}</text></g>;
          })}
          <path d={area} fill={`url(#${chartId}-fill)`} />
          <path d={line} fill="none" stroke="#3970ec" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((point, index) => (
            <g key={point.month}>
              <circle cx={point.x} cy={point.y} r={index === points.length - 1 ? "5" : "4"} fill="white" stroke="#3970ec" strokeWidth="2.5" />
              <text x={point.x} y="250" textAnchor="middle" fill="#64748b" fontSize="12">{point.month}</text>
              <title>{point.label}: {formatMoney(point.value)}</title>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-2"><span className="h-0.5 w-4 rounded bg-blue-600" aria-hidden="true" />Ventas mensuales en soles</span>
        <span>Septiembre: <span className="font-medium text-slate-700">{formatMoney(last.value)}</span></span>
      </div>
      <table className="sr-only"><caption>Ventas de demostración en soles, año 2026</caption><thead><tr><th scope="col">Mes</th><th scope="col">Ventas</th></tr></thead><tbody>{months.map((month) => <tr key={month.month}><th scope="row">{month.label}</th><td>{formatMoney(month.value)}</td></tr>)}</tbody></table>
    </section>
  );
}
