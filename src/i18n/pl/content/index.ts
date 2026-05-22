import type { NamespaceContentTranslation } from "../../i18n-types";

const pl_content: NamespaceContentTranslation = {
  tracks: {
    foundations: {
      title: "Podstawy",
      description: "Kluczowe pojęcia: tokeny, embeddingi, transformery i to, co LLM naprawdę robi.",
    },
    prompting: {
      title: "Promptowanie",
      description: "Praktyczne wzorce promptów, prompty systemowe i ustrukturyzowany wynik.",
    },
    building: {
      title: "Budowanie z AI",
      description: "Cursor, RAG, ewaluacje i wdrażanie funkcji AI.",
    },
    agents: {
      title: "Agenci i workflow",
      description: "Narzędzia, rozumowanie wieloetapowe i wzorce orkiestracji.",
    },
  },
  topics: {
    howLlmsWork: {
      title: "Jak LLM naprawdę działają",
      summary: "Krótka droga od tokenów do predykcji kolejnego tokenu.",
      body: "## Czym jest token?\n\nLLM nie widzą tekstu jako znaków, lecz jako **tokeny**. Token ma w języku angielskim mniej więcej 4 znaki; w innych językach długość bywa inna.\n\n## Predykcja kolejnego tokenu\n\nModel dostaje sekwencję tokenów i przewiduje, który token najprawdopodobniej będzie następny. Ten prosty mechanizm - powtarzany w kółko - tworzy wszystko, co widzisz w odpowiedzi chatu.\n\n## Dlaczego to ważne\n\nGdy to rozumiesz, lepiej rozumiesz:\n\n- dlaczego tokeny i tokenizacja wpływają na koszt oraz opóźnienia,\n- dlaczego prompty i okna kontekstu mają limity,\n- dlaczego temperatura zmienia różnorodność odpowiedzi.",
    },
    embeddings101: {
      title: "Embeddingi 101",
      summary: "Wektory, które przechwytują znaczenie. Podstawa wyszukiwania i RAG.",
      body: "Embedding zamienia tekst w wektor liczb. Podobne znaczenie oznacza bliskość w przestrzeni wektorowej.\n\n## Kiedy ich używać\n\n- Wyszukiwanie semantyczne\n- Grupowanie\n- Rekomendacje\n- Retrieval-Augmented Generation (RAG)",
    },
    systemPrompts: {
      title: "Prompty systemowe, które działają stabilnie",
      summary: "Struktura, rola, ograniczenia, przykłady i odmowy.",
      body: "Prompt systemowy ustawia trwałe zachowanie modelu. Traktuj go jak tekst produktowy: precyzyjny, testowalny i na tyle mały, by dało się go ogarnąć w głowie.\n\n## Szkielet\n\n```\nRola\nKontekst\nZadanie\nOgraniczenia\nFormat wyjścia\n```",
    },
    structuredOutput: {
      title: "Ustrukturyzowany wynik (JSON, narzędzia, schematy)",
      summary: "Gdy wynik modelu ma odczytać inny program.",
      body: "Gdy konsumentem wyniku jest inny program, wybieraj ustrukturyzowany wynik:\n\n- Tryb JSON\n- Wywoływanie narzędzi / funkcji\n- Ścisłe schematy (Zod, JSON Schema)",
    },
    cursorDayOne: {
      title: "Cursor pierwszego dnia",
      summary: "Konfiguracja, .cursor/rules, modele i pętla agenta.",
      body: "## Instalacja\n\nPobierz Cursor i zaloguj się. Ustaw domyślny model.\n\n## Reguły projektu\n\nUtwórz `.cursor/rules/your-rule.md`, aby agent miał trwałe wskazówki dla tego repozytorium.",
    },
    ragInAnHour: {
      title: "RAG w godzinę",
      summary: "Chunking, embeddingi, wyszukiwanie podobieństwa, re-ranking i promptowanie.",
      body: "## Pipeline\n\n1. Podziel na chunki\n2. Utwórz embeddingi\n3. Zapisz\n4. Wyszukaj\n5. (Przeszereguj wyniki)\n6. Promptuj z kontekstem",
    },
    evalsThatMatter: {
      title: "Ewaluacje, które mają znaczenie",
      summary: "Od oceniania promptów w arkuszu po automatyczne punktowanie.",
      body: "Trzy typy ewaluacji, których naprawdę potrzebujesz:\n\n- **Referencyjne** - porównanie ze złotą odpowiedzią.\n- **Rubrykowe** - mały sędzia LLM z rubryką.\n- **A/B w produkcji** - mierzenie zachowania użytkowników.",
    },
    toolsAndFunctionCalling: {
      title: "Narzędzia i wywoływanie funkcji",
      summary: "Daj modelowi czasowniki. Potem ogranicz, co może zrobić.",
      body: "Narzędzia zmieniają LLM w coś, co potrafi działać. Definiujesz schemat JSON, model go wypełnia, a twój kod wykonuje akcję.",
    },
    multiStepAgents: {
      title: "Agenci wieloetapowi",
      summary: "Planowanie, pamięć, ponowienia i kiedy się zatrzymać.",
      body: "Krótki przegląd:\n\n- ReAct\n- Plan-and-execute\n- Refleksja\n- Przekazywanie zadań",
    },
    agentEvals: {
      title: "Ewaluacja agentów",
      summary: "Śledź, punktuj i ulepszaj systemy wieloetapowe.",
      body: "Jednorazowe ewaluacje promptów nie wystarczają dla agentów. Potrzebujesz ewaluacji całej trajektorii.",
    },
  },
  resources: {
    gpt4: {
      title: "Raport techniczny GPT-4",
      summary: "Raport techniczny opisujący możliwości i ograniczenia GPT-4.",
    },
    claude3: {
      title: "Przedstawienie rodziny modeli Claude 3",
      summary: "Ogłoszenie Claude 3 Haiku, Sonnet i Opus wraz z benchmarkami oraz przykładami użycia.",
    },
    react: {
      title: "ReAct: łączenie rozumowania i działania w modelach językowych",
      summary: "Oryginalny artykuł ReAct. Łączy chain-of-thought z użyciem narzędzi.",
    },
    cursorAgent: {
      title: "Dokumentacja Cursor Agent",
      summary: "Jak działa agent Cursor: narzędzia, reguły, tryby i dobre praktyki.",
    },
    supabaseAi: {
      title: "Supabase AI i wektory",
      summary: "Używanie pgvector z Supabase: przechowywanie, indeksowanie i wyszukiwanie podobieństwa.",
    },
    evals: {
      title: "Twój produkt AI potrzebuje ewaluacji",
      summary: "Pragmatyczny argument za budowaniem ewaluacji przed optymalizacją promptów.",
    },
  },
  quizzes: {
    howLlmsWorkMcq: {
      title: "Jak działają LLM - szybki test",
      description: "5 pytań, które sprawdzają, czy podstawy zostały zapamiętane.",
      q1: {
        prompt: "Co LLM faktycznie przewiduje krok po kroku?",
        o1: "Kolejny znak",
        o2: "Kolejny token",
        o3: "Kolejne zdanie",
        o4: "Najbardziej trafny dokument",
        explanation: "LLM przewidują kolejny token. Token ma w angielskim mniej więcej 4 znaki.",
      },
      q2: {
        prompt: "Ile znaków angielskiego mniej więcej mieści się w jednym tokenie?",
        o1: "1",
        o2: "4",
        o3: "16",
        o4: "100",
        explanation: "Średnio około 4 znaki na token w języku angielskim.",
      },
      q3: {
        prompt: "Wyższa temperatura zwykle oznacza...",
        o1: "Bardziej deterministyczny wynik",
        o2: "Bardziej różnorodny wynik",
        o3: "Niższy koszt",
        o4: "Szybszą odpowiedź",
        explanation: "Temperatura kontroluje losowość próbkowania.",
      },
      q4: {
        prompt: "Na co z poniższych tokenizacja zwykle NIE wpływa?",
        o1: "Koszt",
        o2: "Opóźnienie",
        o3: "Limity okna kontekstu",
        o4: "Font wyświetlania",
        explanation: "Font to wyłącznie wybór interfejsu użytkownika.",
      },
      q5: {
        prompt: "Jeśli model ma okno kontekstu 128k, ten limit jest wyrażony w...",
        o1: "Znakach",
        o2: "Tokenach",
        o3: "Słowach",
        o4: "Megabajtach",
        explanation: "Okna kontekstu mierzy się w tokenach.",
      },
    },
    embeddingsFlashcards: {
      title: "Fiszki: embeddingi",
      description: "6 fiszek obejmujących podstawowe pojęcia embeddingów.",
      f1: {
        prompt: "Co reprezentuje embedding?",
        answer: "Pozycję w wysokowymiarowej przestrzeni wektorowej, gdzie odległość przybliża podobieństwo semantyczne.",
      },
      f2: {
        prompt: "Dlaczego podobieństwo cosinusowe?",
        answer: "Porównuje kierunek dwóch wektorów i ignoruje wielkość - przydatne, gdy liczy się znaczenie, a nie długość.",
      },
      f3: {
        prompt: "Czym jest pgvector?",
        answer: "Rozszerzeniem PostgreSQL, które przechowuje i indeksuje embeddingi wektorowe do wyszukiwania podobieństwa.",
      },
      f4: {
        prompt: "Czym jest RAG w jednym zdaniu?",
        answer: "Wyszukaj trafne chunki przez wyszukiwanie podobieństwa, a następnie włóż je do promptu przed generowaniem.",
      },
      f5: {
        prompt: "Jaki jest kompromis między indeksami ivfflat i hnsw?",
        answer: "ivfflat: szybsze budowanie, niższy recall; hnsw: wolniejsze budowanie, wyższy recall i szybsze zapytania.",
      },
      f6: {
        prompt: "Dlaczego sama podobność może nie wystarczyć?",
        answer: "Retrieval może zwrócić semantycznie bliskie, ale kontekstowo błędne chunki; pomaga re-ranker albo filtr.",
      },
    },
  },
  buildLabItems: {
    cursorFeatureSpike: {
      title: "Cursor - prompt do szybkiego spike'u funkcji",
      summary: "Wielokrotnego użytku prompt do określenia zakresu i sprawdzenia nowej funkcji w repozytorium.",
      body: "Pracujesz w <repo>. Chcę zrobić spike dla <feature>.\n\nRezultaty:\n1. Krótka propozycja rozwiązania (3-5 punktów).\n2. Minimalne zmiany w plikach potrzebne do działającego prototypu.\n3. Checklist kolejnych kroków.\n\nOgraniczenia: trzymaj zmiany wąsko, nie zmieniaj nazw plików, dodaj TODO tam, gdzie coś stubujesz.",
    },
    cursorRefactorPrompt: {
      title: "Cursor - prompt do bezpiecznego refaktoru",
      summary: "Refaktor z zabezpieczeniami: zakres, testy i odwracalność.",
      body: "Zrefaktoryzuj <module> w kierunku <goal>.\n\nZasady:\n- Bez zmian zachowania.\n- Najmniejszy możliwy diff.\n- Zaktualizuj lub dodaj testy dla każdej nietrywialnej zmiany.\n- Wszystkie ryzyka wypisz na końcu w sekcji \"Uwaga\".",
    },
    chatbotLaunchPlaybook: {
      title: "Uruchomienie wewnętrznego chatbota - playbook",
      summary: "Dziesięciokrokowy playbook od zdefiniowania problemu po uruchomienie v1.",
      body: "## 1. Problem\nJaki ból użytkownika usuwamy?\n\n## 2. Zakres\nCo jest w środku, a co poza zakresem?\n\n## 3. Dane\nJaki jest korpus? Gdzie mieszka?\n\n## 4. Retrieval\nNajpierw naiwny RAG. Mierz.\n\n## 5. Prompt\nPrompt systemowy + definicje narzędzi.\n\n## 6. Ewaluacje\nZłoty zestaw + rubryka.\n\n## 7. UI\nProste, bez ozdobników.\n\n## 8. Guardraile\nPII, odmowy, nadużycia.\n\n## 9. Telemetria\nLoguj wejścia, wyjścia i wyniki.\n\n## 10. Start\nCanary -> szerokie wdrożenie.",
    },
    productPrdTemplate: {
      title: "Szablon PRD dla funkcji AI",
      summary: "Małe PRD dopasowane do funkcji AI: zadania użytkowników, kryteria sukcesu, plan ewaluacji.",
      body: "# <Nazwa funkcji>\n\n## Problem\n## Użytkownicy i zadania\n## Kryteria sukcesu\n## Szkic rozwiązania\n## Ryzyka\n## Plan ewaluacji\n## Otwarte pytania",
    },
    shipChecklist: {
      title: "Checklist wdrożenia funkcji AI",
      summary: "Kontrole przed udostępnieniem nowej funkcji AI prawdziwym użytkownikom.",
      body: "- [ ] Prompt systemowy sprawdzony\n- [ ] Schematy narzędzi zwalidowane\n- [ ] Istnieją ewaluacje promptu i retrievalu\n- [ ] Guardraile PII / nadużyć są gotowe\n- [ ] Ustawiony limit kosztów\n- [ ] Włączone logowanie i tracing\n- [ ] Plan rollout (canary -> szeroko)\n- [ ] Udokumentowany plan rollbacku",
    },
  },
  canon: {
    attentionIsAllYouNeed: {
      title: "Attention Is All You Need",
      summary: "Oryginalny artykuł o architekturze Transformer. Fundament współczesnych LLM.",
    },
    scalingLaws: {
      title: "Scaling Laws for Neural Language Models",
      summary: "Prawa skalowania OpenAI: jak wzrasta wydajność modelu z danymi, parametrami i obliczeniami.",
    },
    chinchilla: {
      title: "Chinchilla: Training Compute-Optimal LLMs",
      summary: "DeepMind pokazuje, że większość LLM była niedotrenowana na danych w stosunku do swojego budżetu obliczeniowego.",
    },
    bert: {
      title: "BERT: Pre-training of Deep Bidirectional Transformers",
      summary: "Model encoder-only, który spopularyzował paradygmat pre-training / fine-tuning.",
    },
    gpt3: {
      title: "GPT-3: Language Models are Few-Shot Learners",
      summary: "Artykuł, który pokazał, że skalowanie + in-context learning prowadzi do emergentnych zdolności.",
    },
    llama: {
      title: "LLaMA: Open and Efficient Foundation Language Models",
      summary: "Meta udostępnia silną rodzinę otwartych modeli i daje początek ekosystemowi open-source LLM.",
    },
    mixtral: {
      title: "Mixtral of Experts",
      summary: "Mistral opisuje rzadki model mixture-of-experts 8x7B o jakości GPT-3.5 przy ułamku kosztu.",
    },
    instructgpt: {
      title: "InstructGPT: Training Language Models to Follow Instructions with Human Feedback",
      summary: "Artykuł stojący za ChatGPT: RLHF, który nauczył GPT-3 wykonywać instrukcje.",
    },
    constitutionalAi: {
      title: "Constitutional AI: Harmlessness from AI Feedback",
      summary: "Anthropic pokazuje RLAIF: AI ocenia wyniki na podstawie spisanego zestawu zasad.",
    },
    dpo: {
      title: "Direct Preference Optimization",
      summary: "Trenuj LLM z par preferencji bez jawnego modelu nagrody — prościej niż RLHF.",
    },
    cot: {
      title: "Chain-of-Thought Prompting",
      summary: "Pokazuje, jak prompty z pośrednimi krokami rozumowania poprawiają wielokrokowe rozumowanie LLM.",
    },
    react: {
      title: "ReAct: Synergizing Reasoning and Acting in Language Models",
      summary: "Kanoniczny wzorzec agenta: model językowy przeplata kroki rozumowania i wywołania narzędzi.",
    },
    toolformer: {
      title: "Toolformer: Language Models Can Teach Themselves to Use Tools",
      summary: "Meta pokazuje, jak LLM może samodzielnie nauczyć się wywoływania zewnętrznych API.",
    },
    rag: {
      title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
      summary: "Oryginalny artykuł RAG: kombinacja retrieve + generate dla zadań intensywnych w wiedzę.",
    },
  },
};

export default pl_content;
