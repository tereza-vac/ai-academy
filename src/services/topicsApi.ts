import { supabase } from "@/integrations/supabase/client";
import { isMock } from "@/lib/dataMode";
import { mockTopics, mockTracks } from "@/lib/mockData";
import type { Topic, Track } from "@/types/domain";

interface TopicRow {
  id: string;
  track_id: string | null;
  slug: string;
  title: string;
  summary: string | null;
  body_md: string | null;
  difficulty: Topic["difficulty"];
  estimated_minutes: number;
  prerequisites: string[];
  tags: string[];
  position: number;
}

interface TrackRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  color: string | null;
  position: number;
}

function mapTopic(row: TopicRow): Topic {
  return {
    id: row.id,
    trackId: row.track_id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    bodyMd: row.body_md,
    difficulty: row.difficulty,
    estimatedMinutes: row.estimated_minutes,
    prerequisites: row.prerequisites ?? [],
    tags: row.tags ?? [],
    position: row.position,
  };
}

function mapTrack(row: TrackRow): Track {
  return {
    id: row.id, slug: row.slug, title: row.title,
    description: row.description, color: row.color, position: row.position,
  };
}

export async function listTracks(): Promise<Track[]> {
  if (isMock) return [...mockTracks].sort((a, b) => a.position - b.position);

  const { data, error } = await supabase
    .from("tracks")
    .select("id,slug,title,description,color,position")
    .order("position");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTrack);
}

export async function listTopics(): Promise<Topic[]> {
  if (isMock) return [...mockTopics].sort((a, b) => a.position - b.position);

  const { data, error } = await supabase
    .from("topics")
    .select(
      "id,track_id,slug,title,summary,body_md,difficulty,estimated_minutes,prerequisites,tags,position",
    )
    .eq("is_published", true)
    .order("position");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTopic);
}

export async function getTopicBySlug(slug: string): Promise<Topic | null> {
  if (isMock) return mockTopics.find((t) => t.slug === slug) ?? null;

  const { data, error } = await supabase
    .from("topics")
    .select(
      "id,track_id,slug,title,summary,body_md,difficulty,estimated_minutes,prerequisites,tags,position",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapTopic(data) : null;
}
