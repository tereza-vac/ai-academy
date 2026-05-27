import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ImageBlock as ImageBlockT } from "@/types/blocks";

interface Props {
  payload: ImageBlockT;
}

/**
 * Lazy-loaded image with caption fallback. Failed loads collapse to a
 * caption-only figure so a broken hot-link doesn't blow out the layout.
 */
export function ImageBlock({ payload }: Props) {
  const [failed, setFailed] = useState(false);
  const caption = payload.caption ?? payload.alt ?? null;

  return (
    <figure>
      {!failed ? (
        <img
          src={payload.src}
          alt={payload.alt ?? ""}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={cn(
            "mx-auto h-auto max-h-[600px] w-full rounded-lg bg-surface-soft object-contain",
          )}
        />
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-border-subtle bg-surface-soft p-8 text-caption-xs text-content-tertiary">
          (image unavailable)
        </div>
      )}
      {caption ? (
        <figcaption className="text-caption-xs italic text-content-tertiary">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
