-- Seed: Build Lab — Cursor prompts, chatbot playbooks, templates and checklists.

insert into public.build_lab_items (slug, title, summary, kind, body_md, tags, position) values
  ('cursor-feature-spike',
   'Cursor — feature spike prompt',
   'A reusable prompt to scope and spike a new feature inside a repo.',
   'prompt',
   E'You are working in <repo>. I want to spike <feature>.\n\nDeliverables:\n1. A short proposed design (3-5 bullets).\n2. The minimal file changes needed for a working prototype.\n3. A checklist of follow-ups.\n\nConstraints: keep edits focused, avoid renaming files, add TODOs where you stub things.',
   '{"cursor","prompt","feature"}', 1),

  ('cursor-refactor-prompt',
   'Cursor — safe refactor prompt',
   'Refactor with guardrails: scope, test, and reversibility.',
   'prompt',
   E'Refactor <module> to <goal>.\n\nRules:\n- No behaviour changes.\n- Smallest possible diff.\n- Update or add tests for any non-trivial change.\n- Surface anything risky in a "Heads up" section at the end.',
   '{"cursor","prompt","refactor"}', 2),

  ('chatbot-launch-playbook',
   'Launching an internal chatbot — playbook',
   'A 10-step playbook from problem framing to v1 launch.',
   'playbook',
   E'## 1. Problem\nWhat user pain are we removing?\n\n## 2. Scope\nWhat is in / out?\n\n## 3. Data\nWhat is the corpus? Where does it live?\n\n## 4. Retrieval\nNaive RAG first. Measure.\n\n## 5. Prompt\nSystem prompt + tool defs.\n\n## 6. Evals\nGold set + rubric.\n\n## 7. UI\nLean, no bells.\n\n## 8. Guardrails\nPII, refusals, abuse.\n\n## 9. Telemetry\nLog inputs, outputs, scores.\n\n## 10. Launch\nCanary → broad rollout.',
   '{"chatbot","playbook","launch"}', 3),

  ('product-prd-template',
   'AI feature PRD template',
   'A small PRD tailored to AI features: jobs-to-be-done, success criteria, eval plan.',
   'template',
   E'# <Feature Name>\n\n## Problem\n## Users & jobs\n## Success criteria\n## Solution sketch\n## Risks\n## Eval plan\n## Open questions',
   '{"prd","template","product"}', 4),

  ('ship-checklist',
   'Ship-an-AI-feature checklist',
   'Checks before we let real users hit your new AI feature.',
   'checklist',
   E'- [ ] System prompt reviewed\n- [ ] Tool schemas validated\n- [ ] Prompt + retrieval evals exist\n- [ ] PII / abuse guardrails in place\n- [ ] Cost ceiling configured\n- [ ] Logging + tracing on\n- [ ] Rollout plan (canary → broad)\n- [ ] Rollback plan documented',
   '{"checklist","ship","quality"}', 5)
on conflict (slug) do update
  set title = excluded.title,
      summary = excluded.summary,
      kind = excluded.kind,
      body_md = excluded.body_md,
      tags = excluded.tags,
      position = excluded.position;
