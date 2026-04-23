import { supabase } from "@/app/lib/supabase";
import type { Snapshot, SnapshotInput } from "@/app/types/snapshot";

const TABLE = "snapshots";
const FRIENDLY_ERROR =
  "저장소랑 연결이 잠깐 끊어졌어요. 다시 시도해주세요 🦦";

export async function saveSnapshot(input: SnapshotInput): Promise<Snapshot> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error("[saveSnapshot]", error);
    throw new Error(FRIENDLY_ERROR);
  }
  return data as Snapshot;
}

export async function getSnapshots(limit = 20): Promise<Snapshot[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getSnapshots]", error);
    throw new Error(FRIENDLY_ERROR);
  }
  return (data ?? []) as Snapshot[];
}
