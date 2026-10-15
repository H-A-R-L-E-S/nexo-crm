import styles from "@/features/sales/sales-loading.module.css";

export default function Loading() {
  return <div role="status" className={styles.loading}>
    <span className="sr-only">Cargando ventas...</span>
    <div className={styles.header}><div /><div /></div>
    <div className={styles.summary}><div /><div /><div /><div /></div>
    <div className={styles.toolbar} />
    <div className={styles.rows}>{Array.from({ length: 5 }, (_, index) => <div key={index} />)}</div>
  </div>;
}
