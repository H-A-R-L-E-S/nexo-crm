"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getLeadResponsibles, getLeads } from "./services/leads.service";
import type { Lead, LeadResponsable } from "./types";

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [responsibles, setResponsibles] = useState<LeadResponsable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const version = useRef(0);
  const reload = useCallback(async () => {
    const requestVersion = ++version.current;
    setLoading(true); setError("");
    try {
      const [rows, people] = await Promise.all([getLeads(), getLeadResponsibles()]);
      if (requestVersion === version.current) { setLeads(rows); setResponsibles(people); }
    } catch (cause) {
      if (requestVersion === version.current) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los leads.");
    } finally {
      if (requestVersion === version.current) setLoading(false);
    }
  }, []);
  const invalidate = useCallback(() => { ++version.current; }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void reload(); });
    return () => { active = false; invalidate(); };
  }, [reload, invalidate]);
  function saved(lead: Lead) {
    ++version.current; setLoading(false);
    setLeads((current) => current.some((item) => item.id === lead.id) ? current.map((item) => item.id === lead.id ? lead : item) : [lead, ...current]);
  }
  function removed(id: string) {
    ++version.current; setLoading(false);
    setLeads((current) => current.filter((item) => item.id !== id));
  }
  return { leads, responsibles, loading, error, reload, saved, removed };
}
