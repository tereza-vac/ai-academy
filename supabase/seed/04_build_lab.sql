-- Seed: Build Lab — Cursor prompts, chatbot playbooks, templates and checklists.
-- Base columns keep Czech fallback text. *_key columns resolve localized text
-- through src/i18n/*/content.

insert into public.build_lab_items (
  slug, title, title_key, summary, summary_key, kind, body_md, body_key, tags, position
) values
  ('cursor-feature-spike',
   'Cursor - prompt pro rychlý spike funkce',
   'content.buildLabItems.cursorFeatureSpike.title',
   'Znovupoužitelný prompt pro vymezení a otestování nové funkce v repozitáři.',
   'content.buildLabItems.cursorFeatureSpike.summary',
   'prompt',
   E'Pracuješ v <repo>. Chci udělat spike pro <feature>.\n\nVýstupy:\n1. Krátký návrh řešení (3-5 bodů).\n2. Minimální změny souborů potřebné pro funkční prototyp.\n3. Checklist navazujících kroků.\n\nOmezení: drž změny úzké, nepřejmenovávej soubory, přidej TODO tam, kde něco stubuješ.',
   'content.buildLabItems.cursorFeatureSpike.body',
   '{"cursor","prompt","feature"}', 1),

  ('cursor-refactor-prompt',
   'Cursor - prompt pro bezpečný refaktor',
   'content.buildLabItems.cursorRefactorPrompt.title',
   'Refaktor s mantinely: rozsah, testy a možnost návratu.',
   'content.buildLabItems.cursorRefactorPrompt.summary',
   'prompt',
   E'Refaktoruj <module> směrem k <goal>.\n\nPravidla:\n- Žádné změny chování.\n- Co nejmenší diff.\n- Aktualizuj nebo přidej testy pro každou netriviální změnu.\n- Všechna rizika uveď na konci v sekci "Pozor".',
   'content.buildLabItems.cursorRefactorPrompt.body',
   '{"cursor","prompt","refactor"}', 2),

  ('chatbot-launch-playbook',
   'Spuštění interního chatbota - playbook',
   'content.buildLabItems.chatbotLaunchPlaybook.title',
   'Desetikrokový playbook od vymezení problému po spuštění v1.',
   'content.buildLabItems.chatbotLaunchPlaybook.summary',
   'playbook',
   E'## 1. Problém\nJakou bolest uživatelů odstraňujeme?\n\n## 2. Rozsah\nCo je uvnitř a co mimo?\n\n## 3. Data\nJaký je korpus? Kde žije?\n\n## 4. Retrieval\nNejdřív naivní RAG. Měřte.\n\n## 5. Prompt\nSystémový prompt + definice nástrojů.\n\n## 6. Evaluace\nZlatá sada + rubrika.\n\n## 7. UI\nŠtíhlé, bez ozdob.\n\n## 8. Guardraily\nPII, odmítnutí, zneužití.\n\n## 9. Telemetrie\nLogujte vstupy, výstupy a skóre.\n\n## 10. Spuštění\nCanary -> široké nasazení.',
   'content.buildLabItems.chatbotLaunchPlaybook.body',
   '{"chatbot","playbook","launch"}', 3),

  ('product-prd-template',
   'Šablona PRD pro AI funkci',
   'content.buildLabItems.productPrdTemplate.title',
   'Malé PRD přizpůsobené AI funkcím: úkoly uživatelů, kritéria úspěchu, plán evaluací.',
   'content.buildLabItems.productPrdTemplate.summary',
   'template',
   E'# <Název funkce>\n\n## Problém\n## Uživatelé a úkoly\n## Kritéria úspěchu\n## Náčrt řešení\n## Rizika\n## Plán evaluací\n## Otevřené otázky',
   'content.buildLabItems.productPrdTemplate.body',
   '{"prd","template","product"}', 4),

  ('ship-checklist',
   'Checklist pro nasazení AI funkce',
   'content.buildLabItems.shipChecklist.title',
   'Kontroly před tím, než novou AI funkci pustíme reálným uživatelům.',
   'content.buildLabItems.shipChecklist.summary',
   'checklist',
   E'- [ ] Systémový prompt zkontrolován\n- [ ] Schémata nástrojů validována\n- [ ] Existují evaluace promptů a retrievalu\n- [ ] Guardraily pro PII / zneužití jsou na místě\n- [ ] Nastaven cenový strop\n- [ ] Zapnuté logování a tracing\n- [ ] Plán rollout (canary -> široce)\n- [ ] Zdokumentovaný rollback plán',
   'content.buildLabItems.shipChecklist.body',
   '{"checklist","ship","quality"}', 5)
on conflict (slug) do update
  set title = excluded.title,
      title_key = excluded.title_key,
      summary = excluded.summary,
      summary_key = excluded.summary_key,
      kind = excluded.kind,
      body_md = excluded.body_md,
      body_key = excluded.body_key,
      tags = excluded.tags,
      position = excluded.position;
