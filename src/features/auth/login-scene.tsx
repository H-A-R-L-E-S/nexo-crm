"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Brand } from "@/components/layout/brand";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { LoginLamp } from "./login-lamp";
import styles from "./login-scene.module.css";

const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

export function LoginScene({ children }: { children: ReactNode }) {
  const [lit, setLit] = useState(false);
  const hydrated = useSyncExternalStore(subscribe, onClient, onServer);

  return (
    <main className={styles.scene} data-lit={lit}>
      <div className={styles.lighting} aria-hidden="true"><div className={styles.beam} /><div className={styles.ambient} /><div className={styles.floor} /></div>
      <div className={styles.tools}><span>Apariencia</span><ThemeSwitcher /></div>
      <div className={styles.composition}>
        <div className={styles.lampArea}>
          <button type="button" className={styles.lampButton} disabled={!hydrated} onClick={() => setLit(!lit)} aria-label={lit ? "Apagar lámpara" : "Encender lámpara"} aria-pressed={lit} aria-controls="login-access" aria-describedby="lamp-instruction">
            <span className={styles.fixture}><LoginLamp /></span>
          </button>
          <p id="lamp-instruction" className={styles.instruction}>{lit ? "La luz está encendida" : "Enciende la luz para continuar"}<span>{lit ? "Pulsa la lámpara para apagarla" : "Pulsa la lámpara"}</span></p>
        </div>
        <section id="login-access" aria-label="Acceso a Nexo CRM" inert={!lit} aria-hidden={!lit} className={styles.formStage}>
          <div className={styles.formContent}>
            <Brand />
            <h1>Bienvenido a tu espacio</h1>
            <p className={styles.description}>Inicia sesión y sigue construyendo grandes relaciones.</p>
            {children}
            <p className={styles.signature}>Nexo CRM · Hecho para conectar</p>
          </div>
        </section>
      </div>
    </main>
  );
}
