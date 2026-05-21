import type { BaseTranslation } from "../../i18n-types";

const cs_content: BaseTranslation = {
  tracks: {
    foundations: {
      title: "Základy",
      description: "Klíčové pojmy: tokeny, embeddingy, transformery a co LLM skutečně dělá.",
    },
    prompting: {
      title: "Promptování",
      description: "Praktické vzory promptů, systémové prompty a strukturovaný výstup.",
    },
    building: {
      title: "Tvorba s AI",
      description: "Cursor, RAG, evaluace a nasazování AI funkcí.",
    },
    agents: {
      title: "Agenti a workflow",
      description: "Nástroje, vícekrokové uvažování a orchestrační vzory.",
    },
  },
  topics: {
    howLlmsWork: {
      title: "Jak LLM skutečně fungují",
      summary: "Krátká cesta od tokenů k predikci dalšího tokenu.",
      body: "## Co je token?\n\nLLM nevidí text jako znaky, ale jako **tokeny**. Token má v angličtině zhruba 4 znaky; v jiných jazycích se délka liší.\n\n## Predikce dalšího tokenu\n\nModel dostane posloupnost tokenů a předpoví, jaký token bude nejpravděpodobnější další. Tenhle jednoduchý mechanismus - opakovaný pořád dokola - vytváří vše, co v chatu vidíte.\n\n## Proč na tom záleží\n\nKdyž tomu rozumíte, lépe chápete:\n\n- proč tokeny a tokenizace ovlivňují cenu i latenci,\n- proč mají prompty a kontextová okna limity,\n- proč teplota mění rozmanitost odpovědí.",
    },
    embeddings101: {
      title: "Embeddingy 101",
      summary: "Vektory, které zachycují význam. Základ vyhledávání a RAG.",
      body: "Embedding převede text na vektor čísel. Podobný význam znamená blízkost ve vektorovém prostoru.\n\n## Kdy je použít\n\n- Sémantické vyhledávání\n- Shlukování\n- Doporučování\n- Retrieval-Augmented Generation (RAG)",
    },
    systemPrompts: {
      title: "Systémové prompty, které drží",
      summary: "Struktura, role, omezení, příklady a odmítnutí.",
      body: "Systémový prompt nastavuje trvalé chování modelu. Berte ho jako produktový text: přesný, testovatelný a dost malý na to, abyste ho udrželi v hlavě.\n\n## Kostra\n\n```\nRole\nKontext\nÚkol\nOmezení\nFormát výstupu\n```",
    },
    structuredOutput: {
      title: "Strukturovaný výstup (JSON, nástroje, schémata)",
      summary: "Když má výstup modelu číst další program.",
      body: "Když je konzumentem výstupu další program, preferujte strukturovaný výstup:\n\n- JSON režim\n- Volání nástrojů / funkcí\n- Přísná schémata (Zod, JSON Schema)",
    },
    cursorDayOne: {
      title: "Cursor první den",
      summary: "Nastavení, .cursor/rules, modely a smyčka agenta.",
      body: "## Instalace\n\nStáhněte Cursor a přihlaste se. Nastavte výchozí model.\n\n## Projektová pravidla\n\nVytvořte `.cursor/rules/your-rule.md`, aby měl agent pro tento repozitář trvalé pokyny.",
    },
    ragInAnHour: {
      title: "RAG za hodinu",
      summary: "Chunking, embeddingy, podobnostní vyhledávání, re-ranking a promptování.",
      body: "## Pipeline\n\n1. Rozdělit na chunky\n2. Vytvořit embeddingy\n3. Uložit\n4. Vyhledat\n5. (Přeřadit výsledky)\n6. Promptovat s kontextem",
    },
    evalsThatMatter: {
      title: "Evaluace, které mají smysl",
      summary: "Od tabulkově hodnocených promptů po automatické skórování.",
      body: "Tři typy evaluací, které opravdu potřebujete:\n\n- **Referenční** - porovnání se zlatou odpovědí.\n- **Rubrikové** - malý LLM hodnotitel s rubrikou.\n- **A/B v produkci** - měření chování uživatelů.",
    },
    toolsAndFunctionCalling: {
      title: "Nástroje a volání funkcí",
      summary: "Dejte modelu slovesa. Pak omezte, co smí udělat.",
      body: "Nástroje mění LLM v něco, co umí jednat. Definujete JSON schéma, model ho vyplní a váš kód akci provede.",
    },
    multiStepAgents: {
      title: "Vícekrokoví agenti",
      summary: "Plánování, paměť, opakování a kdy to vzdát.",
      body: "Krátký přehled:\n\n- ReAct\n- Plan-and-execute\n- Reflexe\n- Předávání úkolů",
    },
    agentEvals: {
      title: "Vyhodnocování agentů",
      summary: "Trasujte, skórujte a zlepšujte vícekrokové systémy.",
      body: "Jednorázové evaluace promptů nestačí na agenty. Potřebujete evaluovat celou trajektorii.",
    },
  },
  resources: {
    gpt4: {
      title: "Technická zpráva GPT-4",
      summary: "Technická zpráva popisující schopnosti a limity GPT-4.",
    },
    claude3: {
      title: "Představení rodiny modelů Claude 3",
      summary: "Oznámení Claude 3 Haiku, Sonnet a Opus s benchmarky a příklady použití.",
    },
    react: {
      title: "ReAct: propojení uvažování a jednání v jazykových modelech",
      summary: "Původní článek ReAct. Kombinuje řetězení úvah s používáním nástrojů.",
    },
    cursorAgent: {
      title: "Dokumentace Cursor Agent",
      summary: "Jak funguje Cursor agent: nástroje, pravidla, režimy a doporučené postupy.",
    },
    supabaseAi: {
      title: "Supabase AI a vektory",
      summary: "Používání pgvector se Supabase: ukládání, indexování a podobnostní vyhledávání.",
    },
    evals: {
      title: "Váš AI produkt potřebuje evaluace",
      summary: "Pragmatický argument pro budování evaluací před optimalizací promptů.",
    },
  },
  quizzes: {
    howLlmsWorkMcq: {
      title: "Jak fungují LLM - rychlá kontrola",
      description: "5 otázek, které ověří, že základy drží.",
      q1: {
        prompt: "Co LLM ve skutečnosti krok za krokem předpovídá?",
        o1: "Další znak",
        o2: "Další token",
        o3: "Další větu",
        o4: "Nejrelevantnější dokument",
        explanation: "LLM předpovídají další token. Token má v angličtině zhruba 4 znaky.",
      },
      q2: {
        prompt: "Kolik znaků angličtiny zhruba odpovídá jednomu tokenu?",
        o1: "1",
        o2: "4",
        o3: "16",
        o4: "100",
        explanation: "V angličtině má token v průměru přibližně 4 znaky.",
      },
      q3: {
        prompt: "Vyšší teplota obvykle znamená...",
        o1: "Determinističtější výstup",
        o2: "Rozmanitější výstup",
        o3: "Nižší cenu",
        o4: "Rychlejší odpověď",
        explanation: "Teplota řídí náhodnost vzorkování.",
      },
      q4: {
        prompt: "Co z toho typicky NEovlivňuje tokenizace?",
        o1: "Cena",
        o2: "Latence",
        o3: "Limity kontextového okna",
        o4: "Zobrazovací font",
        explanation: "Font je čistě volba uživatelského rozhraní.",
      },
      q5: {
        prompt: "Když má model kontextové okno 128k, tento limit je v...",
        o1: "Znacích",
        o2: "Tokenech",
        o3: "Slovech",
        o4: "Megabytech",
        explanation: "Kontextová okna se měří v tokenech.",
      },
    },
    embeddingsFlashcards: {
      title: "Kartičky: embeddingy",
      description: "6 kartiček pokrývajících základní pojmy embeddingů.",
      f1: {
        prompt: "Co reprezentuje embedding?",
        answer: "Pozici ve vysokodimenzionálním vektorovém prostoru, kde vzdálenost přibližně odpovídá sémantické podobnosti.",
      },
      f2: {
        prompt: "Proč kosinová podobnost?",
        answer: "Porovnává směr dvou vektorů a ignoruje velikost - užitečné, když nás zajímá význam, ne délka.",
      },
      f3: {
        prompt: "Co je pgvector?",
        answer: "Rozšíření PostgreSQL, které ukládá a indexuje vektorové embeddingy pro podobnostní vyhledávání.",
      },
      f4: {
        prompt: "Co je RAG jednou větou?",
        answer: "Vyhledejte relevantní chunky pomocí podobnostního hledání a vložte je do promptu před generováním.",
      },
      f5: {
        prompt: "Jaký je kompromis mezi indexy ivfflat a hnsw?",
        answer: "ivfflat: rychlejší sestavení, nižší recall; hnsw: pomalejší sestavení, vyšší recall a rychlejší dotazy.",
      },
      f6: {
        prompt: "Proč samotná podobnost nemusí stačit?",
        answer: "Retrieval může vrátit sémanticky blízké, ale kontextově špatné chunky; pomůže re-ranker nebo filtr.",
      },
    },
  },
  buildLabItems: {
    cursorFeatureSpike: {
      title: "Cursor - prompt pro rychlý spike funkce",
      summary: "Znovupoužitelný prompt pro vymezení a otestování nové funkce v repozitáři.",
      body: "Pracuješ v <repo>. Chci udělat spike pro <feature>.\n\nVýstupy:\n1. Krátký návrh řešení (3-5 bodů).\n2. Minimální změny souborů potřebné pro funkční prototyp.\n3. Checklist navazujících kroků.\n\nOmezení: drž změny úzké, nepřejmenovávej soubory, přidej TODO tam, kde něco stubuješ.",
    },
    cursorRefactorPrompt: {
      title: "Cursor - prompt pro bezpečný refaktor",
      summary: "Refaktor s mantinely: rozsah, testy a možnost návratu.",
      body: "Refaktoruj <module> směrem k <goal>.\n\nPravidla:\n- Žádné změny chování.\n- Co nejmenší diff.\n- Aktualizuj nebo přidej testy pro každou netriviální změnu.\n- Všechna rizika uveď na konci v sekci \"Pozor\".",
    },
    chatbotLaunchPlaybook: {
      title: "Spuštění interního chatbota - playbook",
      summary: "Desetikrokový playbook od vymezení problému po spuštění v1.",
      body: "## 1. Problém\nJakou bolest uživatelů odstraňujeme?\n\n## 2. Rozsah\nCo je uvnitř a co mimo?\n\n## 3. Data\nJaký je korpus? Kde žije?\n\n## 4. Retrieval\nNejdřív naivní RAG. Měřte.\n\n## 5. Prompt\nSystémový prompt + definice nástrojů.\n\n## 6. Evaluace\nZlatá sada + rubrika.\n\n## 7. UI\nŠtíhlé, bez ozdob.\n\n## 8. Guardraily\nPII, odmítnutí, zneužití.\n\n## 9. Telemetrie\nLogujte vstupy, výstupy a skóre.\n\n## 10. Spuštění\nCanary -> široké nasazení.",
    },
    productPrdTemplate: {
      title: "Šablona PRD pro AI funkci",
      summary: "Malé PRD přizpůsobené AI funkcím: úkoly uživatelů, kritéria úspěchu, plán evaluací.",
      body: "# <Název funkce>\n\n## Problém\n## Uživatelé a úkoly\n## Kritéria úspěchu\n## Náčrt řešení\n## Rizika\n## Plán evaluací\n## Otevřené otázky",
    },
    shipChecklist: {
      title: "Checklist pro nasazení AI funkce",
      summary: "Kontroly před tím, než novou AI funkci pustíme reálným uživatelům.",
      body: "- [ ] Systémový prompt zkontrolován\n- [ ] Schémata nástrojů validována\n- [ ] Existují evaluace promptů a retrievalu\n- [ ] Guardraily pro PII / zneužití jsou na místě\n- [ ] Nastaven cenový strop\n- [ ] Zapnuté logování a tracing\n- [ ] Plán rollout (canary -> široce)\n- [ ] Zdokumentovaný rollback plán",
    },
  },
};

export default cs_content;
