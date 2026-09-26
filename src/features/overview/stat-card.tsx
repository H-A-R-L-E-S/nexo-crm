import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string;
  comparison: string;
  change: number;
  icon: LucideIcon;
  tone: "blue" | "violet" | "emerald" | "amber";
  href?: string;
};

const tones = {
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
};

export function StatCard({ title, value, comparison, change, icon: Icon, tone, href }: StatCardProps) {
  const TrendIcon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-slate-500">{title}</span>
        <span className={`flex size-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="size-[19px]" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-[30px] font-semibold leading-tight tracking-tight text-slate-950 tabular-nums xl:text-[32px]">{value}</p>
      <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-slate-500">
        <span className={`inline-flex items-center gap-0.5 font-medium ${change >= 0 ? "text-emerald-700" : "text-amber-700"}`}>
          <TrendIcon className="size-3.5" aria-hidden="true" />{comparison}
        </span>
        <span>vs. mes anterior</span>
      </p>
    </>
  );
  const className = "rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs";

  return href ? (
    <Link href={href} className={`${className} transition hover:border-blue-200 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600`}>
      {content}
    </Link>
  ) : (
    <article aria-label={title} className={className}>{content}</article>
  );
}
