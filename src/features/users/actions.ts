"use server";

import { revalidatePath } from "next/cache";
import type { Profile } from "@/features/auth/types";
import { adminContext, createUser, editUser, listUsers, setUserStatus, PartialUserCreationError } from "./service";
import { validateEditUser, validateNewUser, validateStatusChange } from "./validation";
import type { UserResult } from "./types";

function failure(error: unknown): UserResult<never> {
  return { ok: false, error: error instanceof Error ? error.message : "No se pudo completar la operación.", partial: error instanceof PartialUserCreationError };
}

export async function listUsersAction(): Promise<UserResult<Profile[]>> {
  try { return { ok: true, data: await listUsers(await adminContext()) }; }
  catch (error) { return failure(error); }
}

export async function createUserAction(input: unknown): Promise<UserResult<Profile>> {
  try {
    const context = await adminContext();
    const data = await createUser(context, validateNewUser(input));
    revalidatePath("/configuracion/usuarios");
    return { ok: true, data };
  } catch (error) { return failure(error); }
}

export async function editUserAction(input: unknown): Promise<UserResult<Profile>> {
  try {
    const context = await adminContext();
    const data = await editUser(context, validateEditUser(input));
    revalidatePath("/configuracion/usuarios");
    return { ok: true, data };
  } catch (error) { return failure(error); }
}

export async function setUserStatusAction(input: unknown): Promise<UserResult<Profile>> {
  try {
    const context = await adminContext();
    const data = await setUserStatus(context, validateStatusChange(input));
    revalidatePath("/configuracion/usuarios");
    return { ok: true, data };
  } catch (error) { return failure(error); }
}
