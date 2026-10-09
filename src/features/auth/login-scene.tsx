"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { Brand } from "@/components/layout/brand";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { LoginLamp } from "./login-lamp";
import styles from "./login-scene.module.css";

const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

const dust = Array.from({ length: 42 }, (_, index) => ({
  left: `${8 + ((index * 37.71) % 84)}%`,
  top: `${3 + ((index * 23.43) % 89)}%`,
  "--mote-size": `${index % 9 === 0 ? 4.2 : index % 4 === 0 ? 2.1 : .8 + (index % 3) * .35}px`,
  "--mote-opacity": `${.16 + (index % 6) * .06}`,
  "--mote-blur": `${index % 9 === 0 ? 1.3 : .15}px`,
  "--mote-time": `${14 + (index % 7)}s`,
  "--mote-delay": `${-(index % 11)}s`,
  "--mote-drift": `${index % 2 === 0 ? 9 : -7}px`,
}) as CSSProperties);

export function LoginScene({ children }: { children: ReactNode }) {
  const [lit, setLit] = useState(false);
  const [accessReady, setAccessReady] = useState(false);
  const scene = useRef<HTMLElement>(null);
  const hydrated = useSyncExternalStore(subscribe, onClient, onServer);

  useEffect(() => {
    if (!lit) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const control = getComputedStyle(scene.current!).getPropertyValue("--motion-control").trim();
    const controlMs = parseFloat(control) * (control.endsWith("ms") ? 1 : 1000);
    const duration = Number.isFinite(controlMs) ? controlMs * 5.5 : 1100;
    const timer = window.setTimeout(() => setAccessReady(true), preference.matches ? 0 : duration);
    const reduce = (event: MediaQueryListEvent) => {
      if (event.matches) {
        window.clearTimeout(timer);
        setAccessReady(true);
      }
    };
    preference.addEventListener("change", reduce);
    return () => {
      window.clearTimeout(timer);
      preference.removeEventListener("change", reduce);
    };
  }, [lit]);

  function toggleLight() {
    const next = !lit;
    setAccessReady(next && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setLit(next);
  }

  return (
    <main ref={scene} className={styles.scene} data-lit={lit} data-access-ready={accessReady}>
      <div className={styles.lighting} aria-hidden="true">
        <div className={styles.wall} />
        <div className={styles.ambient} data-light-layer="ambient" />
        <div className={styles.beam} data-light-layer="beam" />
        <div className={styles.spill} data-light-layer="spill" />
        <div className={styles.halo} data-light-layer="halo" />
        <div className={styles.mist} data-light-layer="mist" />
        <div className={styles.floor} data-light-layer="floor" />
        <div className={styles.dust} data-light-layer="dust">
          {dust.map((style, index) => <span key={index} style={style} />)}
        </div>
      </div>
      <div className={styles.sceneIdentity} aria-hidden="true">Nexo<span>CRM</span></div>
      <div className={styles.tools}><span>Apariencia</span><ThemeSwitcher /></div>
      <div className={styles.composition}>
        <div className={styles.lampArea}>
          <button type="button" className={styles.lampButton} disabled={!hydrated} onClick={toggleLight} aria-label={lit ? "Apagar lámpara" : "Encender lámpara"} aria-pressed={lit} aria-controls="login-access" aria-describedby="lamp-instruction">
            <span className={styles.fixture}><LoginLamp /></span>
            <span className={styles.lampFocus} data-lamp-focus aria-hidden="true">Luz</span>
          </button>
          <p id="lamp-instruction" className={styles.instruction}>
            <span className={styles.instructionTitle}>{lit ? "Tu espacio, encendido." : <>Enciende la luz <br />para continuar.</>}</span>
            <span className={styles.instructionAction}>{lit ? "Pulsa la lámpara para apagarla" : "Pulsa la lámpara"}</span>
          </p>
        </div>
        <section id="login-access" aria-label="Acceso a Nexo CRM" inert={!accessReady} aria-hidden={!accessReady} className={styles.formStage}>
          <div className={styles.formContent}>
            <Brand />
            <h1>Bienvenido <br />a tu espacio.</h1>
            <p className={styles.description}>Inicia sesión para retomar tus clientes y próximos pasos.</p>
            {children}
            <p className={styles.signature}>Nexo CRM · Cada relación cuenta</p>
          </div>
        </section>
      </div>
    </main>
  );
}
