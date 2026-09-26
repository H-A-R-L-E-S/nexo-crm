"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEMO_CLIENTS, DEMO_TODAY } from "./demo-data";
import type { Client, ClientActivity, ClientInput } from "./types";

type ClientsContextValue = {
  clients: Client[];
  addClient: (input: ClientInput) => void;
  updateClient: (id: string, input: ClientInput) => void;
  deleteClient: (id: string) => void;
  activity: ClientActivity[];
};

const ClientsContext = createContext<ClientsContextValue | null>(null);

export function ClientsProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>(() =>
    DEMO_CLIENTS.map((client) => ({ ...client })),
  );
  const [activity, setActivity] = useState<ClientActivity[]>([]);

  const recordActivity = useCallback((kind: ClientActivity["kind"], clientName: string) => {
    const item: ClientActivity = {
      id: crypto.randomUUID(),
      kind,
      clientName,
      occurredAt: new Date().toISOString(),
    };
    setActivity((current) => [item, ...current].slice(0, 20));
  }, []);

  const addClient = useCallback((input: ClientInput) => {
    const client: Client = {
      ...input,
      name: `${input.firstName} ${input.lastName}`.trim(),
      lastContact: null,
      id: crypto.randomUUID(),
      createdAt: DEMO_TODAY,
      updatedAt: DEMO_TODAY,
    };
    setClients((current) => [client, ...current]);
    recordActivity("created", client.name);
  }, [recordActivity]);

  const updateClient = useCallback((id: string, input: ClientInput) => {
    setClients((current) =>
      current.map((client) =>
        client.id === id
          ? { ...client, ...input, name: `${input.firstName} ${input.lastName}`.trim(), updatedAt: DEMO_TODAY }
          : client,
      ),
    );
    recordActivity("updated", `${input.firstName} ${input.lastName}`.trim());
  }, [recordActivity]);

  const deleteClient = useCallback((id: string) => {
    const client = clients.find((item) => item.id === id);
    if (!client) return;
    setClients((current) => current.filter((item) => item.id !== id));
    recordActivity("deleted", client.name);
  }, [clients, recordActivity]);

  const value = useMemo(
    () => ({ clients, addClient, updateClient, deleteClient, activity }),
    [clients, addClient, updateClient, deleteClient, activity],
  );

  return (
    <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>
  );
}

export function useClients() {
  const context = useContext(ClientsContext);
  if (!context) {
    throw new Error("useClients debe usarse dentro de ClientsProvider.");
  }
  return context;
}
