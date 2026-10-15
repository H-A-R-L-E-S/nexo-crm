import styles from "@/features/users/users.module.css";

export default function UsersLoading() {
  return <main className={styles.routeLoading} role="status">
    <div><span /><h1>Usuarios</h1><p>Comprobando permisos y cargando el equipo...</p></div>
    <section aria-hidden="true"><span /><span /><span /></section>
  </main>;
}
