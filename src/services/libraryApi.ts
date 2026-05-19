import { supabase } from "@/integrations/supabase/client";
import { isMock } from "@/lib/dataMode";
import { mockSavedItems } from "@/lib/mockData";
import type { SavedItem } from "@/types/domain";

interface SavedRow {
  id: string;
  user_id: string;
  resource_id: string;
  note: string | null;
  tags: string[];
  created_at: string;
}

function mapSaved(row: SavedRow): SavedItem {
  return {
    id: row.id, userId: row.user_id, resourceId: row.resource_id,
    note: row.note, tags: row.tags ?? [], createdAt: row.created_at,
  };
}

const MOCK_USER = "mock-user";

export async function listSavedItems(): Promise<SavedItem[]> {
  if (isMock) return [...mockSavedItems].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const { data, error } = await supabase
    .from("saved_items")
    .select("id,user_id,resource_id,note,tags,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapSaved);
}

export async function saveResource(input: {
  resourceId: string;
  note?: string;
  tags?: string[];
}): Promise<SavedItem> {
  if (isMock) {
    const existing = mockSavedItems.find((s) => s.resourceId === input.resourceId);
    if (existing) {
      existing.note = input.note ?? existing.note;
      existing.tags = input.tags ?? existing.tags;
      return existing;
    }
    const item: SavedItem = {
      id: `saved-${input.resourceId}-${Date.now()}`,
      userId: MOCK_USER,
      resourceId: input.resourceId,
      note: input.note ?? null,
      tags: input.tags ?? [],
      createdAt: new Date().toISOString(),
    };
    mockSavedItems.push(item);
    return item;
  }

  const { data, error } = await supabase
    .from("saved_items")
    .upsert(
      {
        resource_id: input.resourceId,
        note: input.note ?? null,
        tags: input.tags ?? [],
      },
      { onConflict: "user_id,resource_id" },
    )
    .select("id,user_id,resource_id,note,tags,created_at")
    .single();
  if (error) throw new Error(error.message);
  return mapSaved(data as SavedRow);
}

export async function unsaveResource(resourceId: string): Promise<void> {
  if (isMock) {
    const idx = mockSavedItems.findIndex((s) => s.resourceId === resourceId);
    if (idx !== -1) mockSavedItems.splice(idx, 1);
    return;
  }

  const { error } = await supabase.from("saved_items").delete().eq("resource_id", resourceId);
  if (error) throw new Error(error.message);
}
