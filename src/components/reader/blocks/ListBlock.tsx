import type { ListBlock as ListBlockT } from "@/types/blocks";

interface Props {
  payload: ListBlockT;
}

export function ListBlock({ payload }: Props) {
  const Tag = payload.ordered ? "ol" : "ul";
  return (
    <Tag>
      {payload.items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </Tag>
  );
}
