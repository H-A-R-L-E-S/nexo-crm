"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CircleCheck,
  ContactRound,
  Plus,
  Sparkles,
  UserPlus,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientFormDialog } from "@/features/clients/client-form";
import { useClients } from "@/features/clients/clients-provider";
import { OWNERS } from "@/features/clients/demo-data";

const statusStyles = {
  Activo: "border-emerald-100 bg-emerald-50 text-emerald-700",
  Prospecto: "border-amber-100 bg-amber-50 text-amber-700",
  Inactivo: "border-slate-200 bg-slate-100 text-slate-600",
};

const statuses = [
  { name: "Activo", label: "Activos", color: "#3b6ff5", dot: "bg-blue-600" },
  { name: "Prospecto", label: "Prospectos", color: "#a6bfff", dot: "bg-blue-300" },
  { name: "Inactivo", label: "Inactivos", color: "#e2e8f0", dot: "bg-slate-200" },
] as const;

const numberFormatter = new Intl.NumberFormat("es-PE");
const monthFormatter = new Intl.DateTimeFormat("es-PE", {
  month: "short",
  timeZone: "UTC",
});

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function clientLabel(count: number) {
  return `${numberFormatter.format(count)} ${count === 1 ? "cliente" : "clientes"}`;
}

function MonthlyChart({
  months,
}: {
  months: { key: string; label: string; total: number }[];
}) {
  const maximum = Math.max(4, ...months.map((month) => month.total));
  const step = Math.ceil(maximum / 4);
  const ceiling = step * 4;

  return (
    <>
      <div className="mt-5 w-full overflow-hidden">
        <svg
          viewBox="0 0 640 238"
          className="h-auto w-full"
          role="img"
          aria-labelledby="monthly-chart-title monthly-chart-description"
        >
          <title id="monthly-chart-title">Clientes registrados por mes</title>
          <desc id="monthly-chart-description">
            {months.map((month) => `${month.label}: ${clientLabel(month.total)}`).join(". ")}.
          </desc>
          {[0, 1, 2, 3, 4].map((tick) => {
            const value = tick * step;
            const y = 199 - (value / ceiling) * 165;
            return (
              <g key={tick}>
                <line x1="35" x2="626" y1={y} y2={y} stroke="#e8edf3" strokeDasharray="4 5" />
                <text x="21" y={y + 4} textAnchor="end" fill="#64748b" fontSize="11">
                  {value}
                </text>
              </g>
            );
          })}
          {months.map((month, index) => {
            const x = 61 + index * 96;
            const height = (month.total / ceiling) * 165;
            const isCurrentMonth = index === months.length - 1;
            return (
              <g key={month.key}>
                <rect
                  x={x}
                  y={199 - height}
                  width="48"
                  height={height}
                  rx="6"
                  fill={isCurrentMonth ? "#3769e8" : "#dce7ff"}
                />
                {month.total > 0 && (
                  <text
                    x={x + 24}
                    y={189 - height}
                    textAnchor="middle"
                    fill={isCurrentMonth ? "#315ccc" : "#64748b"}
                    fontSize="12"
                    fontWeight="600"
                  >
                    {month.total}
                  </text>
                )}
                <text
                  x={x + 24}
                  y="228"
                  textAnchor="middle"
                  fill={isCurrentMonth ? "#315ccc" : "#64748b"}
                  fontSize="12"
                  fontWeight={isCurrentMonth ? "600" : "400"}
                >
                  {month.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <table className="sr-only">
        <caption>Altas de clientes en los últimos seis meses de la demostración</caption>
        <thead><tr><th scope="col">Mes</th><th scope="col">Clientes registrados</th></tr></thead>
        <tbody>{months.map((month) => <tr key={month.key}><th scope="row">{month.label}</th><td>{month.total}</td></tr>)}</tbody>
      </table>
    </>
  );
}

export function OverviewView() {
  const { clients, loading, error } = useClients();
  const referenceDate = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() - 5 + index, 1));
    const key = monthKey(date);
    const label = monthFormatter.format(date).replace(".", "");
    return {
      key,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      fullLabel: new Intl.DateTimeFormat("es-PE", { month: "long", timeZone: "UTC" }).format(date),
      periodLabel: new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" }).format(date),
      total: clients.filter((client) => client.createdAt.slice(0, 7) === key).length,
    };
  });
  const currentMonth = months[5].total;
  const previousMonth = months[4].total;
  const monthDifference = currentMonth - previousMonth;
  const total = clients.length;
  const active = clients.filter((client) => client.status === "Activo").length;
  const prospects = clients.filter((client) => client.status === "Prospecto").length;
  const recentClients = [...clients].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const stateCounts = statuses.map((status) => ({
    ...status,
    count: clients.filter((client) => client.status === status.name).length,
  }));
  const owners = [...new Set([...OWNERS.map((owner) => owner.name), ...clients.map((client) => client.owner)])]
    .map((name) => ({
      name,
      initials: OWNERS.find((owner) => owner.name === name)?.initials ?? initials(name),
      count: clients.filter((client) => client.owner === name).length,
    }))
    .sort((a, b) => b.count - a.count);
  const circleLength = 2 * Math.PI * 71;
  const formattedDate = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(referenceDate);
  const monthsTotal = months.reduce((sum, month) => sum + month.total, 0);

  const metrics = [
    { label: "Clientes totales", value: total, detail: "Tu cartera en un solo lugar", icon: UsersRound, iconClass: "bg-blue-50 text-blue-600", href: "/clientes" },
    { label: "Clientes activos", value: active, detail: `${total ? Math.round((active / total) * 100) : 0}% de tu cartera de clientes`, icon: CircleCheck, iconClass: "bg-emerald-50 text-emerald-600", href: "/clientes?estado=Activo" },
    { label: "Prospectos", value: prospects, detail: prospects === 1 ? "Una relación por desarrollar" : "Relaciones por desarrollar", icon: ContactRound, iconClass: "bg-amber-50 text-amber-600", href: "/clientes?estado=Prospecto" },
    { label: "Nuevos este mes", value: currentMonth, detail: monthDifference === 0 ? `La misma cantidad que en ${months[4].fullLabel}` : `${Math.abs(monthDifference)} ${monthDifference > 0 ? "más" : "menos"} que en ${months[4].fullLabel}`, icon: UserPlus, iconClass: "bg-violet-50 text-violet-600", href: "/clientes" },
  ];

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-950 sm:text-[30px]">Resumen</h1>
          <p className="mt-1.5 text-sm text-slate-500">Una vista clara de tus relaciones comerciales.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600">
            <CalendarDays className="size-4 text-slate-400" aria-hidden="true" />
            <span>{formattedDate}</span>
          </div>
          <ClientFormDialog>
            <Button className="h-10 gap-2"><Plus className="size-4" aria-hidden="true" />Nuevo cliente</Button>
          </ClientFormDialog>
        </div>
      </div>

      <section aria-label="Indicadores de clientes" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading && <p role="status" className="col-span-full text-sm text-slate-500">Cargando clientes...</p>}
        {error && <p role="alert" className="col-span-full text-sm text-red-700">{error}</p>}
        {metrics.map((metric) => (
          <Link
            href={metric.href}
            key={metric.label}
            className="group rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-blue-200 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-medium text-slate-500">{metric.label}</p>
              <span className={`flex size-9 items-center justify-center rounded-lg ${metric.iconClass}`}>
                <metric.icon className="size-[18px]" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-3 text-[32px] font-semibold leading-none tracking-tight text-slate-950">{numberFormatter.format(metric.value)}</div>
            <p className="mt-3 flex items-center gap-1 text-xs text-slate-500">
              {metric.label === "Nuevos este mes" && monthDifference !== 0 && (monthDifference > 0 ? <ArrowUpRight className="size-3.5 text-emerald-600" aria-hidden="true" /> : <ArrowDownRight className="size-3.5 text-amber-600" aria-hidden="true" />)}
              {metric.detail}
            </p>
          </Link>
        ))}
      </section>

      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(290px,1fr)]">
        <section aria-labelledby="growth-heading" className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="growth-heading" className="text-[15px] font-semibold text-slate-900">Crecimiento de tu cartera</h2>
              <p className="mt-1 text-xs text-slate-500">Nuevos clientes registrados cada mes</p>
            </div>
            <Badge variant="outline" className="rounded-md border-slate-200 px-2.5 py-1 font-normal text-slate-500">Últimos 6 meses</Badge>
          </div>
          <MonthlyChart months={months} />
          <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span className="size-2 shrink-0 rounded-full bg-blue-600" aria-hidden="true" />
            <span><span className="font-medium text-slate-700">{clientLabel(monthsTotal)}</span> registrados entre {months[0].periodLabel} y {months[5].periodLabel}</span>
          </div>
        </section>

        <section aria-labelledby="status-heading" className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
          <h2 id="status-heading" className="text-[15px] font-semibold text-slate-900">Clientes por estado</h2>
          <p className="mt-1 text-xs text-slate-500">Así se distribuye tu cartera</p>
          <div className="relative mx-auto my-5 size-[172px]" aria-hidden="true">
            <svg viewBox="0 0 180 180" className="size-full -rotate-90">
              <circle cx="90" cy="90" r="71" fill="none" stroke="#f1f5f9" strokeWidth="20" />
              {stateCounts.map((status, index) => {
                const precedingCount = stateCounts.slice(0, index).reduce((sum, state) => sum + state.count, 0);
                const segment = total ? (status.count / total) * circleLength : 0;
                return <circle key={status.name} cx="90" cy="90" r="71" fill="none" stroke={status.color} strokeWidth="20" strokeDasharray={`${Math.max(0, segment - (segment > 0 ? 4 : 0))} ${circleLength}`} strokeDashoffset={total ? -(precedingCount / total) * circleLength : 0} />;
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold tracking-tight text-slate-900">{total}</span>
              <span className="mt-0.5 text-xs text-slate-500">clientes en total</span>
            </div>
          </div>
          <ul className="space-y-1">
            {stateCounts.map((status) => (
              <li key={status.name}>
                <Link href={`/clientes?estado=${status.name}`} className="flex items-center justify-between rounded-md px-1 py-2 text-xs transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600">
                  <span className="flex items-center gap-2.5 text-slate-600"><span className={`size-2 rounded-full ${status.dot}`} aria-hidden="true" />{status.label}</span>
                  <span className="flex items-center gap-4"><span className="font-semibold text-slate-900">{status.count}</span><span className="w-8 text-right text-slate-500">{total ? Math.round((status.count / total) * 100) : 0}%</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(290px,1fr)]">
        <section aria-labelledby="recent-heading" className="min-w-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <h2 id="recent-heading" className="text-[15px] font-semibold text-slate-900">Clientes recientes</h2>
              <p className="mt-1 text-xs text-slate-500">Las últimas incorporaciones a tu cartera</p>
            </div>
            <Link href="/clientes" className="flex shrink-0 items-center gap-1.5 rounded text-xs font-medium text-blue-600 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Ver todos<ArrowRight className="size-3.5" aria-hidden="true" /></Link>
          </div>
          {recentClients.length ? (
            <ul className="divide-y divide-slate-100">
              {recentClients.map((client, index) => (
                <li key={client.id}>
                  <ClientFormDialog client={client}>
                    <button type="button" aria-label={`Editar a ${client.name}`} className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 sm:px-6">
                      <span aria-hidden="true" className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${["bg-blue-50 text-blue-600", "bg-violet-50 text-violet-600", "bg-amber-50 text-amber-700", "bg-emerald-50 text-emerald-700", "bg-rose-50 text-rose-600"][index]}`}>{initials(client.name)}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-slate-800">{client.name}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{client.company}</span></span>
                      <Badge variant="outline" className={`shrink-0 gap-1.5 rounded-full text-[10px] font-medium ${statusStyles[client.status]}`}><span className="size-1.5 rounded-full bg-current" aria-hidden="true" />{client.status}</Badge>
                      <span className="hidden w-14 shrink-0 text-right text-xs text-slate-500 sm:block">{new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(client.createdAt)).replace(".", "")}</span>
                    </button>
                  </ClientFormDialog>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-6 py-10 text-center"><UsersRound className="mx-auto mb-3 size-8 text-slate-300" aria-hidden="true" /><p className="text-sm font-medium text-slate-700">Tu primera relación comienza aquí</p><p className="mt-1 text-xs text-slate-500">Registra un cliente para empezar a construir tu cartera.</p><div className="mt-4"><ClientFormDialog /></div></div>
          )}
        </section>

        <div className="space-y-5">
          <section aria-labelledby="owners-heading" className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
            <div className="flex items-center justify-between">
              <h2 id="owners-heading" className="text-[15px] font-semibold text-slate-900">Tu equipo</h2>
              <UsersRound className="size-4 text-slate-400" aria-hidden="true" />
            </div>
            <p className="mt-1 text-xs text-slate-500">Clientes por responsable</p>
            <ul className="mt-5 space-y-4">
              {owners.map((owner, index) => (
                <li key={owner.name} className="flex items-center gap-3">
                  <span aria-hidden="true" className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${index === 0 ? "bg-blue-100 text-blue-700" : index === 1 ? "bg-violet-100 text-violet-700" : "bg-orange-100 text-orange-700"}`}>{owner.initials}</span>
                  <div className="min-w-0 flex-1"><div className="mb-2 flex items-center justify-between gap-3"><span className="truncate text-xs font-medium text-slate-700">{owner.name}</span><span className="shrink-0 text-[11px] text-slate-500">{clientLabel(owner.count)}</span></div><div className="h-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><div className="h-full rounded-full bg-blue-400" style={{ width: `${total ? (owner.count / total) * 100 : 0}%` }} /></div></div>
                </li>
              ))}
            </ul>
          </section>

          <aside className="rounded-xl border border-blue-100 bg-blue-50/60 p-5">
            <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-blue-900"><Sparkles className="size-4 text-blue-600" aria-hidden="true" />Todo empieza con una conexión</div>
            <p className="text-xs leading-relaxed text-slate-600">Registra y edita clientes para ver cómo cambia tu resumen.</p>
            <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500"><Check className="mt-0.5 size-3 shrink-0 text-blue-600" aria-hidden="true" />Los clientes se guardan en Supabase.</p>
          </aside>
        </div>
      </div>
    </div>
  );
}
