import type { QuoteBlock as QuoteBlockT } from "@/types/blocks";

interface Props {
  payload: QuoteBlockT;
}

export function QuoteBlock({ payload }: Props) {
  return (
    <blockquote>
      <p>{payload.text}</p>
      {payload.cite ? (
        <cite className="text-caption-xs not-italic text-content-tertiary">— {payload.cite}</cite>
      ) : null}
    </blockquote>
  );
}
