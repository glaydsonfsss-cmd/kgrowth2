// app/_lib/cloudKV.ts
import { supabaseBrowser } from "./supabaseClient";

const TABLE = "kgrowth_kv";

export async function getUserId(): Promise<string | null> {
  const supabase = supabaseBrowser();
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

export async function loadCloudKV<T>(
  key: string
): Promise<{ value: T; updatedAtMs: number } | null> {
  const supabase = supabaseBrowser();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id ?? null;
  if (!userId) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select("value, updated_at")
    .eq("user_id", userId)
    .eq("key", key)
    .maybeSingle();

  if (error) {
    console.warn("[cloudKV] load error:", error.message);
    return null;
  }
  if (!data) return null;

  const updatedAtMs = data.updated_at ? new Date(data.updated_at).getTime() : 0;
  return { value: data.value as T, updatedAtMs };
}

export function saveCloudKV(key: string, value: unknown) {
  (async () => {
    const supabase = supabaseBrowser();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id ?? null;
    if (!userId) return;

    const { error } = await supabase
      .from(TABLE)
      .upsert(
        { user_id: userId, key, value, updated_at: new Date().toISOString() },
        { onConflict: "user_id,key" }
      );

    if (error) console.warn("[cloudKV] save error:", error.message);
  })();
}
