"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CircleCheck,
  ContactRound,
  Plus,
  UserPlus,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientFormDialog } from "@/features/clients/client-form";
import { TasksOverview } from "@/features/tasks/tasks-overview";
import { useClients } from "@/features/clients/clients-provider";

const statusStyles = {
  Activo: "border-emerald-100 bg-emerald-50 text-emerald-700",
  Prospecto: "border-amber-100 bg-amber-50 text-amber-700",
  Inactivo: "border-slate-200 bg-slate-100 text-slate-600",
};

const statuses = [
  { name: "Activo", label: "Activos", color: "#2563eb", dot: "bg-blue-600" },
  { name: "Prospecto", label: "Prospectos", color: "#64748b", dot: "bg-slate-500" },
  { name: "Inactivo", label: "Inactivos", color: "#17243b", dot: "bg-slate-900" },
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
    <div className="monthly-chart relative mt-6">
      <div className="monthly-chart-plot relative h-52 grid-cols-[1.5rem_minmax(0,1fr)] gap-2" aria-hidden="true">
        <div className="relative mb-7 text-xs tabular-nums text-slate-600">
          {[0, 1, 2, 3, 4].map((tick) => <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - tick * 25}%` }}>{tick * step}</span>)}
        </div>
        <div className="relative min-w-0">
          <div className="absolute inset-x-0 bottom-7 top-0 flex flex-col justify-between">
            {[0, 1, 2, 3, 4].map((tick) => <div key={tick} className="border-t border-slate-200" />)}
          </div>
          <div className="relative grid h-full grid-cols-6 gap-2 sm:gap-4">
            {months.map((month, index) => <div key={month.key} className="flex min-w-0 flex-col">
              <div className="flex min-h-0 flex-1 items-end justify-center pb-px">
                <div className="relative w-full max-w-10 rounded-t-sm bg-blue-600" style={{ height: `${(month.total / ceiling) * 100}%` }}>
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-medium tabular-nums text-slate-700">{month.total}</span>
                </div>
              </div>
              <span className={`flex h-7 items-end justify-center text-xs ${index === months.length - 1 ? "font-semibold text-blue-700" : "text-slate-600"}`}>{month.label}</span>
            </div>)}
          </div>
        </div>
      </div>
      <div className="monthly-chart-data"><table className="w-full text-sm">
        <caption className="sr-only">Clientes registrados en los últimos seis meses</caption>
        <thead className="sr-only"><tr><th scope="col">Mes</th><th scope="col">Clientes registrados</th></tr></thead>
        <tbody>{months.map((month, index) => <tr key={month.key}>
          <th scope="row" className={`w-12 py-2 pr-3 text-left font-medium ${index === months.length - 1 ? "text-blue-700" : "text-slate-600"}`}>{month.label}</th>
          <td className="py-2"><div className="flex items-center gap-3"><div className="h-3 min-w-0 flex-1 rounded-sm bg-slate-100" aria-hidden="true"><div className="h-full rounded-sm bg-blue-600" style={{ width: `${(month.total / ceiling) * 100}%` }} /></div><span className="w-6 text-right tabular-nums text-slate-700">{month.total}</span></div></td>
        </tr>)}</tbody>
      </table></div>
    </div>
  );
}

export function OverviewView() {
  const { clients, loading, error, reload } = useClients();
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
  const owners = [...new Set(clients.map((client) => client.owner))]
    .map((name) => ({
      name,
      initials: initials(name),
      count: clients.filter((client) => client.owner === name).length,
    }))
    .sort((a, b) => b.count - a.count);
  const circleLength = 2 * Math.PI * 71;
  const formattedDate = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(referenceDate);
  const monthsTotal = months.reduce((sum, month) => sum + month.total, 0);

  const metrics = [
    { label: "Clientes totales", value: total, detail: "Tu cartera en un solo lugar", icon: UsersRound, href: "/clientes" },
    { label: "Clientes activos", value: active, detail: `${total ? Math.round((active / total) * 100) : 0}% de tu cartera de clientes`, icon: CircleCheck, href: "/clientes?estado=Activo" },
    { label: "Prospectos", value: prospects, detail: prospects === 1 ? "Una relación por desarrollar" : "Relaciones por desarrollar", icon: ContactRound, href: "/clientes?estado=Prospecto" },
    { label: "Nuevos este mes", value: currentMonth, detail: monthDifference === 0 ? `La misma cantidad que en ${months[4].fullLabel}` : `${Math.abs(monthDifference)} ${monthDifference > 0 ? "más" : "menos"} que en ${months[4].fullLabel}`, icon: UserPlus, href: "/clientes" },
  ];

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 lg:text-[28px]">Resumen</h1>
          <p className="mt-1 text-sm text-slate-600">Tu cartera y los próximos seguimientos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <CalendarDays className="size-4" aria-hidden="true" />
            <span>{formattedDate}</span>
          </div>
          <ClientFormDialog>
            <Button className="h-11 gap-2 px-4"><Plus className="size-4" aria-hidden="true" />Nuevo cliente</Button>
          </ClientFormDialog>
        </div>
      </div>

      {loading ? <section role="status" className="overview-panel flex min-h-36 items-center gap-3 p-6 text-sm text-slate-600"><UsersRound className="size-5" aria-hidden="true" />Cargando clientes...</section> : error ? <section role="alert" className="overview-panel space-y-3 p-6"><h2 className="text-sm font-semibold text-red-700">No se pudo cargar tu cartera</h2><p className="break-words text-sm text-slate-600">{error}</p><Button variant="outline" className="h-11" onClick={() => void reload()}>Reintentar clientes</Button></section> : <>
      <section aria-label="Indicadores de clientes" className="overview-panel grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <Link
            href={metric.href}
            key={metric.label}
            className={`group min-w-0 px-5 py-4 transition-colors hover:bg-slate-50 active:bg-blue-50 ${index === 0 ? "rounded-t-lg bg-blue-50/50 sm:rounded-t-none sm:rounded-tl-lg xl:rounded-l-lg" : "border-t border-slate-200 sm:odd:border-l xl:border-l xl:border-t-0"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-600">{metric.label}</p>
              <metric.icon className={`size-4 shrink-0 ${index === 0 ? "text-blue-700" : "text-slate-600"}`} aria-hidden="true" />
            </div>
            <div className={`mt-2 font-semibold leading-tight tracking-tight tabular-nums ${index === 0 ? "text-4xl text-blue-700" : "text-3xl text-slate-950"}`}>{numberFormatter.format(metric.value)}</div>
            <p className="mt-2 flex items-center gap-1 text-xs leading-relaxed text-slate-600">
              {metric.label === "Nuevos este mes" && monthDifference !== 0 && (monthDifference > 0 ? <ArrowUpRight className="size-3.5 text-emerald-600" aria-hidden="true" /> : <ArrowDownRight className="size-3.5 text-amber-600" aria-hidden="true" />)}
              {metric.detail}
            </p>
          </Link>
        ))}
      </section>

      {total === 0 ? <section aria-label="Cartera vacía" className="overview-panel flex flex-col items-start gap-3 p-6 sm:p-8"><UsersRound className="size-6 text-blue-700" aria-hidden="true" /><h2 className="text-lg font-semibold">Tu cartera está lista para el primer cliente</h2><p className="max-w-lg text-sm leading-relaxed text-slate-600">Registra un cliente para consultar tus indicadores, las altas por mes y la distribución de tu cartera.</p><ClientFormDialog><Button variant="outline" className="mt-1 h-11">Registrar primer cliente</Button></ClientFormDialog></section> : <>
      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
        <section aria-labelledby="growth-heading" className="overview-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="growth-heading" className="text-[15px] font-semibold text-slate-900">Crecimiento de tu cartera</h2>
              <p className="mt-1 text-sm text-slate-600">Nuevos clientes registrados cada mes</p>
            </div>
            <span className="text-xs text-slate-600">Últimos 6 meses · {months[5].label} actual</span>
          </div>
          <MonthlyChart months={months} />
          <div className="mt-5 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-600">
            <span><span className="font-medium text-slate-700">{clientLabel(monthsTotal)}</span> registrados entre {months[0].periodLabel} y {months[5].periodLabel}</span>
          </div>
        </section>

        <section aria-labelledby="status-heading" className="overview-panel p-5 sm:p-6">
          <h2 id="status-heading" className="text-[15px] font-semibold text-slate-900">Clientes por estado</h2>
          <p className="mt-1 text-sm text-slate-600">Distribución de la cartera actual</p>
          <div className="relative mx-auto my-4 size-36" aria-hidden="true">
            <svg viewBox="0 0 180 180" className="size-full -rotate-90">
              <circle cx="90" cy="90" r="71" fill="none" stroke="#f1f5f9" strokeWidth="20" />
              {stateCounts.map((status, index) => {
                const precedingCount = stateCounts.slice(0, index).reduce((sum, state) => sum + state.count, 0);
                const segment = total ? (status.count / total) * circleLength : 0;
                return <circle key={status.name} cx="90" cy="90" r="71" fill="none" stroke={status.color} strokeWidth="20" strokeDasharray={`${Math.max(0, segment - (segment > 0 ? 7 : 0))} ${circleLength}`} strokeDashoffset={total ? -(precedingCount / total) * circleLength : 0} />;
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold tracking-tight tabular-nums text-slate-900">{total}</span>
              <span className="mt-0.5 text-xs text-slate-600">clientes</span>
            </div>
          </div>
          <ul className="space-y-1">
            {stateCounts.map((status) => (
              <li key={status.name}>
                <Link href={`/clientes?estado=${status.name}`} className="flex min-h-11 items-center justify-between rounded-md px-2 text-sm transition-colors hover:bg-slate-50 active:bg-blue-50">
                  <span className="flex items-center gap-2.5 text-slate-600"><span className={`size-2 rounded-full ${status.dot}`} aria-hidden="true" />{status.label}</span>
                  <span className="flex items-center gap-4 tabular-nums"><span className="font-semibold text-slate-900">{status.count}</span><span className="w-10 text-right text-slate-600">{total ? Math.round((status.count / total) * 100) : 0}%</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
        <section aria-labelledby="recent-heading" className="overview-panel">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <h2 id="recent-heading" className="text-[15px] font-semibold text-slate-900">Clientes recientes</h2>
              <p className="mt-1 text-sm text-slate-600">Últimas incorporaciones</p>
            </div>
            <Link href="/clientes" className="overview-link shrink-0 gap-1.5">Ver todos<ArrowRight className="size-3.5" aria-hidden="true" /></Link>
          </div>
          {recentClients.length ? (
            <ul className="divide-y divide-slate-100">
              {recentClients.map((client) => (
                <li key={client.id}>
                  <ClientFormDialog client={client}>
                    <button type="button" aria-label={`Editar a ${client.name}`} className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-5 py-4 text-left transition-colors hover:bg-slate-50 active:bg-blue-50 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:px-6">
                      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-700">{initials(client.name)}</span>
                      <span className="min-w-0 flex-1"><span className="block break-words text-sm font-medium text-slate-800">{client.name}</span><span className="mt-0.5 block break-words text-xs text-slate-600">{client.company}</span></span>
                      <Badge variant="outline" className={`col-start-2 justify-self-start rounded-md text-xs font-medium sm:col-auto ${statusStyles[client.status]}`}>{client.status}</Badge>
                      <span className="hidden w-14 shrink-0 text-right text-xs tabular-nums text-slate-600 sm:block">{new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(client.createdAt)).replace(".", "")}</span>
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
          <TasksOverview />
          <section aria-labelledby="owners-heading" className="overview-panel p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 id="owners-heading" className="text-[15px] font-semibold text-slate-900">Clientes por responsable</h2>
            </div>
            <p className="mt-1 text-sm text-slate-600">Asignaciones de tu cartera</p>
            <ul className="mt-5 space-y-4">
              {owners.map((owner) => (
                <li key={owner.name} className="flex items-center gap-3">
                  <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">{owner.initials}</span>
                  <div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="break-words text-sm font-medium text-slate-700">{owner.name}</span><span className="text-xs tabular-nums text-slate-600">{clientLabel(owner.count)}</span></div><div className="h-1 rounded-full bg-slate-100" aria-hidden="true"><div className="h-full rounded-full bg-blue-600" style={{ width: `${total ? (owner.count / total) * 100 : 0}%` }} /></div></div>
                </li>
              ))}
            </ul>
          </section>

        </div>
      </div>
      </>}
      </>}
      {(loading || error || total === 0) && <TasksOverview />}
    </div>
  );
}
