import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" aria-label="Nexo CRM, ir al resumen" className="inline-flex w-fit items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
      <span className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 18V6l14 12V6" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      <span className="text-[25px] font-bold tracking-[-1.2px] text-slate-900">nexo<span className="ml-1.5 text-[10px] font-semibold tracking-[1.4px] text-slate-500">CRM</span></span>
    </Link>
  );
}
