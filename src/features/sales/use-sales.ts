"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getClientes } from "@/features/clients/services/clients.service";
import type { Client } from "@/features/clients/types";
import { getOpportunities } from "@/features/opportunities/services/opportunities.service";
import type { Opportunity } from "@/features/opportunities/types";
import { getSales, getSaleResponsibles } from "./services/sales.service";
import type { Sale, SaleResponsible } from "./types";

export type SalesDirectory = { clients: Client[]; opportunities: Opportunity[]; responsibles: SaleResponsible[] };
export function useSales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [directory, setDirectory] = useState<SalesDirectory>({ clients: [], opportunities: [], responsibles: [] });
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const version = useRef(0);
  const invalidate = useCallback(() => { ++version.current; }, []);
  const reload = useCallback(async () => {
    const request = ++version.current;
    setLoading(true); setError("");
    try {
      const [rows, clients, opportunities, responsibles] = await Promise.all([getSales(), getClientes(), getOpportunities(), getSaleResponsibles()]);
      if (request === version.current) { setSales(rows); setDirectory({ clients, opportunities, responsibles }); setLoaded(true); }
    } catch (cause) { if (request === version.current) setError(cause instanceof Error ? cause.message : "No se pudieron cargar las ventas."); }
    finally { if (request === version.current) setLoading(false); }
  }, []);
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void reload(); }); return () => { active = false; invalidate(); }; }, [reload, invalidate]);
  function saved(sale: Sale) { invalidate(); setLoading(false); setSales((rows) => rows.some((row) => row.id === sale.id) ? rows.map((row) => row.id === sale.id ? sale : row) : [sale, ...rows]); }
  function removed(id: string) { invalidate(); setLoading(false); setSales((rows) => rows.filter((row) => row.id !== id)); }
  return { sales, directory, loading, loaded, error, reload, saved, removed };
}
