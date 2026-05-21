import { supabase } from "@/integrations/supabase/client";
import { isMock } from "@/lib/dataMode";
import { localizeTopic, localizeTrack } from "@/lib/contentLocalization";
import { mockTopics, mockTracks } from "@/lib/mockData";
import type { Topic, Track } from "@/types/domain";

interface TopicRow {
  id: string;
  track_id: string | null;
  slug: string;
  title: string;
  title_key: string | null;
  summary: string | null;
  summary_key: string | null;
  body_md: string | null;
  body_key: string | null;
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
  title_key: string | null;
  description: string | null;
  description_key: string | null;
  color: string | null;
  position: number;
}

function mapTopic(row: TopicRow): Topic {
  return {
    id: row.id,
    trackId: row.track_id,
    slug: row.slug,
    title: row.title,
    titleKey: row.title_key,
    summary: row.summary,
    summaryKey: row.summary_key,
    bodyMd: row.body_md,
    bodyKey: row.body_key,
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
    titleKey: row.title_key,
    description: row.description,
    descriptionKey: row.description_key,
    color: row.color, position: row.position,
  };
}

export async function listTracks(): Promise<Track[]> {
  if (isMock) return [...mockTracks].map(localizeTrack).sort((a, b) => a.position - b.position);

  const { data, error } = await supabase
    .from("tracks")
    .select("id,slug,title,title_key,description,description_key,color,position")
    .order("position");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTrack).map(localizeTrack);
}

export async function listTopics(): Promise<Topic[]> {
  if (isMock) return [...mockTopics].map(localizeTopic).sort((a, b) => a.position - b.position);

  const { data, error } = await supabase
    .from("topics")
    .select(
      "id,track_id,slug,title,title_key,summary,summary_key,body_md,body_key,difficulty,estimated_minutes,prerequisites,tags,position",
    )
    .eq("is_published", true)
    .order("position");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTopic).map(localizeTopic);
}

export async function getTopicBySlug(slug: string): Promise<Topic | null> {
  if (isMock) {
    const topic = mockTopics.find((t) => t.slug === slug);
    return topic ? localizeTopic(topic) : null;
  }

  const { data, error } = await supabase
    .from("topics")
    .select(
      "id,track_id,slug,title,title_key,summary,summary_key,body_md,body_key,difficulty,estimated_minutes,prerequisites,tags,position",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? localizeTopic(mapTopic(data)) : null;
}
