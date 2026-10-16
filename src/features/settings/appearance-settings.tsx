"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import styles from "./settings.module.css";

const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;
const themes = [
  { value: "light", label: "Claro", description: "Superficies luminosas y contraste oscuro.", icon: Sun },
  { value: "dark", label: "Oscuro", description: "Menos luminancia para ambientes con poca luz.", icon: Moon },
  { value: "system", label: "Sistema", description: "Sigue la preferencia de este dispositivo.", icon: Monitor },
] as const;

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const hydrated = useSyncExternalStore(subscribe, onClient, onServer);

  return <section aria-labelledby="appearance-title" className={styles.appearance}>
    <div className={styles.sectionHeading}>
      <div><p>Apariencia</p><h2 id="appearance-title">Cómo ves Nexo</h2></div>
      <span className={styles.currentTheme}>{hydrated ? themes.find((item) => item.value === theme)?.label ?? "Sistema" : "Cargando"}</span>
    </div>
    <div role="radiogroup" aria-label="Tema de la aplicación" className={styles.themeGrid} aria-busy={!hydrated}>
      {themes.map(({ value, label, description, icon: Icon }) => {
        const selected = hydrated && theme === value;
        return <button key={value} type="button" role="radio" aria-checked={selected} disabled={!hydrated} onClick={() => setTheme(value)} className={styles.themeOption}>
          <span className={styles.themePreview} data-theme={value} aria-hidden="true"><i /><i /><i /></span>
          <span className={styles.themeCopy}><Icon aria-hidden="true" /><strong>{label}</strong><small>{description}</small></span>
          <span className={styles.selection} aria-hidden="true" />
        </button>;
      })}
    </div>
    <p className={styles.note}>La selección se guarda en este navegador. Sistema se ajusta cuando cambia la apariencia del dispositivo.</p>
  </section>;
}
