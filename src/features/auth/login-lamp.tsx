"use client";

import { useState } from "react";
import Image from "next/image";
import lampAtlas from "./assets/lamp-realistic-atlas-v1.webp";
import styles from "./login-lamp.module.css";

export function LoginLamp() {
  const [unavailable, setUnavailable] = useState(false);
  const photo = (illuminated: boolean, highPriority = false) => (
    <Image
      src={lampAtlas}
      alt=""
      aria-hidden="true"
      unoptimized
      loading="eager"
      fetchPriority={highPriority ? "high" : "auto"}
      draggable={false}
      className={`${styles.picture} ${illuminated ? styles.illuminated : ""}`}
      onError={() => setUnavailable(true)}
    />
  );

  return (
    <span className={styles.raster} data-lamp-source="photographic">
      <span className={`${styles.frame} ${styles.unlit}`} data-lamp-image="off" data-lamp-part="photo-off">{photo(false, true)}</span>
      <span className={styles.frame} data-lamp-image="on" data-lamp-part="photo-on">{photo(true)}</span>
      <span className={`${styles.frame} ${styles.filament}`} data-lamp-part="filament">{photo(true)}</span>
      <span className={`${styles.frame} ${styles.afterglow}`} data-lamp-part="afterglow">{photo(true)}</span>
      <span className={styles.bloom} data-lamp-part="halo" aria-hidden="true" />
      {unavailable && <span className={styles.unavailable} role="status">La imagen no pudo cargarse. Puedes encender la luz para continuar.</span>}
    </span>
  );
}
