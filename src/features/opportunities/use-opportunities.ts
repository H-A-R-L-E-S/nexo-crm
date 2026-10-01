"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getClientes } from "@/features/clients/services/clients.service";
import type { Client } from "@/features/clients/types";
import { getLeads } from "@/features/leads/services/leads.service";
import type { Lead } from "@/features/leads/types";
import { getOpportunities, getOpportunityResponsibles } from "./services/opportunities.service";
import type { Opportunity, OpportunityResponsible } from "./types";

export type OpportunityDirectory = { clients: Client[]; leads: Lead[]; responsibles: OpportunityResponsible[] };
export function useOpportunities() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [directory, setDirectory] = useState<OpportunityDirectory>({ clients: [], leads: [], responsibles: [] });
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const version = useRef(0);
  const invalidate = useCallback(() => { ++version.current; }, []);
  const reload = useCallback(async () => {
    const request = ++version.current;
    setLoading(true); setError("");
    try {
      const [opportunities, clients, leads, responsibles] = await Promise.all([getOpportunities(), getClientes(), getLeads(), getOpportunityResponsibles()]);
      if (request === version.current) { setItems(opportunities); setDirectory({ clients, leads, responsibles }); setLoaded(true); }
    } catch (cause) { if (request === version.current) setError(cause instanceof Error ? cause.message : "No se pudieron cargar las oportunidades."); }
    finally { if (request === version.current) setLoading(false); }
  }, []);
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void reload(); }); return () => { active = false; invalidate(); }; }, [reload, invalidate]);
  function saved(item: Opportunity) { invalidate(); setLoading(false); setItems((rows) => rows.some((row) => row.id === item.id) ? rows.map((row) => row.id === item.id ? item : row) : [item, ...rows]); }
  function removed(id: string) { invalidate(); setLoading(false); setItems((rows) => rows.filter((row) => row.id !== id)); }
  return { items, directory, loading, loaded, error, reload, saved, removed };
}
