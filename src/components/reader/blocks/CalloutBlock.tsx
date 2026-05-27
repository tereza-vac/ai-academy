import { AlertCircle, Info, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalloutBlock as CalloutBlockT } from "@/types/blocks";

interface Props {
  payload: CalloutBlockT;
}

const toneStyles: Record<CalloutBlockT["tone"], string> = {
  info: "border-info/30 bg-info/5 text-info",
  warn: "border-warning/30 bg-warning/5 text-warning",
  note: "border-border-subtle bg-surface-soft text-content-secondary",
};

const toneIcons: Record<CalloutBlockT["tone"], typeof Info> = {
  info: Info,
  warn: AlertCircle,
  note: StickyNote,
};

export function CalloutBlock({ payload }: Props) {
  const Icon = toneIcons[payload.tone];
  return (
    <aside
      className={cn(
        "my-4 flex items-start gap-3 rounded-lg border p-3 text-body-sm",
        toneStyles[payload.tone],
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="text-content-primary">{payload.text}</div>
    </aside>
  );
}
