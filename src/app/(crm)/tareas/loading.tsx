import styles from "@/features/tasks/tasks-loading.module.css";

export default function LoadingTasks() {
  return <div role="status" aria-label="Cargando tareas" className={styles.page}>
    <div className={styles.header}><div><div className={styles.line} /><div className={`${styles.line} ${styles.subline}`} /></div><div className={styles.button} /></div>
    <div className={styles.summary}>{Array.from({ length: 4 }, (_, index) => <div className={styles.metric} key={index} />)}</div>
    <div className={styles.panel} />
    <span className="sr-only">Cargando tareas...</span>
  </div>;
}
