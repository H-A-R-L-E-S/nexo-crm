// Requiere un cambio revisado de código después de validar PostgreSQL/RLS.
export const CLIENT_RESPONSIBLES_UUID_ENABLED = false;

export function assertClientResponsiblesEnabled() {
  if (!CLIENT_RESPONSIBLES_UUID_ENABLED) throw new Error("Las asignaciones UUID de Clientes todavía no están habilitadas.");
}

function loopbackUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol)
      && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      && !url.username && !url.password && !url.search && !url.hash && url.pathname === "/";
  } catch { return false; }
}

export function localResponsiblesPreviewAllowed(input: { flag?: string; supabaseUrl?: string; requestHost?: string }) {
  return input.flag === "enabled" && loopbackUrl(input.supabaseUrl)
    && Boolean(input.requestHost && loopbackUrl(`http://${input.requestHost}`));
}
