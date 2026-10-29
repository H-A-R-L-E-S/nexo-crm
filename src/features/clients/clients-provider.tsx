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
  ensure: () => Promise<Client[]>;
  load: () => Promise<Client[]>;
  reload: () => Promise<void>;
  addClient: (input: ClientInput) => Promise<void>;
  updateClient: (id: string, input: ClientInput) => Promise<void>;
  acceptCreatedClient: (client: Client) => void;
  acceptUpdatedClient: (client: Client) => void;
  deleteClient: (id: string) => Promise<void>;
};

const ClientsContext = createContext<ClientsContextValue | null>(null);

export function ClientsProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mutationVersion = useRef(0);
  const requestRef = useRef<Promise<Client[]> | null>(null);
  const clientsRef = useRef<Client[]>([]);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    if (requestRef.current) return requestRef.current;
    const version = mutationVersion.current;
    setLoading(true);
    setError(null);
    const request = getClientes();
    requestRef.current = request;
    try {
      const loaded = await request;
      if (mutationVersion.current === version) {
        clientsRef.current = loaded;
        loadedRef.current = true;
        setClients(loaded);
      }
      return loaded;
    } catch (cause) {
      if (mutationVersion.current === version) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los clientes.");
      throw cause;
    } finally {
      if (requestRef.current === request) requestRef.current = null;
      setLoading(false);
    }
  }, []);

  const ensure = useCallback(() => loadedRef.current ? Promise.resolve(clientsRef.current) : load(), [load]);

  const reload = useCallback(async () => {
    try {
      await load();
    } catch {
      // El estado de error ya fue actualizado por load.
    }
  }, [load]);

  useEffect(() => { queueMicrotask(() => void reload()); }, [reload]);

  const addClient = useCallback(async (input: ClientInput) => {
    const client = await createCliente(input);
    mutationVersion.current += 1;
    setClients((current) => {
      const next = [client, ...current];
      clientsRef.current = next;
      return next;
    });
  }, []);

  const updateClient = useCallback(async (id: string, input: ClientInput) => {
    const client = await updateCliente(id, input);
    mutationVersion.current += 1;
    setClients((current) => {
      const next = current.map((item) => item.id === id ? client : item);
      clientsRef.current = next;
      return next;
    });
  }, []);

  const acceptCreatedClient = useCallback((client: Client) => {
    mutationVersion.current += 1;
    setClients((current) => {
      const next = [client, ...current.filter((item) => item.id !== client.id)];
      clientsRef.current = next;
      return next;
    });
  }, []);

  const acceptUpdatedClient = useCallback((client: Client) => {
    mutationVersion.current += 1;
    setClients((current) => {
      const next = current.map((item) => item.id === client.id ? client : item);
      clientsRef.current = next;
      return next;
    });
  }, []);

  const deleteClient = useCallback(async (id: string) => {
    await deleteCliente(id);
    mutationVersion.current += 1;
    setClients((current) => {
      const next = current.filter((item) => item.id !== id);
      clientsRef.current = next;
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ clients, loading, error, ensure, load, reload, addClient, updateClient, acceptCreatedClient, acceptUpdatedClient, deleteClient }),
    [clients, loading, error, ensure, load, reload, addClient, updateClient, acceptCreatedClient, acceptUpdatedClient, deleteClient],
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
