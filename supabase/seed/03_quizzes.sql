-- Seed: 2 starter quizzes (MCQ + flashcards) wired to topics.

with t as (select id, slug from public.topics)
insert into public.quizzes (slug, title, description, topic_id, difficulty, estimated_minutes, questions) values
  ('how-llms-work-mcq',
   'How LLMs work — quick check',
   '5 questions to make sure the basics stick.',
   (select id from t where slug='how-llms-work'),
   'beginner', 5,
   '[
     {
       "id": "q1",
       "kind": "mcq",
       "prompt": "What does an LLM actually predict, one step at a time?",
       "options": ["The next character", "The next token", "The next sentence", "The most relevant document"],
       "answerIndex": 1,
       "explanation": "LLMs are next-token predictors. Tokens are roughly 4 characters of English."
     },
     {
       "id": "q2",
       "kind": "mcq",
       "prompt": "Roughly how many characters of English fit in one token?",
       "options": ["1", "4", "16", "100"],
       "answerIndex": 1,
       "explanation": "About 4 characters per token on average for English."
     },
     {
       "id": "q3",
       "kind": "mcq",
       "prompt": "Higher temperature usually means…",
       "options": ["More deterministic output", "More diverse output", "Lower cost", "Faster response"],
       "answerIndex": 1,
       "explanation": "Temperature controls sampling randomness."
     },
     {
       "id": "q4",
       "kind": "mcq",
       "prompt": "Which of these is NOT typically driven by tokenization?",
       "options": ["Cost", "Latency", "Context window limits", "Display font"],
       "answerIndex": 3,
       "explanation": "Font is purely a UI choice."
     },
     {
       "id": "q5",
       "kind": "mcq",
       "prompt": "If a model has a 128k context window, that limit is in…",
       "options": ["Characters", "Tokens", "Words", "Megabytes"],
       "answerIndex": 1,
       "explanation": "Context windows are measured in tokens."
     }
   ]'::jsonb),

  ('embeddings-flashcards',
   'Embeddings flashcards',
   '6 flashcards covering the core embedding concepts.',
   (select id from t where slug='embeddings-101'),
   'beginner', 5,
   '[
     { "id": "f1", "kind": "flashcard", "prompt": "What does an embedding represent?", "answer": "A position in a high-dimensional vector space whose distance approximates semantic similarity." },
     { "id": "f2", "kind": "flashcard", "prompt": "Why cosine similarity?", "answer": "It compares the direction of two vectors and ignores magnitude — useful when only meaning, not length, matters." },
     { "id": "f3", "kind": "flashcard", "prompt": "What is pgvector?", "answer": "A Postgres extension that stores and indexes vector embeddings for similarity search." },
     { "id": "f4", "kind": "flashcard", "prompt": "What is RAG in one sentence?", "answer": "Retrieve relevant chunks via similarity search, then put them in the prompt before generation." },
     { "id": "f5", "kind": "flashcard", "prompt": "Trade-off of ivfflat vs hnsw indexes?", "answer": "ivfflat: faster build, lower recall; hnsw: slower build, higher recall and faster queries." },
     { "id": "f6", "kind": "flashcard", "prompt": "Why might similarity alone be insufficient?", "answer": "Retrieval can return semantically close but contextually wrong chunks; a re-ranker or filter helps." }
   ]'::jsonb)
on conflict (slug) do update
  set title = excluded.title,
      description = excluded.description,
      questions = excluded.questions;
