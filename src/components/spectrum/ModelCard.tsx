import { Link } from "react-router-dom";
import { ArrowUpRight, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LlmLicenseType, LlmModel } from "@/types/domain";
import type { TranslationFunctions } from "@/i18n/i18n-types";

const licenseVariant: Record<LlmLicenseType, "default" | "success" | "premium" | "warning"> = {
  commercial: "premium",
  open_source: "success",
  research: "default",
  unknown: "warning",
};

interface ModelCardProps {
  model: LlmModel;
  LL: TranslationFunctions;
  className?: string;
}

export function ModelCard({ model, LL, className }: ModelCardProps) {
  const licenseLabel = licenseLabelFor(model.licenseType, LL);

  return (
    <Link to={`/spectrum/${model.slug}`} className={cn("group block h-full", className)}>
      <Card
        variant="soft"
        className="flex h-full flex-col gap-3 p-4 transition-colors hover:border-border-strong hover:bg-surface-raised"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="text-caption-xs font-medium uppercase tracking-wide text-content-tertiary">
              {model.provider}
            </p>
            <h3 className="text-body-md font-semibold text-content-primary group-hover:text-brand">
              {model.name}
            </h3>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-content-tertiary opacity-0 transition-opacity group-hover:opacity-100" />
        </div>

        {model.summary ? (
          <p className="line-clamp-2 text-body-sm text-content-secondary">{model.summary}</p>
        ) : null}

        <div className="mt-auto flex flex-wrap gap-1.5">
          <Badge variant={licenseVariant[model.licenseType]}>{licenseLabel}</Badge>
          {model.modalities.length > 1 || (model.modalities[0] && model.modalities[0] !== "text") ? (
            <Badge variant="default">
              <Layers className="mr-1 h-3 w-3" />
              {model.modalities.join(" · ")}
            </Badge>
          ) : null}
          {model.isNiche ? (
            <Badge variant="warning">{LL.spectrum.nicheBadge()}</Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-caption-xs text-content-tertiary">
          {model.contextWindow ? (
            <span>{LL.spectrum.contextLabel({ tokens: model.contextWindow })}</span>
          ) : null}
          {model.parameterCount ? (
            <span>{model.parameterCount}</span>
          ) : null}
          {model.pricingHint ? <span>{model.pricingHint}</span> : null}
        </div>
      </Card>
    </Link>
  );
}

function licenseLabelFor(
  type: LlmLicenseType,
  LL: TranslationFunctions,
): string {
  switch (type) {
    case "commercial": return LL.spectrum.licenseCommercial();
    case "open_source": return LL.spectrum.licenseOpenSource();
    case "research": return LL.spectrum.licenseResearch();
    default: return LL.spectrum.licenseUnknown();
  }
}
