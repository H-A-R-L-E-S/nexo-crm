import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import styles from "./directory.module.css";

export function DirectoryHeader({ title, description, count, loading, actions }: {
  title: string;
  description: string;
  count?: number;
  loading?: boolean;
  actions: ReactNode;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.heading}>
        <div className={styles.titleLine}>
          <h1>{title}</h1>
          {!loading && count !== undefined && <span className={styles.count} aria-label={`${count} ${title.toLowerCase()} en total`}>{count}</span>}
        </div>
        <p className={styles.description}>{description}</p>
      </div>
      <div className={styles.headerActions}>{actions}</div>
    </header>
  );
}

export function DirectorySummary({ items, loading, error }: {
  items: { label: string; value: number; detail?: string }[];
  loading?: boolean;
  error?: boolean;
}) {
  return (
    <dl className={styles.summary} aria-label="Resumen del directorio" aria-busy={loading}>
      {items.map((item) => (
        <div key={item.label} className={styles.summaryItem}>
          <dt>{item.label}</dt>
          <dd>{loading || error ? <><span className={styles.metricSkeleton} aria-hidden="true" /><span className="sr-only">{error ? "No disponible" : "Cargando"}</span></> : item.value}</dd>
          {item.detail && <dd className={styles.summaryDetail}>{item.detail}</dd>}
        </div>
      ))}
    </dl>
  );
}

export function DirectoryToolbar({ children, label = "Herramientas del directorio" }: { children: ReactNode; label?: string }) {
  return <div className={styles.toolbar} role="group" aria-label={label}>{children}</div>;
}

export function ActiveFilter({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Button variant="secondary" className={styles.activeFilter} onClick={onRemove} aria-label={`Quitar filtro: ${label}`} title={`Quitar filtro: ${label}`}>
      <span>{label}</span><X className="size-3.5" aria-hidden="true" />
    </Button>
  );
}

export function DirectoryLoading({ label }: { label: string }) {
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <p>{label}</p>
      <div aria-hidden="true" className={styles.skeletonRows}>
        {Array.from({ length: 5 }, (_, index) => (
          <div className={styles.skeletonRow} key={index}>
            <span /><span /><span />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DirectoryEmpty({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <h2>{title}</h2>
      <p>{description}</p>
      {action && <div className={styles.emptyAction}>{action}</div>}
    </div>
  );
}
