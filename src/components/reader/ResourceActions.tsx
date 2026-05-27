/**
 * Shared action row for Radar / Library / Scholar cards.
 *
 * Three buttons, in this fixed order:
 *   1. "Read in AI Academy"  — only when `availability` is full_text_*
 *   2. "Original source ↗"    — always rendered
 *   3. <slot for Save button> — caller supplies it (different per surface)
 *
 * Keeping the layout in one place so the three card types stay visually in
 * sync. The Save button is a slot because each surface has slightly
 * different save semantics (resourceId vs PaperHit.externalId vs already-
 * saved row id).
 */
import { Link } from "react-router-dom";
import { BookOpen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18nContext } from "@/i18n/i18n-react";
import { isReaderAvailable } from "@/types/blocks";
import type { ReactNode } from "react";

export interface ResourceActionsProps {
  /** Original (upstream) URL. Always rendered as the "Original source" link. */
  originalUrl: string;
  /**
   * Resource id (UUID). When present together with `readerAvailable`, the
   * "Read in AI Academy" button is shown and links to `/reader/:id`.
   */
  resourceId?: string | null;
  /** Pass the resource's `availability` straight from the row. */
  availability?: string | null;
  /** Optional save action — rendered after the two link buttons. */
  saveSlot?: ReactNode;
  /** Visual density. Cards default to "sm". */
  size?: "sm" | "md";
}

export function ResourceActions({
  originalUrl,
  resourceId,
  availability,
  saveSlot,
  size = "sm",
}: ResourceActionsProps) {
  const { LL } = useI18nContext();
  const readerOK = isReaderAvailable(availability) && Boolean(resourceId);
  const btnSize = size === "sm" ? "sm" : "default";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {readerOK ? (
        <Button asChild size={btnSize} variant="default">
          <Link to={`/reader/${resourceId}`}>
            <BookOpen className="h-4 w-4" />
            {LL.reader.openInternal()}
          </Link>
        </Button>
      ) : null}
      <Button asChild size={btnSize} variant="outline">
        <a
          href={originalUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={LL.reader.openOriginalAria()}
        >
          {LL.reader.openOriginal()}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </Button>
      {saveSlot}
    </div>
  );
}
