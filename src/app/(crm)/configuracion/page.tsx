import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { requireProfile } from "@/features/auth/server";
import { canDeleteClient, isAdmin } from "@/features/auth/roles";
import { getInitials } from "@/lib/format";
import { AppearanceSettings } from "@/features/settings/appearance-settings";
import { profileName } from "@/features/auth/types";
import styles from "@/features/settings/settings.module.css";

export const metadata: Metadata = { title: "Configuración | Nexo CRM" };

export default async function SettingsPage() {
  const profile = await requireProfile();
  const name = profileName(profile);

  return <main className={styles.page} data-settings-page>
    <header className={styles.header}>
      <p>Espacio de trabajo</p>
      <h1>Configuración</h1>
      <span>Revisa tu cuenta, apariencia y accesos disponibles en Nexo.</span>
    </header>

    <div className={styles.layout}>
      <section aria-labelledby="account-title" className={styles.account}>
        <div className={styles.sectionHeading}>
          <div><p>Cuenta</p><h2 id="account-title">Tu identidad en Nexo</h2></div>
          <UserRound aria-hidden="true" />
        </div>
        <div className={styles.identity}>
          <span aria-hidden="true">{getInitials(name)}</span>
          <div><strong>{name}</strong><p>{profile.email}</p></div>
        </div>
        <dl className={styles.accountFacts}>
          <div><dt>Rol</dt><dd>{profile.rol}</dd></div>
          <div><dt>Estado</dt><dd data-active={profile.activo}>{profile.activo ? "Activo" : "Inactivo"}</dd></div>
        </dl>
        <Link href="/perfil" className={styles.linkAction}>Editar información personal<ArrowUpRight aria-hidden="true" /></Link>
        <p className={styles.note}>Desde Mi perfil puedes editar únicamente tus nombres y apellidos. El correo, rol y estado requieren intervención administrativa.</p>
      </section>

      <AppearanceSettings />

      <section aria-labelledby="workspace-title" className={styles.workspace}>
        <div className={styles.sectionHeading}>
          <div><p>Contexto</p><h2 id="workspace-title">Espacio de trabajo</h2></div>
          <ShieldCheck aria-hidden="true" />
        </div>
        <dl className={styles.systemFacts}>
          <div><dt>Idioma</dt><dd>Español (Perú)</dd></div>
          <div><dt>Moneda</dt><dd>Sol peruano · S/</dd></div>
          <div><dt>Almacenamiento</dt><dd>Supabase</dd></div>
          <div><dt>Permisos de clientes</dt><dd>{canDeleteClient(profile.rol) ? "Leer, crear, editar y eliminar" : "Leer, crear y editar"}</dd></div>
        </dl>
        <p className={styles.note}>Estos valores describen la configuración actual de Nexo y no se editan desde esta pantalla.</p>
      </section>

      {isAdmin(profile.rol) && <section aria-labelledby="admin-title" className={styles.administration}>
        <div className={styles.sectionHeading}>
          <div><p>Administración</p><h2 id="admin-title">Equipo y accesos</h2></div>
          <UsersRound aria-hidden="true" />
        </div>
        <p>Administra miembros, roles y estado de acceso sin eliminar su historial.</p>
        <Link href="/configuracion/usuarios" className={styles.adminLink}><span><strong>Usuarios</strong><small>Directorio, permisos y altas</small></span><ArrowUpRight aria-hidden="true" /></Link>
      </section>}
    </div>
  </main>;
}
