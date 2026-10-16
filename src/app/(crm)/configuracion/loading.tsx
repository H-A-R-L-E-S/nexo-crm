import styles from "@/features/settings/settings.module.css";

export default function SettingsLoading() {
  return <main className={styles.routeLoading} role="status">
    <div><span /><h1>Configuración</h1><p>Comprobando tu cuenta y preferencias...</p></div>
    <section aria-hidden="true"><span /><span /><span /></section>
  </main>;
}
