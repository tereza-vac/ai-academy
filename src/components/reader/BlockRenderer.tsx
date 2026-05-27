/**
 * BlockRenderer — dispatches each `ContentBlock` to the right per-type
 * component. Adding a new block type is a two-step change: extend the
 * discriminated union in `src/types/blocks.ts` (and `_shared/blockSchema.ts`)
 * plus add a new branch + component file here.
 */
import type { ContentBlock } from "@/types/blocks";
import { HeadingBlock } from "./blocks/HeadingBlock";
import { ParagraphBlock } from "./blocks/ParagraphBlock";
import { ImageBlock } from "./blocks/ImageBlock";
import { CaptionBlock } from "./blocks/CaptionBlock";
import { TableBlock } from "./blocks/TableBlock";
import { ListBlock } from "./blocks/ListBlock";
import { EquationBlock } from "./blocks/EquationBlock";
import { CodeBlock } from "./blocks/CodeBlock";
import { CalloutBlock } from "./blocks/CalloutBlock";
import { QuoteBlock } from "./blocks/QuoteBlock";

interface Props {
  blocks: ContentBlock[];
}

export function BlockRenderer({ blocks }: Props) {
  return (
    <>
      {blocks.map((b) => (
        <RenderOne key={b.id} block={b} />
      ))}
    </>
  );
}

function RenderOne({ block }: { block: ContentBlock }) {
  const p = block.payload;
  switch (p.type) {
    case "heading":   return <HeadingBlock payload={p} />;
    case "paragraph": return <ParagraphBlock payload={p} />;
    case "image":     return <ImageBlock payload={p} />;
    case "caption":   return <CaptionBlock payload={p} />;
    case "table":     return <TableBlock payload={p} />;
    case "list":      return <ListBlock payload={p} />;
    case "equation":  return <EquationBlock payload={p} />;
    case "code":      return <CodeBlock payload={p} />;
    case "callout":   return <CalloutBlock payload={p} />;
    case "quote":     return <QuoteBlock payload={p} />;
  }
}
