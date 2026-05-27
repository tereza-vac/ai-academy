import { useMemo } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useI18nContext } from "@/i18n/i18n-react";
import { ResourceActions } from "@/components/reader/ResourceActions";
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
  const { LL } = useI18nContext();
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
      <div className="space-y-3">
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

        <h3 className="text-body-lg font-semibold leading-snug tracking-tight text-content-primary">
          {resource.title}
        </h3>

        {resource.summary ? (
          <p className="line-clamp-3 text-body-md text-content-secondary">{resource.summary}</p>
        ) : null}

        {resource.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {resource.tags.slice(0, 5).map((tag) => (
              <Badge key={tag} variant="outline">
                #{tag}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="pt-1">
          <ResourceActions
            originalUrl={resource.url}
            resourceId={resource.id}
            availability={resource.availability}
            saveSlot={
              onToggleSave ? (
                <Button
                  variant={isSaved ? "secondary" : "ghost"}
                  size="sm"
                  onClick={onToggleSave}
                  aria-label={isSaved ? LL.radar.unsaveAction() : LL.radar.saveAction()}
                >
                  {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  {isSaved ? LL.radar.unsaveAction() : LL.radar.saveAction()}
                </Button>
              ) : undefined
            }
          />
        </div>
      </div>
    </Card>
  );
}
