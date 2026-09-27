"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { createCliente, deleteCliente, getClientes, updateCliente } from "./services/clients.service";
import type { Client, ClientInput } from "./types";

type ClientsContextValue = {
  clients: Client[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  addClient: (input: ClientInput) => Promise<void>;
  updateClient: (id: string, input: ClientInput) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
};

const ClientsContext = createContext<ClientsContextValue | null>(null);

export function ClientsProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mutationVersion = useRef(0);

  const reload = useCallback(async () => {
    const version = mutationVersion.current;
    setLoading(true);
    setError(null);
    try {
      const loaded = await getClientes();
      if (mutationVersion.current === version) setClients(loaded);
    } catch (cause) {
      if (mutationVersion.current === version) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los clientes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { queueMicrotask(() => void reload()); }, [reload]);

  const addClient = useCallback(async (input: ClientInput) => {
    const client = await createCliente(input);
    mutationVersion.current += 1;
    setClients((current) => [client, ...current]);
  }, []);

  const updateClient = useCallback(async (id: string, input: ClientInput) => {
    const client = await updateCliente(id, input);
    mutationVersion.current += 1;
    setClients((current) => current.map((item) => item.id === id ? client : item));
  }, []);

  const deleteClient = useCallback(async (id: string) => {
    await deleteCliente(id);
    mutationVersion.current += 1;
    setClients((current) => current.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(
    () => ({ clients, loading, error, reload, addClient, updateClient, deleteClient }),
    [clients, loading, error, reload, addClient, updateClient, deleteClient],
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
