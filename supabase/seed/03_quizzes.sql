-- Seed: 2 starter quizzes (MCQ + flashcards) wired to topics.
-- Base columns/questions keep Czech fallback text. title_key/description_key
-- and deterministic question ids resolve localized strings through
-- src/i18n/*/content (Priprava/Reo-style key model).

with t as (select id, slug from public.topics)
insert into public.quizzes (
  slug, title, title_key, description, description_key,
  topic_id, difficulty, estimated_minutes, questions
) values
  ('how-llms-work-mcq',
   'Jak fungují LLM - rychlá kontrola',
   'content.quizzes.howLlmsWorkMcq.title',
   '5 otázek, které ověří, že základy drží.',
   'content.quizzes.howLlmsWorkMcq.description',
   (select id from t where slug='how-llms-work'),
   'beginner', 5,
   '[
     {
       "id": "q1",
       "kind": "mcq",
       "prompt": "Co LLM ve skutečnosti krok za krokem předpovídá?",
       "options": ["Další znak", "Další token", "Další větu", "Nejrelevantnější dokument"],
       "answerIndex": 1,
       "explanation": "LLM předpovídají další token. Token má v angličtině zhruba 4 znaky."
     },
     {
       "id": "q2",
       "kind": "mcq",
       "prompt": "Kolik znaků angličtiny zhruba odpovídá jednomu tokenu?",
       "options": ["1", "4", "16", "100"],
       "answerIndex": 1,
       "explanation": "V angličtině má token v průměru přibližně 4 znaky."
     },
     {
       "id": "q3",
       "kind": "mcq",
       "prompt": "Vyšší teplota obvykle znamená...",
       "options": ["Determinističtější výstup", "Rozmanitější výstup", "Nižší cenu", "Rychlejší odpověď"],
       "answerIndex": 1,
       "explanation": "Teplota řídí náhodnost vzorkování."
     },
     {
       "id": "q4",
       "kind": "mcq",
       "prompt": "Co z toho typicky NEovlivňuje tokenizace?",
       "options": ["Cena", "Latence", "Limity kontextového okna", "Zobrazovací font"],
       "answerIndex": 3,
       "explanation": "Font je čistě volba uživatelského rozhraní."
     },
     {
       "id": "q5",
       "kind": "mcq",
       "prompt": "Když má model kontextové okno 128k, tento limit je v...",
       "options": ["Znacích", "Tokenech", "Slovech", "Megabytech"],
       "answerIndex": 1,
       "explanation": "Kontextová okna se měří v tokenech."
     }
   ]'::jsonb),

  ('embeddings-flashcards',
   'Kartičky: embeddingy',
   'content.quizzes.embeddingsFlashcards.title',
   '6 kartiček pokrývajících základní pojmy embeddingů.',
   'content.quizzes.embeddingsFlashcards.description',
   (select id from t where slug='embeddings-101'),
   'beginner', 5,
   '[
     { "id": "f1", "kind": "flashcard", "prompt": "Co reprezentuje embedding?", "answer": "Pozici ve vysokodimenzionálním vektorovém prostoru, kde vzdálenost přibližně odpovídá sémantické podobnosti." },
     { "id": "f2", "kind": "flashcard", "prompt": "Proč kosinová podobnost?", "answer": "Porovnává směr dvou vektorů a ignoruje velikost - užitečné, když nás zajímá význam, ne délka." },
     { "id": "f3", "kind": "flashcard", "prompt": "Co je pgvector?", "answer": "Rozšíření PostgreSQL, které ukládá a indexuje vektorové embeddingy pro podobnostní vyhledávání." },
     { "id": "f4", "kind": "flashcard", "prompt": "Co je RAG jednou větou?", "answer": "Vyhledejte relevantní chunky pomocí podobnostního hledání a vložte je do promptu před generováním." },
     { "id": "f5", "kind": "flashcard", "prompt": "Jaký je kompromis mezi indexy ivfflat a hnsw?", "answer": "ivfflat: rychlejší sestavení, nižší recall; hnsw: pomalejší sestavení, vyšší recall a rychlejší dotazy." },
     { "id": "f6", "kind": "flashcard", "prompt": "Proč samotná podobnost nemusí stačit?", "answer": "Retrieval může vrátit sémanticky blízké, ale kontextově špatné chunky; pomůže re-ranker nebo filtr." }
   ]'::jsonb)
on conflict (slug) do update
  set title = excluded.title,
      title_key = excluded.title_key,
      description = excluded.description,
      description_key = excluded.description_key,
      questions = excluded.questions;
