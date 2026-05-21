-- Seed: 4 tracks and ~10 topics for the MVP learning map.
-- Idempotent: re-running upserts by slug.
--
-- Content localization follows the Priprava/Reo translation-key model:
-- base columns keep Czech fallback text, *_key columns point to
-- src/i18n/*/content dictionaries.

insert into public.tracks (slug, title, title_key, description, description_key, color, position) values
  ('foundations', 'Základy', 'content.tracks.foundations.title',
   'Klíčové pojmy: tokeny, embeddingy, transformery a co LLM skutečně dělá.',
   'content.tracks.foundations.description', 'brand', 1),
  ('prompting', 'Promptování', 'content.tracks.prompting.title',
   'Praktické vzory promptů, systémové prompty a strukturovaný výstup.',
   'content.tracks.prompting.description', 'premium', 2),
  ('building', 'Tvorba s AI', 'content.tracks.building.title',
   'Cursor, RAG, evaluace a nasazování AI funkcí.',
   'content.tracks.building.description', 'success', 3),
  ('agents', 'Agenti a workflow', 'content.tracks.agents.title',
   'Nástroje, vícekrokové uvažování a orchestrační vzory.',
   'content.tracks.agents.description', 'coral', 4)
on conflict (slug) do update
  set title = excluded.title,
      title_key = excluded.title_key,
      description = excluded.description,
      description_key = excluded.description_key,
      color = excluded.color,
      position = excluded.position;

with t as (
  select id, slug from public.tracks
)
insert into public.topics (
  track_id, slug, title, title_key, summary, summary_key, body_md, body_key,
  difficulty, estimated_minutes, prerequisites, tags, position
) values
  ((select id from t where slug='foundations'), 'how-llms-work',
   'Jak LLM skutečně fungují', 'content.topics.howLlmsWork.title',
   'Krátká cesta od tokenů k predikci dalšího tokenu.', 'content.topics.howLlmsWork.summary',
   E'## Co je token?\n\nLLM nevidí text jako **tokeny**, ne jako znaky. Token má v angličtině zhruba 4 znaky; v jiných jazycích se délka liší.\n\n## Predikce dalšího tokenu\n\nModel dostane posloupnost tokenů a předpoví, jaký token bude nejpravděpodobnější další. Tenhle jednoduchý mechanismus - opakovaný pořád dokola - vytváří vše, co v chatu vidíte.\n\n## Proč na tom záleží\n\nKdyž tomu rozumíte, lépe chápete:\n\n- proč tokeny a tokenizace ovlivňují cenu i latenci,\n- proč mají prompty a kontextová okna limity,\n- proč teplota mění rozmanitost odpovědí.',
   'content.topics.howLlmsWork.body',
   'beginner', 12, '{}', '{"basics","tokens","llm"}', 1),

  ((select id from t where slug='foundations'), 'embeddings-101',
   'Embeddingy 101', 'content.topics.embeddings101.title',
   'Vektory, které zachycují význam. Základ vyhledávání a RAG.', 'content.topics.embeddings101.summary',
   E'Embedding převede text na vektor čísel. Podobný význam znamená blízkost ve vektorovém prostoru.\n\n## Kdy je použít\n\n- Sémantické vyhledávání\n- Shlukování\n- Doporučování\n- Retrieval-Augmented Generation (RAG)',
   'content.topics.embeddings101.body',
   'beginner', 10, '{"how-llms-work"}', '{"embeddings","rag","vectors"}', 2),

  ((select id from t where slug='prompting'), 'system-prompts',
   'Systémové prompty, které drží', 'content.topics.systemPrompts.title',
   'Struktura, role, omezení, příklady a odmítnutí.', 'content.topics.systemPrompts.summary',
   E'Systémový prompt nastavuje trvalé chování modelu. Berte ho jako produktový text: přesný, testovatelný a dost malý na to, abyste ho udrželi v hlavě.\n\n## Kostra\n\n```\nRole\nKontext\nÚkol\nOmezení\nFormát výstupu\n```',
   'content.topics.systemPrompts.body',
   'beginner', 15, '{}', '{"prompting","system-prompt"}', 1),

  ((select id from t where slug='prompting'), 'structured-output',
   'Strukturovaný výstup (JSON, nástroje, schémata)', 'content.topics.structuredOutput.title',
   'Když má výstup modelu číst další program.', 'content.topics.structuredOutput.summary',
   E'Když je konzumentem výstupu další program, preferujte strukturovaný výstup:\n\n- JSON režim\n- Volání nástrojů / funkcí\n- Přísná schémata (Zod, JSON Schema)',
   'content.topics.structuredOutput.body',
   'intermediate', 18, '{"system-prompts"}', '{"json","tools","schemas"}', 2),

  ((select id from t where slug='building'), 'cursor-day-one',
   'Cursor první den', 'content.topics.cursorDayOne.title',
   'Nastavení, .cursor/rules, modely a smyčka agenta.', 'content.topics.cursorDayOne.summary',
   E'## Instalace\n\nStáhněte Cursor a přihlaste se. Nastavte výchozí model.\n\n## Projektová pravidla\n\nVytvořte `.cursor/rules/your-rule.md`, aby měl agent pro tento repozitář trvalé pokyny.',
   'content.topics.cursorDayOne.body',
   'beginner', 12, '{}', '{"cursor","ide","setup"}', 1),

  ((select id from t where slug='building'), 'rag-in-an-hour',
   'RAG za hodinu', 'content.topics.ragInAnHour.title',
   'Chunking, embeddingy, podobnostní vyhledávání, re-ranking a promptování.', 'content.topics.ragInAnHour.summary',
   E'## Pipeline\n\n1. Rozdělit na chunky\n2. Vytvořit embeddingy\n3. Uložit\n4. Vyhledat\n5. (Přeřadit výsledky)\n6. Promptovat s kontextem',
   'content.topics.ragInAnHour.body',
   'intermediate', 35, '{"embeddings-101","system-prompts"}', '{"rag","pgvector","supabase"}', 2),

  ((select id from t where slug='building'), 'evals-that-matter',
   'Evaluace, které mají smysl', 'content.topics.evalsThatMatter.title',
   'Od tabulkově hodnocených promptů po automatické skórování.', 'content.topics.evalsThatMatter.summary',
   E'Tři typy evaluací, které opravdu potřebujete:\n\n- **Referenční** - porovnání se zlatou odpovědí.\n- **Rubrikové** - malý LLM hodnotitel s rubrikou.\n- **A/B v produkci** - měření chování uživatelů.',
   'content.topics.evalsThatMatter.body',
   'intermediate', 25, '{"system-prompts"}', '{"evals","quality"}', 3),

  ((select id from t where slug='agents'), 'tools-and-function-calling',
   'Nástroje a volání funkcí', 'content.topics.toolsAndFunctionCalling.title',
   'Dejte modelu slovesa. Pak omezte, co smí udělat.', 'content.topics.toolsAndFunctionCalling.summary',
   E'Nástroje mění LLM v něco, co umí jednat. Definujete JSON schéma, model ho vyplní a váš kód akci provede.',
   'content.topics.toolsAndFunctionCalling.body',
   'intermediate', 20, '{"structured-output"}', '{"agents","tools"}', 1),

  ((select id from t where slug='agents'), 'multi-step-agents',
   'Vícekrokoví agenti', 'content.topics.multiStepAgents.title',
   'Plánování, paměť, opakování a kdy to vzdát.', 'content.topics.multiStepAgents.summary',
   E'Krátký přehled:\n\n- ReAct\n- Plan-and-execute\n- Reflexe\n- Předávání úkolů',
   'content.topics.multiStepAgents.body',
   'advanced', 30, '{"tools-and-function-calling"}', '{"agents","planning"}', 2),

  ((select id from t where slug='agents'), 'agent-evals',
   'Vyhodnocování agentů', 'content.topics.agentEvals.title',
   'Trasujte, skórujte a zlepšujte vícekrokové systémy.', 'content.topics.agentEvals.summary',
   E'Jednorázové evaluace promptů nestačí na agenty. Potřebujete evaluovat celou trajektorii.',
   'content.topics.agentEvals.body',
   'advanced', 25, '{"evals-that-matter","multi-step-agents"}', '{"agents","evals"}', 3)
on conflict (slug) do update
  set track_id = excluded.track_id,
      title = excluded.title,
      title_key = excluded.title_key,
      summary = excluded.summary,
      summary_key = excluded.summary_key,
      body_md = excluded.body_md,
      body_key = excluded.body_key,
      difficulty = excluded.difficulty,
      estimated_minutes = excluded.estimated_minutes,
      prerequisites = excluded.prerequisites,
      tags = excluded.tags,
      position = excluded.position;
