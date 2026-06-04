/**
 * SettingsPage — user preferences for the AI Academy.
 *
 * Covers AI model, language, response style, code theme, and UI toggles.
 * All settings persisted in localStorage via userSettings service.
 */
import { useState } from "react";
import {
  Bot,
  Check,
  Code2,
  Keyboard,
  Languages,
  Palette,
  RotateCcw,
  Settings2,
  Sliders,
  Target,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getSettings,
  saveSettings,
  resetSettings,
  type UserSettings,
  type AIModel,
  type ResponseStyle,
  type AppLocale,
  type CodeTheme,
} from "@/services/userSettings";
import { getGoalConfig, saveGoalConfig } from "@/services/dailyGoals";

/* ─── UI primitives ──────────────────────────────────────────────────────── */

function SectionHeader({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3 pb-4 border-b border-border-subtle">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="text-body-md font-semibold text-content-primary">{title}</h2>
        {description && <p className="text-body-sm text-content-tertiary">{description}</p>}
      </div>
    </div>
  );
}

function Toggle({
  checked, onChange, label, description,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="space-y-0.5 min-w-0">
        <p className="text-body-sm font-medium text-content-primary">{label}</p>
        {description && <p className="text-caption-xs text-content-tertiary">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative shrink-0 h-5.5 w-10 rounded-full border-2 transition-all duration-200 outline-none",
          "focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.3)]",
          checked ? "border-primary bg-primary" : "border-border-strong bg-surface-base",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
            checked ? "translate-x-4" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}

function SegmentedControl<T extends string>({
  value, options, onChange,
}: { value: T; options: { id: T; label: string; description?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            "flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-all",
            value === opt.id
              ? "border-primary/60 bg-primary/8 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]"
              : "border-border-subtle bg-surface-base text-content-secondary hover:border-border-strong hover:text-content-primary",
          )}
        >
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-body-sm font-semibold">{opt.label}</span>
            {value === opt.id && <Check className="h-3.5 w-3.5 shrink-0" />}
          </div>
          {opt.description && (
            <span className="text-caption-xs opacity-70 leading-tight">{opt.description}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

function NumberStepper({
  label, description, value, min, max, step = 1, onChange,
}: { label: string; description?: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="space-y-0.5 min-w-0">
        <p className="text-body-sm font-medium text-content-primary">{label}</p>
        {description && <p className="text-caption-xs text-content-tertiary">{description}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - step))}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-subtle text-content-secondary hover:bg-surface-hover hover:text-content-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          −
        </button>
        <span className="w-8 text-center text-body-sm font-semibold text-content-primary tabular-nums">
          {value}
        </span>
        <button
          type="button"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + step))}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-subtle text-content-secondary hover:bg-surface-hover hover:text-content-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function Component() {
  const [settings, setSettings] = useState<UserSettings>(() => getSettings());
  const [goalConfig, setGoalConfig] = useState(() => getGoalConfig());
  const [saved, setSaved] = useState(false);

  function update<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSettings(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function updateGoal<K extends keyof ReturnType<typeof getGoalConfig>>(key: K, value: ReturnType<typeof getGoalConfig>[K]) {
    const next = saveGoalConfig({ [key]: value });
    setGoalConfig(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function handleReset() {
    const defaults = resetSettings();
    setSettings(defaults);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Customize how the AI Academy works for you."
        actions={
          <div className="flex items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1.5 text-caption-xs text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                Saved
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to defaults
            </Button>
          </div>
        }
      />

      {/* AI Model */}
      <div className="rounded-2xl border border-border-subtle bg-surface-elevated p-6 space-y-5">
        <SectionHeader icon={Bot} title="AI Model" description="Choose the model used by the AI Tutor." />
        <SegmentedControl<AIModel>
          value={settings.model}
          onChange={(v) => update("model", v)}
          options={[
            {
              id: "gpt-4o-mini",
              label: "GPT-4o mini",
              description: "Faster, cheaper. Great for most questions.",
            },
            {
              id: "gpt-4o",
              label: "GPT-4o",
              description: "Most capable. Best for complex reasoning.",
            },
          ]}
        />
      </div>

      {/* Language */}
      <div className="rounded-2xl border border-border-subtle bg-surface-elevated p-6 space-y-5">
        <SectionHeader icon={Languages} title="Language" description="Interface and AI response language." />
        <SegmentedControl<AppLocale>
          value={settings.locale}
          onChange={(v) => update("locale", v)}
          options={[
            { id: "en", label: "English", description: "All responses in English" },
            { id: "cs", label: "Čeština", description: "Vše v češtině" },
          ]}
        />
      </div>

      {/* Response style */}
      <div className="rounded-2xl border border-border-subtle bg-surface-elevated p-6 space-y-5">
        <SectionHeader icon={Sliders} title="Default response style" description="How the AI formats its answers. Can be changed per session." />
        <SegmentedControl<ResponseStyle>
          value={settings.responseStyle}
          onChange={(v) => update("responseStyle", v)}
          options={[
            { id: "concise",  label: "Concise",  description: "Short, to the point" },
            { id: "detailed", label: "Detailed", description: "Full explanation with examples" },
            { id: "expert",   label: "Expert",   description: "Technical depth, dense" },
          ]}
        />
      </div>

      {/* Code theme */}
      <div className="rounded-2xl border border-border-subtle bg-surface-elevated p-6 space-y-5">
        <SectionHeader icon={Palette} title="Code highlight theme" description="Syntax highlighting style for code blocks." />
        <SegmentedControl<CodeTheme>
          value={settings.codeTheme}
          onChange={(v) => update("codeTheme", v)}
          options={[
            { id: "github-dark",   label: "GitHub Dark"  },
            { id: "github-light",  label: "GitHub Light" },
            { id: "dracula",       label: "Dracula"      },
            { id: "one-dark-pro",  label: "One Dark Pro" },
          ]}
        />
        {/* Preview */}
        <div className="rounded-xl border border-border-subtle bg-[#0d1117] overflow-hidden">
          <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
            <Code2 className="h-3.5 w-3.5 text-white/30" />
            <span className="text-caption-xs text-white/30">preview</span>
          </div>
          <pre className="px-4 py-3 text-caption-xs font-mono leading-relaxed overflow-x-auto">
            <span className="text-blue-400">def</span>
            <span className="text-white"> attention</span>
            <span className="text-white/60">(</span>
            <span className="text-orange-300">q</span>
            <span className="text-white/60">, </span>
            <span className="text-orange-300">k</span>
            <span className="text-white/60">, </span>
            <span className="text-orange-300">v</span>
            <span className="text-white/60">):{"\n"}  </span>
            <span className="text-blue-400">return</span>
            <span className="text-white"> softmax(q @ k.T / k.shape[</span>
            <span className="text-green-400">-1</span>
            <span className="text-white">]**</span>
            <span className="text-green-400">0.5</span>
            <span className="text-white">) @ v</span>
          </pre>
        </div>
      </div>

      {/* Tutor behaviour */}
      <div className="rounded-2xl border border-border-subtle bg-surface-elevated p-6 space-y-1">
        <SectionHeader icon={Settings2} title="AI Tutor behaviour" description="Control how the chat interface works." />
        <Toggle
          checked={settings.showContextPanelByDefault}
          onChange={(v) => update("showContextPanelByDefault", v)}
          label="Show context panel by default"
          description="Display the concept context sidebar when a concept is pre-loaded."
        />
        <Toggle
          checked={settings.autoScroll}
          onChange={(v) => update("autoScroll", v)}
          label="Auto-scroll while streaming"
          description="Automatically scroll to the latest message as the AI responds."
        />
        <Toggle
          checked={settings.showQuickReplies}
          onChange={(v) => update("showQuickReplies", v)}
          label="Show quick-reply chips"
          description="Display suggested prompt chips below the input area."
        />
        <Toggle
          checked={settings.showRelatedConcepts}
          onChange={(v) => update("showRelatedConcepts", v)}
          label="Show related concept chips on messages"
          description="Highlight AI Map concepts mentioned in responses."
        />
      </div>

      {/* Input behaviour */}
      <div className="rounded-2xl border border-border-subtle bg-surface-elevated p-6 space-y-1">
        <SectionHeader icon={Keyboard} title="Input behaviour" />
        <Toggle
          checked={settings.sendOnEnter}
          onChange={(v) => update("sendOnEnter", v)}
          label="Send on Enter"
          description="Press Enter to send. Use Shift+Enter for a new line. Disable for multiline-first mode."
        />
        <Toggle
          checked={settings.voiceInputEnabled}
          onChange={(v) => update("voiceInputEnabled", v)}
          label="Voice input button"
          description="Show the microphone button for speech-to-text."
        />
      </div>

      {/* Performance */}
      <div className="rounded-2xl border border-border-subtle bg-surface-elevated p-6 space-y-1">
        <SectionHeader icon={Zap} title="Data & Storage" description="Your data lives locally in this browser." />
        <div className="py-3 text-body-sm text-content-secondary space-y-2">
          <p>All conversations, flashcards, notes, and progress data are stored in your browser&apos;s localStorage. Nothing is sent to any server other than your messages to the AI.</p>
          <p className="text-caption-xs text-content-tertiary">
            Storage used: ~{(() => {
              try {
                let total = 0;
                for (const key of Object.keys(localStorage)) {
                  total += (localStorage.getItem(key) ?? "").length * 2;
                }
                return total > 1024 * 1024
                  ? `${(total / (1024 * 1024)).toFixed(1)} MB`
                  : `${(total / 1024).toFixed(0)} KB`;
              } catch { return "unknown"; }
            })()}
          </p>
        </div>
      </div>

      {/* Daily goals */}
      <div className="rounded-2xl border border-border-subtle bg-surface-elevated p-6 space-y-1">
        <SectionHeader icon={Target} title="Daily goals" description="Set daily targets shown on the homepage." />
        <Toggle
          checked={goalConfig.enabled}
          onChange={(v) => updateGoal("enabled", v)}
          label="Enable daily goals"
          description="Show a progress widget with daily targets on the homepage."
        />
        <NumberStepper
          label="Messages target"
          description="How many messages to send to the AI Tutor."
          value={goalConfig.messages}
          min={1}
          max={50}
          step={1}
          onChange={(v) => updateGoal("messages", v)}
        />
        <NumberStepper
          label="Concepts target"
          description="How many distinct concepts to study."
          value={goalConfig.concepts}
          min={1}
          max={20}
          step={1}
          onChange={(v) => updateGoal("concepts", v)}
        />
        <NumberStepper
          label="Flashcards to review"
          description="How many flashcards to review with spaced repetition."
          value={goalConfig.flashcardsReviewed}
          min={1}
          max={50}
          step={5}
          onChange={(v) => updateGoal("flashcardsReviewed", v)}
        />
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-destructive/20 bg-destructive/3 p-6 space-y-4">
        <h2 className="text-body-md font-semibold text-destructive/80">Danger zone</h2>
        <p className="text-body-sm text-content-tertiary">
          Reset all your preferences to the factory defaults. This does not delete your conversations, flashcards, or progress.
        </p>
        <Button variant="outline" size="sm" onClick={handleReset} className="border-destructive/30 text-destructive hover:bg-destructive/5">
          <RotateCcw className="h-3.5 w-3.5" />
          Reset all settings
        </Button>
      </div>
    </div>
  );
}

export default Component;
