"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import styles from "./error.module.css";

export default function CrmError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("Fallo inesperado en una ruta del CRM", error.digest ?? "sin identificador");
  }, [error]);

  return <section className={styles.boundary} role="alert" aria-labelledby="crm-error-title">
    <div className={styles.marker} aria-hidden="true">!</div>
    <div className={styles.copy}>
      <p className={styles.context}>Nexo CRM</p>
      <h1 id="crm-error-title">No pudimos mostrar esta sección</h1>
      <p>Ocurrió un problema inesperado. Puedes reintentar sin perder tu sesión o volver al resumen para continuar trabajando.</p>
    </div>
    <div className={styles.actions}>
      <Button onClick={() => retry()}>Reintentar</Button>
      <Button asChild variant="outline"><Link href="/">Volver al resumen</Link></Button>
    </div>
  </section>;
}
