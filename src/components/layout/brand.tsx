import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" aria-label="Nexo CRM, ir al resumen" className="inline-flex w-fit items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 18V6l14 12V6" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      <span className="text-[1.375rem] font-semibold tracking-[-0.055em] text-foreground">nexo<span className="ml-1.5 text-xs font-medium tracking-normal text-muted-foreground">CRM</span></span>
    </Link>
  );
}
