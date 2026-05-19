import { useMemo } from "react";
import { ExternalLink, Bookmark, BookmarkCheck } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Resource } from "@/types/domain";

interface ResourceCardProps {
  resource: Resource;
  isSaved?: boolean;
  onToggleSave?: () => void;
  className?: string;
}

const kindLabel: Record<Resource["kind"], string> = {
  article: "Article",
  paper: "Paper",
  video: "Video",
  podcast: "Podcast",
  tool: "Tool",
  release: "Release",
  tweet: "Post",
  other: "Other",
};

const kindVariant: Record<Resource["kind"], "default" | "muted" | "success" | "premium" | "warning"> = {
  article: "muted",
  paper: "premium",
  video: "default",
  podcast: "default",
  tool: "success",
  release: "default",
  tweet: "muted",
  other: "muted",
};

export function ResourceCard({ resource, isSaved, onToggleSave, className }: ResourceCardProps) {
  const published = useMemo(() => {
    if (!resource.publishedAt) return null;
    try {
      return formatDistanceToNow(parseISO(resource.publishedAt), { addSuffix: true });
    } catch {
      return null;
    }
  }, [resource.publishedAt]);

  return (
    <Card variant="elevated" interactive className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-caption-xs text-content-tertiary">
            <Badge variant={kindVariant[resource.kind]}>{kindLabel[resource.kind]}</Badge>
            {resource.sourceName ? (
              <span className="font-medium text-content-secondary">{resource.sourceName}</span>
            ) : null}
            {published ? (
              <>
                <span>·</span>
                <span>{published}</span>
              </>
            ) : null}
          </div>
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-start gap-1.5 text-body-lg font-semibold tracking-tight text-content-primary hover:text-primary"
          >
            <span className="leading-snug">{resource.title}</span>
            <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-content-tertiary" />
          </a>
          {resource.summary ? (
            <p className="line-clamp-3 text-body-md text-content-secondary">
              {resource.summary}
            </p>
          ) : null}
          {resource.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {resource.tags.slice(0, 5).map((tag) => (
                <Badge key={tag} variant="outline">
                  #{tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        {onToggleSave ? (
          <Button
            variant={isSaved ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={onToggleSave}
            aria-label={isSaved ? "Remove from library" : "Save to library"}
          >
            {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
