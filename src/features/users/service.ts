import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/features/auth/roles";
import type { Profile } from "@/features/auth/types";
import type { EditUserInput, NewUserInput } from "./types";

export async function adminContext() {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Tu sesión terminó. Inicia sesión nuevamente.");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (profileError || !profile.activo || !isAdmin(profile.rol)) throw new Error("Solo un Administrador activo puede administrar usuarios.");
  return { supabase, profile };
}

type AdminContext = Awaited<ReturnType<typeof adminContext>>;

export async function listUsers({ supabase }: AdminContext): Promise<Profile[]> {
  const profiles: Profile[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
    if (error) throw new Error("No se pudo cargar el equipo. Revisa tu conexión y la configuración de permisos.");
    profiles.push(...data);
    if (data.length < 500) return profiles;
  }
}

async function applyProfile(context: AdminContext, input: Omit<EditUserInput, "updatedAt"> & { updatedAt: string | null }): Promise<Profile> {
  if (input.id === context.profile.id && (!input.activo || !isAdmin(input.rol))) throw new Error("No puedes desactivarte ni quitarte tu rol de Administrador.");
  const { data, error } = await context.supabase.rpc("admin_update_profile", {
    p_id: input.id, p_nombres: input.nombres, p_apellidos: input.apellidos,
    p_rol: input.rol, p_activo: input.activo, p_updated_at: input.updatedAt,
  }).single();
  if (error) {
    if (["42501", "40001", "22023", "P0002"].includes(error.code)) throw new Error(error.message);
    throw new Error("No se pudo guardar el usuario. Revisa tu conexión y la configuración de administración.");
  }
  return data;
}

export async function editUser(context: AdminContext, input: EditUserInput) {
  return applyProfile(context, input);
}

export async function setUserStatus(context: AdminContext, input: Pick<EditUserInput, "id" | "activo" | "updatedAt">) {
  const { data: target, error } = await context.supabase.from("profiles").select("*").eq("id", input.id).single();
  if (error || !target) throw new Error("No se pudo encontrar el usuario. Actualiza la lista.");
  return applyProfile(context, { ...input, nombres: target.nombres, apellidos: target.apellidos, rol: target.rol });
}

export class PartialUserCreationError extends Error {}

export async function createUser(context: AdminContext, input: NewUserInput) {
  const { data: ready, error: readinessError } = await context.supabase.rpc("admin_user_management_ready");
  if (readinessError || !ready) throw new Error("La administración de usuarios no está habilitada. Verifica la migración y tus permisos.");
  // context fue comprobado con el cliente de sesión; la clave privilegiada solo
  // se utiliza para Auth. Los roles se cambian mediante RPC con el JWT del actor.
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email, password: input.password, email_confirm: true,
    user_metadata: { nombres: input.nombres, apellidos: input.apellidos },
    app_metadata: { nexo_provisioning: true },
  });
  if (error || !data.user) {
    if (error?.code === "email_exists" || error?.code === "user_already_exists") throw new Error("Ya existe una cuenta con este correo.");
    if (error?.code === "weak_password") throw new Error("La contraseña no cumple la política de seguridad del proyecto.");
    throw new Error("No se pudo crear la cuenta. Verifica el correo y la configuración administrativa de Supabase.");
  }
  try {
    return await applyProfile(context, { id: data.user.id, nombres: input.nombres, apellidos: input.apellidos, rol: input.rol, activo: input.activo, updatedAt: null });
  } catch {
    // Auth y PostgreSQL no comparten transacción. No borramos la cuenta ni
    // repetimos el alta: el trigger la deja inactiva hasta completar el perfil.
    throw new PartialUserCreationError("Se creó la cuenta, pero no se pudo confirmar su configuración. Revísala en Usuarios y completa sus datos desde Editar antes de reintentar el alta.");
  }
}
