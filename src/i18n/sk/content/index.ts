import type { NamespaceContentTranslation } from "../../i18n-types";

const sk_content: NamespaceContentTranslation = {
  tracks: {
    foundations: {
      title: "Základy",
      description: "Kľúčové pojmy: tokeny, embeddingy, transformery a čo LLM skutočne robí.",
    },
    prompting: {
      title: "Promptovanie",
      description: "Praktické vzory promptov, systémové prompty a štruktúrovaný výstup.",
    },
    building: {
      title: "Tvorba s AI",
      description: "Cursor, RAG, evaluácie a nasadzovanie AI funkcií.",
    },
    agents: {
      title: "Agenti a workflow",
      description: "Nástroje, viackrokové uvažovanie a orchestračné vzory.",
    },
  },
  topics: {
    howLlmsWork: {
      title: "Ako LLM skutočne fungujú",
      summary: "Krátka cesta od tokenov k predikcii ďalšieho tokenu.",
      body: "## Čo je token?\n\nLLM nevidia text ako znaky, ale ako **tokeny**. Token má v angličtine približne 4 znaky; v iných jazykoch sa dĺžka líši.\n\n## Predikcia ďalšieho tokenu\n\nModel dostane postupnosť tokenov a predpovie, ktorý token bude najpravdepodobnejší ďalší. Tento jednoduchý mechanizmus - opakovaný stále dookola - vytvára všetko, čo vidíte v chatovom výstupe.\n\n## Prečo na tom záleží\n\nKeď tomu rozumiete, lepšie chápete:\n\n- prečo tokeny a tokenizácia ovplyvňujú cenu aj latenciu,\n- prečo majú prompty a kontextové okná limity,\n- prečo teplota mení rozmanitosť odpovedí.",
    },
    embeddings101: {
      title: "Embeddingy 101",
      summary: "Vektory, ktoré zachytávajú význam. Základ vyhľadávania a RAG.",
      body: "Embedding prevedie text na vektor čísel. Podobný význam znamená blízkosť vo vektorovom priestore.\n\n## Kedy ich použiť\n\n- Sémantické vyhľadávanie\n- Zhlukovanie\n- Odporúčania\n- Retrieval-Augmented Generation (RAG)",
    },
    systemPrompts: {
      title: "Systémové prompty, ktoré držia",
      summary: "Štruktúra, rola, obmedzenia, príklady a odmietnutia.",
      body: "Systémový prompt nastavuje trvalé správanie modelu. Berte ho ako produktový text: presný, testovateľný a dosť malý na to, aby ste ho udržali v hlave.\n\n## Kostra\n\n```\nRola\nKontext\nÚloha\nObmedzenia\nFormát výstupu\n```",
    },
    structuredOutput: {
      title: "Štruktúrovaný výstup (JSON, nástroje, schémy)",
      summary: "Keď má výstup modelu čítať ďalší program.",
      body: "Keď je konzumentom výstupu ďalší program, preferujte štruktúrovaný výstup:\n\n- JSON režim\n- Volanie nástrojov / funkcií\n- Prísne schémy (Zod, JSON Schema)",
    },
    cursorDayOne: {
      title: "Cursor prvý deň",
      summary: "Nastavenie, .cursor/rules, modely a slučka agenta.",
      body: "## Inštalácia\n\nStiahnite Cursor a prihláste sa. Nastavte predvolený model.\n\n## Projektové pravidlá\n\nVytvorte `.cursor/rules/your-rule.md`, aby mal agent pre tento repozitár trvalé pokyny.",
    },
    ragInAnHour: {
      title: "RAG za hodinu",
      summary: "Chunking, embeddingy, podobnostné vyhľadávanie, re-ranking a promptovanie.",
      body: "## Pipeline\n\n1. Rozdeliť na chunky\n2. Vytvoriť embeddingy\n3. Uložiť\n4. Vyhľadať\n5. (Pretriediť výsledky)\n6. Promptovať s kontextom",
    },
    evalsThatMatter: {
      title: "Evaluácie, ktoré majú zmysel",
      summary: "Od tabuľkovo hodnotených promptov po automatické skórovanie.",
      body: "Tri typy evaluácií, ktoré naozaj potrebujete:\n\n- **Referenčné** - porovnanie so zlatou odpoveďou.\n- **Rubrikové** - malý LLM hodnotiteľ s rubrikou.\n- **A/B v produkcii** - meranie správania používateľov.",
    },
    toolsAndFunctionCalling: {
      title: "Nástroje a volanie funkcií",
      summary: "Dajte modelu slovesá. Potom obmedzte, čo smie urobiť.",
      body: "Nástroje menia LLM na niečo, čo dokáže konať. Definujete JSON schému, model ju vyplní a váš kód akciu vykoná.",
    },
    multiStepAgents: {
      title: "Viackrokoví agenti",
      summary: "Plánovanie, pamäť, opakovania a kedy to vzdať.",
      body: "Krátky prehľad:\n\n- ReAct\n- Plan-and-execute\n- Reflexia\n- Odovzdávanie úloh",
    },
    agentEvals: {
      title: "Vyhodnocovanie agentov",
      summary: "Trasujte, skórujte a zlepšujte viackrokové systémy.",
      body: "Jednorazové evaluácie promptov nestačia na agentov. Potrebujete evaluovať celú trajektóriu.",
    },
  },
  resources: {
    gpt4: {
      title: "Technická správa GPT-4",
      summary: "Technická správa popisujúca schopnosti a limity GPT-4.",
    },
    claude3: {
      title: "Predstavenie rodiny modelov Claude 3",
      summary: "Oznámenie Claude 3 Haiku, Sonnet a Opus s benchmarkmi a príkladmi použitia.",
    },
    react: {
      title: "ReAct: prepojenie uvažovania a konania v jazykových modeloch",
      summary: "Pôvodný článok ReAct. Kombinuje reťazenie úvah s používaním nástrojov.",
    },
    cursorAgent: {
      title: "Dokumentácia Cursor Agent",
      summary: "Ako funguje Cursor agent: nástroje, pravidlá, režimy a odporúčané postupy.",
    },
    supabaseAi: {
      title: "Supabase AI a vektory",
      summary: "Používanie pgvector so Supabase: ukladanie, indexovanie a podobnostné vyhľadávanie.",
    },
    evals: {
      title: "Váš AI produkt potrebuje evaluácie",
      summary: "Pragmatický argument pre budovanie evaluácií pred optimalizáciou promptov.",
    },
  },
  quizzes: {
    howLlmsWorkMcq: {
      title: "Ako fungujú LLM - rýchla kontrola",
      description: "5 otázok, ktoré overia, že základy držia.",
      q1: {
        prompt: "Čo LLM v skutočnosti krok za krokom predpovedá?",
        o1: "Ďalší znak",
        o2: "Ďalší token",
        o3: "Ďalšiu vetu",
        o4: "Najrelevantnejší dokument",
        explanation: "LLM predpovedajú ďalší token. Token má v angličtine približne 4 znaky.",
      },
      q2: {
        prompt: "Koľko znakov angličtiny približne zodpovedá jednému tokenu?",
        o1: "1",
        o2: "4",
        o3: "16",
        o4: "100",
        explanation: "V angličtine má token v priemere približne 4 znaky.",
      },
      q3: {
        prompt: "Vyššia teplota zvyčajne znamená...",
        o1: "Deterministickejší výstup",
        o2: "Rozmanitejší výstup",
        o3: "Nižšiu cenu",
        o4: "Rýchlejšiu odpoveď",
        explanation: "Teplota riadi náhodnosť vzorkovania.",
      },
      q4: {
        prompt: "Čo z toho typicky NEovplyvňuje tokenizácia?",
        o1: "Cena",
        o2: "Latencia",
        o3: "Limity kontextového okna",
        o4: "Zobrazovací font",
        explanation: "Font je čisto voľba používateľského rozhrania.",
      },
      q5: {
        prompt: "Keď má model kontextové okno 128k, tento limit je v...",
        o1: "Znakoch",
        o2: "Tokenoch",
        o3: "Slovách",
        o4: "Megabajtoch",
        explanation: "Kontextové okná sa merajú v tokenoch.",
      },
    },
    embeddingsFlashcards: {
      title: "Kartičky: embeddingy",
      description: "6 kartičiek pokrývajúcich základné pojmy embeddingov.",
      f1: {
        prompt: "Čo reprezentuje embedding?",
        answer: "Pozíciu vo vysokodimenzionálnom vektorovom priestore, kde vzdialenosť približne zodpovedá sémantickej podobnosti.",
      },
      f2: {
        prompt: "Prečo kosínová podobnosť?",
        answer: "Porovnáva smer dvoch vektorov a ignoruje veľkosť - užitočné, keď nás zaujíma význam, nie dĺžka.",
      },
      f3: {
        prompt: "Čo je pgvector?",
        answer: "Rozšírenie PostgreSQL, ktoré ukladá a indexuje vektorové embeddingy pre podobnostné vyhľadávanie.",
      },
      f4: {
        prompt: "Čo je RAG jednou vetou?",
        answer: "Vyhľadajte relevantné chunky pomocou podobnostného hľadania a vložte ich do promptu pred generovaním.",
      },
      f5: {
        prompt: "Aký je kompromis medzi indexmi ivfflat a hnsw?",
        answer: "ivfflat: rýchlejšie zostavenie, nižší recall; hnsw: pomalšie zostavenie, vyšší recall a rýchlejšie dotazy.",
      },
      f6: {
        prompt: "Prečo samotná podobnosť nemusí stačiť?",
        answer: "Retrieval môže vrátiť sémanticky blízke, ale kontextovo nesprávne chunky; pomôže re-ranker alebo filter.",
      },
    },
  },
  buildLabItems: {
    cursorFeatureSpike: {
      title: "Cursor - prompt pre rýchly spike funkcie",
      summary: "Znovupoužiteľný prompt pre vymedzenie a otestovanie novej funkcie v repozitári.",
      body: "Pracuješ v <repo>. Chcem urobiť spike pre <feature>.\n\nVýstupy:\n1. Krátky návrh riešenia (3-5 bodov).\n2. Minimálne zmeny súborov potrebné pre funkčný prototyp.\n3. Checklist nadväzujúcich krokov.\n\nObmedzenia: drž zmeny úzke, nepremenovávaj súbory, pridaj TODO tam, kde niečo stubuješ.",
    },
    cursorRefactorPrompt: {
      title: "Cursor - prompt pre bezpečný refaktor",
      summary: "Refaktor s mantinelmi: rozsah, testy a možnosť návratu.",
      body: "Refaktoruj <module> smerom k <goal>.\n\nPravidlá:\n- Žiadne zmeny správania.\n- Čo najmenší diff.\n- Aktualizuj alebo pridaj testy pre každú netriviálnu zmenu.\n- Všetky riziká uveď na konci v sekcii \"Pozor\".",
    },
    chatbotLaunchPlaybook: {
      title: "Spustenie interného chatbota - playbook",
      summary: "Desaťkrokový playbook od vymedzenia problému po spustenie v1.",
      body: "## 1. Problém\nAkú bolesť používateľov odstraňujeme?\n\n## 2. Rozsah\nČo je vnútri a čo mimo?\n\n## 3. Dáta\nAký je korpus? Kde žije?\n\n## 4. Retrieval\nNajprv naivný RAG. Merajte.\n\n## 5. Prompt\nSystémový prompt + definície nástrojov.\n\n## 6. Evaluácie\nZlatá sada + rubrika.\n\n## 7. UI\nŠtíhle, bez ozdôb.\n\n## 8. Guardraily\nPII, odmietnutia, zneužitie.\n\n## 9. Telemetria\nLogujte vstupy, výstupy a skóre.\n\n## 10. Spustenie\nCanary -> široké nasadenie.",
    },
    productPrdTemplate: {
      title: "Šablóna PRD pre AI funkciu",
      summary: "Malé PRD prispôsobené AI funkciám: úlohy používateľov, kritériá úspechu, plán evaluácií.",
      body: "# <Názov funkcie>\n\n## Problém\n## Používatelia a úlohy\n## Kritériá úspechu\n## Náčrt riešenia\n## Riziká\n## Plán evaluácií\n## Otvorené otázky",
    },
    shipChecklist: {
      title: "Checklist pre nasadenie AI funkcie",
      summary: "Kontroly pred tým, než novú AI funkciu pustíme reálnym používateľom.",
      body: "- [ ] Systémový prompt skontrolovaný\n- [ ] Schémy nástrojov validované\n- [ ] Existujú evaluácie promptov a retrievalu\n- [ ] Guardraily pre PII / zneužitie sú na mieste\n- [ ] Nastavený cenový strop\n- [ ] Zapnuté logovanie a tracing\n- [ ] Plán rollout (canary -> široko)\n- [ ] Zdokumentovaný rollback plán",
    },
  },
  canon: {
    attentionIsAllYouNeed: {
      title: "Attention Is All You Need",
      summary: "Pôvodný článok predstavujúci architektúru Transformer. Základ moderných LLM.",
    },
    scalingLaws: {
      title: "Scaling Laws for Neural Language Models",
      summary: "OpenAI scaling laws: ako rastie výkon modelu s veľkosťou dát, parametrov a výpočtu.",
    },
    chinchilla: {
      title: "Chinchilla: Training Compute-Optimal LLMs",
      summary: "DeepMind ukazuje, že väčšina LLM bola nedostatočne trénovaná na dátach vzhľadom na svoj výpočet.",
    },
    bert: {
      title: "BERT: Pre-training of Deep Bidirectional Transformers",
      summary: "Encoder-only model, ktorý popularizoval paradigmu pre-training / fine-tuning.",
    },
    gpt3: {
      title: "GPT-3: Language Models are Few-Shot Learners",
      summary: "Článok, ktorý ukázal, že škálovanie + in-context learning vedie k emergentným schopnostiam.",
    },
    llama: {
      title: "LLaMA: Open and Efficient Foundation Language Models",
      summary: "Meta uvoľňuje silnú rodinu otvorených modelov a odštartuje open-source LLM ekosystém.",
    },
    mixtral: {
      title: "Mixtral of Experts",
      summary: "Mistral popisuje sparse mixture-of-experts model 8x7B s GPT-3.5 výkonom za zlomok nákladov.",
    },
    instructgpt: {
      title: "InstructGPT: Training Language Models to Follow Instructions with Human Feedback",
      summary: "Článok za ChatGPT: RLHF, ktorý naučil GPT-3 plniť inštrukcie.",
    },
    constitutionalAi: {
      title: "Constitutional AI: Harmlessness from AI Feedback",
      summary: "Anthropic ukazuje RLAIF: AI hodnotí výstupy podľa písaného súboru princípov.",
    },
    dpo: {
      title: "Direct Preference Optimization",
      summary: "Tréning LLM podľa preferenčných párov bez explicitného reward modelu — jednoduchšie než RLHF.",
    },
    cot: {
      title: "Chain-of-Thought Prompting",
      summary: "Ukazuje, ako prompty s medzikrokmi úvah zlepšujú viackrokové uvažovanie LLM.",
    },
    react: {
      title: "ReAct: Synergizing Reasoning and Acting in Language Models",
      summary: "Klasický agentný vzor: jazykový model strieda kroky uvažovania a volania nástrojov.",
    },
    toolformer: {
      title: "Toolformer: Language Models Can Teach Themselves to Use Tools",
      summary: "Meta ukazuje, ako LLM samostatne získa schopnosť volať externé API.",
    },
    rag: {
      title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
      summary: "Pôvodný článok RAG: kombinácia retrieve + generate pre úlohy nad znalosťami.",
    },
  },
};

export default sk_content;
