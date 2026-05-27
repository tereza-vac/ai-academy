import type { HeadingBlock as HeadingBlockT } from "@/types/blocks";

interface Props {
  payload: HeadingBlockT;
}

/**
 * Renders one heading. `prose-academy` (from the page-level wrapper) already
 * gives us spacing + weight — we only pick the right semantic level.
 *
 * H1 is reserved for the article title rendered by `ReaderPage`'s
 * `<PageHeader>`, so importer-emitted H1 blocks render as H2 to avoid
 * doubling up on the title.
 */
export function HeadingBlock({ payload }: Props) {
  const { level, text } = payload;
  if (level === 1) return <h2 id={slugify(text)}>{text}</h2>;
  if (level === 2) return <h2 id={slugify(text)}>{text}</h2>;
  if (level === 3) return <h3 id={slugify(text)}>{text}</h3>;
  return <h4 id={slugify(text)}>{text}</h4>;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}
