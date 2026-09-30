import type { Profile } from "@/features/auth/types";
import type { ClientStatus } from "@/features/clients/types";

export type ClientRow = {
  id: string; nombres: string; apellidos: string; empresa: string; correo: string;
  telefono: string; cargo: string; estado: ClientStatus; direccion: string;
  notas: string; responsable: string; ultimo_contacto: string | null;
  created_at: string; updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      clientes: {
        Row: ClientRow;
        Insert: Omit<ClientRow, "id" | "created_at" | "updated_at" | "ultimo_contacto"> & Partial<Pick<ClientRow, "id" | "created_at" | "updated_at" | "ultimo_contacto">>;
        Update: Partial<ClientRow>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Pick<Profile, "id" | "email"> & Partial<Omit<Profile, "id" | "email">>;
        Update: Partial<Profile>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      admin_update_profile: {
        Args: { p_id: string; p_nombres: string; p_apellidos: string; p_rol: Profile["rol"]; p_activo: boolean; p_updated_at: string | null };
        Returns: Profile[];
      };
      admin_user_management_ready: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
