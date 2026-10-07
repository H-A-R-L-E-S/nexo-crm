"use client";

import Link from "next/link";
import { Plus, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientFormDialog } from "@/features/clients/client-form";
import { TasksOverview } from "@/features/tasks/tasks-overview";
import { useClients } from "@/features/clients/clients-provider";

const statuses = [
  { name: "Activo", label: "Activos", color: "var(--chart-blue)" },
  { name: "Prospecto", label: "Prospectos", color: "var(--chart-neutral)" },
  { name: "Inactivo", label: "Inactivos", color: "var(--chart-dark)" },
] as const;
const numberFormatter = new Intl.NumberFormat("es-PE");
const monthFormatter = new Intl.DateTimeFormat("es-PE", { month: "short", timeZone: "UTC" });

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}
function monthKey(date: Date) { return date.toISOString().slice(0, 7); }
function clientLabel(count: number) { return `${numberFormatter.format(count)} ${count === 1 ? "cliente" : "clientes"}`; }

function MonthlyChart({ months }: { months: { key: string; label: string; total: number }[] }) {
  const maximum = Math.max(4, ...months.map((month) => month.total));
  const step = Math.ceil(maximum / 4);
  const ceiling = step * 4;

  return (
    <div className="monthly-chart relative">
      <div className="monthly-chart-plot relative h-44 grid-cols-[1.5rem_minmax(0,1fr)] gap-2" aria-hidden="true">
        <div className="chart-label relative mb-7 text-xs tabular-nums">
          {[0, 1, 2, 3, 4].map((tick) => <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - tick * 25}%` }}>{tick * step}</span>)}
        </div>
        <div className="relative min-w-0">
          <div className="absolute inset-x-0 bottom-7 top-0 flex flex-col justify-between">
            {[0, 1, 2, 3, 4].map((tick) => <div key={tick} className="chart-grid border-t" />)}
          </div>
          <div className="relative grid h-full grid-cols-6 gap-3">
            {months.map((month, index) => <div key={month.key} className="flex min-w-0 flex-col">
              <div className="flex min-h-0 flex-1 items-end justify-center pb-px">
                <div className="chart-bar relative w-full max-w-7 rounded-t-sm" style={{ height: `${(month.total / ceiling) * 100}%` }}>
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-medium tabular-nums text-foreground">{month.total}</span>
                </div>
              </div>
              <span className={`flex h-7 items-end justify-center text-xs ${index === months.length - 1 ? "font-semibold text-link" : "chart-label"}`}>{month.label}</span>
            </div>)}
          </div>
        </div>
      </div>
      <div className="monthly-chart-data">
        <table className="w-full text-sm">
          <caption className="sr-only">Clientes registrados en los últimos seis meses</caption>
          <thead className="sr-only"><tr><th scope="col">Mes</th><th scope="col">Clientes registrados</th></tr></thead>
          <tbody>{months.map((month, index) => <tr key={month.key}>
            <th scope="row" className={`w-12 py-2 pr-3 text-left font-medium ${index === months.length - 1 ? "text-link" : "text-muted-foreground"}`}>{month.label}</th>
            <td className="py-2"><div className="flex items-center gap-3"><div className="h-2 min-w-0 flex-1 rounded-sm bg-muted" aria-hidden="true"><div className="chart-bar h-full rounded-sm" style={{ width: `${(month.total / ceiling) * 100}%` }} /></div><span className="w-6 text-right tabular-nums">{month.total}</span></div></td>
          </tr>)}</tbody>
        </table>
      </div>
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
  const stateCounts = statuses.map((status) => ({ ...status, count: clients.filter((client) => client.status === status.name).length }));
  const owners = [...new Set(clients.map((client) => client.owner))]
    .map((name) => ({ name, initials: initials(name), count: clients.filter((client) => client.owner === name).length }))
    .sort((a, b) => b.count - a.count);
  const formattedDate = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Lima" }).format(referenceDate);
  const displayDay = new Intl.DateTimeFormat("en-CA", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Lima" }).format(referenceDate);
  const monthsTotal = months.reduce((sum, month) => sum + month.total, 0);
  const metrics = [
    { label: "Clientes totales", value: total, detail: "Tu cartera en un solo lugar", href: "/clientes" },
    { label: "Clientes activos", value: active, detail: `${total ? Math.round((active / total) * 100) : 0}% de tu cartera de clientes`, href: "/clientes?estado=Activo" },
    { label: "Prospectos", value: prospects, detail: prospects === 1 ? "Una relación por desarrollar" : "Relaciones por desarrollar", href: "/clientes?estado=Prospecto" },
    { label: "Nuevos este mes", value: currentMonth, detail: monthDifference === 0 ? `La misma cantidad que en ${months[4].fullLabel}` : `${Math.abs(monthDifference)} ${monthDifference > 0 ? "más" : "menos"} que en ${months[4].fullLabel}`, href: "/clientes" },
  ];

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.035em] sm:text-[1.75rem]">Resumen</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Tu cartera y los próximos seguimientos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <time dateTime={displayDay} className="text-xs text-muted-foreground">{formattedDate}</time>
          <ClientFormDialog><Button className="h-9 gap-2 px-3"><Plus className="size-4" aria-hidden="true" />Nuevo cliente</Button></ClientFormDialog>
        </div>
      </div>

      {!loading && !error && <section aria-label="Indicadores de clientes" className="overview-metrics">
        {metrics.map((metric) => <Link key={metric.label} href={metric.href} className="overview-metric">
          <p className="metric-label">{metric.label}</p>
          <p className="metric-value">{numberFormatter.format(metric.value)}</p>
          <p className="metric-detail">{metric.detail}</p>
        </Link>)}
      </section>}

      <div className="overview-workspace">
        <div className="overview-work">
          <TasksOverview />
          {!loading && !error && total > 0 && <section aria-labelledby="owners-heading" className="overview-owners">
            <h2 id="owners-heading" className="overview-section-title">Clientes por responsable</h2>
            <p className="overview-section-context">Asignaciones de tu cartera</p>
            <ul className="mt-4 space-y-4">
              {owners.map((owner) => <li key={owner.name} className="flex items-start gap-2.5">
                <span aria-hidden="true" className="recent-client-avatar shrink-0">{owner.initials}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1"><span className="break-words text-sm font-medium">{owner.name}</span><span className="text-xs tabular-nums text-muted-foreground">{clientLabel(owner.count)}</span></div>
                  <div className="mt-2 h-1 rounded-sm bg-muted" aria-hidden="true"><div className="chart-bar h-full rounded-sm" style={{ width: `${total ? (owner.count / total) * 100 : 0}%` }} /></div>
                </div>
              </li>)}
            </ul>
          </section>}
        </div>

        <div className="overview-analysis">
          {loading ? <section role="status" className="overview-state">
            <p className="text-sm text-muted-foreground">Cargando clientes...</p>
            <div aria-hidden="true" className="mt-5 grid grid-cols-3 gap-4"><div className="h-20 rounded-md bg-muted" /><div className="h-20 rounded-md bg-muted" /><div className="h-20 rounded-md bg-muted" /></div>
          </section> : error ? <section role="alert" className="overview-state space-y-3">
            <h2 className="text-sm font-semibold text-destructive">No se pudo cargar tu cartera</h2>
            <p className="break-words text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => void reload()}>Reintentar clientes</Button>
          </section> : total === 0 ? <section aria-label="Cartera vacía" className="overview-state flex flex-col items-start gap-3">
            <UsersRound className="size-6 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Tu cartera está lista para el primer cliente</h2>
            <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">Registra un cliente para consultar tus indicadores, las altas por mes y la distribución de tu cartera.</p>
            <ClientFormDialog><Button variant="outline" className="mt-1">Registrar primer cliente</Button></ClientFormDialog>
          </section> : <>
            <div className="overview-analytics">
              <section aria-labelledby="growth-heading" className="min-w-0">
                <h2 id="growth-heading" className="overview-section-title">Crecimiento de tu cartera</h2>
                <p className="overview-section-context">Nuevos clientes registrados cada mes</p>
                <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-xl font-semibold tracking-tight tabular-nums">{numberFormatter.format(monthsTotal)}</span>
                  <span className="text-xs text-muted-foreground">en los últimos 6 meses · {months[5].label} actual</span>
                </div>
                <MonthlyChart months={months} />
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{clientLabel(monthsTotal)} {monthsTotal === 1 ? "registrado" : "registrados"} entre {months[0].periodLabel} y {months[5].periodLabel}</p>
              </section>

              <section aria-labelledby="status-heading" className="min-w-0">
                <h2 id="status-heading" className="overview-section-title">Clientes por estado</h2>
                <p className="overview-section-context">Distribución de la cartera actual</p>
                <ul className="mt-4 space-y-1">
                  {stateCounts.map((status) => <li key={status.name}>
                    <Link href={`/clientes?estado=${status.name}`} className="overview-status-row">
                      <span className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">{status.label}</span>
                        <span className="flex items-baseline gap-3 tabular-nums"><span className="font-semibold">{status.count}</span><span className="w-10 text-right text-xs text-muted-foreground">{total ? Math.round((status.count / total) * 100) : 0}%</span></span>
                      </span>
                      <span className="overview-status-track block" aria-hidden="true"><span className="overview-status-fill block" style={{ width: `${total ? (status.count / total) * 100 : 0}%`, background: status.color }} /></span>
                    </Link>
                  </li>)}
                </ul>
              </section>
            </div>

            <section aria-labelledby="recent-heading" className="border-t border-border pt-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div><h2 id="recent-heading" className="overview-section-title">Clientes recientes</h2><p className="overview-section-context">Últimas incorporaciones</p></div>
                <Link href="/clientes" className="overview-link">Ver todos</Link>
              </div>
              <ul className="divide-y divide-border">
                {recentClients.map((client) => <li key={client.id}>
                  <ClientFormDialog client={client}>
                    <button type="button" aria-label={`Editar a ${client.name}`} className="recent-client">
                      <span aria-hidden="true" className="recent-client-avatar">{initials(client.name)}</span>
                      <span className="min-w-0"><span className="block break-words text-sm font-medium">{client.name}</span><span className="mt-0.5 block break-words text-xs text-muted-foreground">{client.company}</span></span>
                      <span className="client-status" data-status={client.status}>{client.status}</span>
                      <span className="hidden text-right text-xs tabular-nums text-muted-foreground sm:block">{new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(client.createdAt)).replace(".", "")}</span>
                    </button>
                  </ClientFormDialog>
                </li>)}
              </ul>
            </section>
          </>}
        </div>
      </div>
    </div>
  );
}
