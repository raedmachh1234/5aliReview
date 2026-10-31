"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/lib/types";
import { parseSettingsForm } from "@/lib/validation";
import { requireAdmin } from "@/server/auth/session";
import { getStore } from "@/server/store";

export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseSettingsForm(formData);
  if (!parsed.ok) return { status: "error", message: "Please fix the highlighted fields.", fieldErrors: parsed.fieldErrors };
  try {
    await getStore().saveSettings(parsed.data);
  } catch (err) {
    console.error("save_settings_failed", err);
    return { status: "error", message: "Couldn’t save the settings. Please try again." };
  }
  revalidatePath("/", "layout");
  return { status: "success", message: "Settings saved." };
}
