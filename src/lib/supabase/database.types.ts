import type { Profile } from "@/features/auth/types";
import type { ClientStatus } from "@/features/clients/types";
import type { Lead, NuevoLead, LeadConversion, LeadResponsable } from "@/features/leads/types";
import type { OpportunityRow, CreateOpportunity, OpportunityResponsible } from "@/features/opportunities/types";

export type ClientRow = {
  id: string; nombres: string; apellidos: string; empresa: string; correo: string;
  telefono: string; cargo: string; estado: ClientStatus; direccion: string;
  notas: string; responsable: string; ultimo_contacto: string | null;
  created_at: string; updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      oportunidades: { Row: OpportunityRow; Insert: CreateOpportunity; Update: Partial<CreateOpportunity>; Relationships: [] };
      leads: { Row: Lead; Insert: NuevoLead; Update: Partial<NuevoLead>; Relationships: [] };
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
      opportunity_responsibles: { Args: Record<string, never>; Returns: OpportunityResponsible[] };
      lead_responsibles: { Args: Record<string, never>; Returns: LeadResponsable[] };
      convert_lead: { Args: { p_lead_id: string; p_apellidos: string; p_correo: string; p_existing_client_id: string | null }; Returns: LeadConversion[] };
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
