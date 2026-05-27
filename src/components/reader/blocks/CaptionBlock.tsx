import type { CaptionBlock as CaptionBlockT } from "@/types/blocks";

interface Props {
  payload: CaptionBlockT;
}

/**
 * Stand-alone captions (often emitted right after a figure/table for items
 * that the importer couldn't bind into a single `figure`). Renders as small
 * italic text so it visually attaches to the previous block.
 */
export function CaptionBlock({ payload }: Props) {
  return (
    <p className="-mt-2 text-caption-xs italic text-content-tertiary">
      {payload.text}
    </p>
  );
}
