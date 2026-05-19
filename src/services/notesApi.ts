import { supabase } from "@/integrations/supabase/client";
import { isMock } from "@/lib/dataMode";
import { mockNotes } from "@/lib/mockData";
import type { Note } from "@/types/domain";

interface NoteRow {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  topic_id: string | null;
  resource_id: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

function mapNote(row: NoteRow): Note {
  return {
    id: row.id, userId: row.user_id, title: row.title, body: row.body,
    topicId: row.topic_id, resourceId: row.resource_id,
    tags: row.tags ?? [], createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

const SELECT = "id,user_id,title,body,topic_id,resource_id,tags,created_at,updated_at";
const MOCK_USER = "mock-user";

export async function listNotes(): Promise<Note[]> {
  if (isMock) return [...mockNotes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const { data, error } = await supabase
    .from("notes")
    .select(SELECT)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapNote);
}

export async function createNote(input: {
  title: string;
  body?: string | null;
  topicId?: string | null;
  resourceId?: string | null;
  tags?: string[];
}): Promise<Note> {
  if (isMock) {
    const now = new Date().toISOString();
    const note: Note = {
      id: `note-${Date.now()}`,
      userId: MOCK_USER,
      title: input.title,
      body: input.body ?? null,
      topicId: input.topicId ?? null,
      resourceId: input.resourceId ?? null,
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    mockNotes.unshift(note);
    return note;
  }

  const { data, error } = await supabase
    .from("notes")
    .insert({
      title: input.title,
      body: input.body ?? null,
      topic_id: input.topicId ?? null,
      resource_id: input.resourceId ?? null,
      tags: input.tags ?? [],
    })
    .select(SELECT)
    .single();
  if (error) throw new Error(error.message);
  return mapNote(data as NoteRow);
}

export async function updateNote(input: {
  id: string;
  title?: string;
  body?: string | null;
  tags?: string[];
}): Promise<Note> {
  if (isMock) {
    const note = mockNotes.find((n) => n.id === input.id);
    if (!note) throw new Error("note not found");
    if (input.title !== undefined) note.title = input.title;
    if (input.body !== undefined) note.body = input.body;
    if (input.tags !== undefined) note.tags = input.tags;
    note.updatedAt = new Date().toISOString();
    return note;
  }

  const update: Record<string, unknown> = {};
  if (input.title !== undefined) update.title = input.title;
  if (input.body !== undefined) update.body = input.body;
  if (input.tags !== undefined) update.tags = input.tags;

  const { data, error } = await supabase
    .from("notes")
    .update(update)
    .eq("id", input.id)
    .select(SELECT)
    .single();
  if (error) throw new Error(error.message);
  return mapNote(data as NoteRow);
}

export async function deleteNote(id: string): Promise<void> {
  if (isMock) {
    const idx = mockNotes.findIndex((n) => n.id === id);
    if (idx !== -1) mockNotes.splice(idx, 1);
    return;
  }

  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
