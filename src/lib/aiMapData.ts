/**
 * Knowledge graph behind the AI Map page.
 *
 * The map is intentionally hand-curated (no DB dependency) so we can iterate
 * on the pedagogical narrative — short parables, "why it matters" hooks,
 * neighbours — without paying for a backend round-trip.
 *
 * Strings are kept inline in CS + EN. The locale is resolved at render time
 * from {@link useLocaleStore}; falling back to EN for `pl`/`sk` until proper
 * translations land. Centralising the data here also keeps the SVG rendering
 * code in `MapPage.tsx` free of content concerns.
 */
import type { Locales } from "@/i18n/i18n-types";

export type ConceptLevel = "domain" | "concept";

export interface Bilingual {
  cs: string;
  en: string;
}

export interface ConceptNode {
  /** Stable slug — used for routing, edges and as a React key. */
  id: string;
  /** Whether this is a top-level pillar (`domain`) or a sub-topic (`concept`). */
  level: ConceptLevel;
  /** Owning domain. For domains, this equals `id`. */
  domain: string;
  /** Display label. */
  label: Bilingual;
  /** One-liner shown under the label, plus on cards. */
  tagline: Bilingual;
  /** Longer "what is it" block, ideally with a metaphor / parable. */
  parable: Bilingual;
  /** "Why it matters" — practical relevance and 1–2 use cases. */
  whyItMatters: Bilingual;
  /** Optional further-reading nudges (titles/URLs). */
  references?: Array<{ label: string; url: string }>;
  /** Optional internal cross-references (other concept ids). */
  related?: string[];
}

export interface ConceptEdge {
  from: string;
  to: string;
  /** When true, the edge is a "cross-domain bridge" and is drawn dashed. */
  bridge?: boolean;
}

export function pickLocaleText(value: Bilingual, locale: Locales): string {
  if (locale === "cs") return value.cs;
  return value.en;
}

/* ------------------------------------------------------------------ */
/* Domains (top-level pillars, arranged on the outer ring)             */
/* ------------------------------------------------------------------ */

export const DOMAINS: ConceptNode[] = [
  {
    id: "ai-basics",
    level: "domain",
    domain: "ai-basics",
    label: { cs: "Základy AI", en: "AI Basics" },
    tagline: {
      cs: "Co vlastně znamená „umělá inteligence“.",
      en: "What we even mean by 'artificial intelligence'.",
    },
    parable: {
      cs: "Představte si AI jako rozsáhlou knihovnu trikóvých knih. Některé knihy jsou ručně psané pravidly (symbolická AI), jiné se učí ze zkušenosti (statistická AI). „Inteligence“ je schopnost najít a poskládat ty správné stránky pro daný úkol.",
      en: "Think of AI as a giant cookbook library. Some books are hand-written rules (symbolic AI); others learn from experience (statistical AI). 'Intelligence' is the knack of finding and combining the right pages for the task at hand.",
    },
    whyItMatters: {
      cs: "Bez tohohle základu se snadno chytíte do marketingových floskulí. Pomáhá rozlišit, kdy se hodí jednoduchý algoritmus a kdy LLM za miliony dolarů.",
      en: "Without this footing it's easy to fall for marketing hype. Helps you tell when a simple rule beats a million-dollar LLM.",
    },
  },
  {
    id: "machine-learning",
    level: "domain",
    domain: "machine-learning",
    label: { cs: "Strojové učení", en: "Machine Learning" },
    tagline: {
      cs: "Místo psaní pravidel — ukazovat příklady.",
      en: "Show examples instead of writing rules.",
    },
    parable: {
      cs: "Učíte psa povelu „sedni“. Místo dlouhého návodu mu prostě dáváte piškot vždy, když si sedne. Model je ten pes — odměna je „loss function“, povel jsou data.",
      en: "Teaching a dog to 'sit'. Instead of a manual you just hand over a treat when it sits. The model is the dog — the reward is the loss function, the command is the data.",
    },
    whyItMatters: {
      cs: "Pohánní téměř všechno moderní — od doporučovačů po detekci podvodů. Bez ML by AI byla jen velký if/else.",
      en: "Powers almost everything modern — recommendations, fraud detection, vision. Without ML, AI would be a giant if/else.",
    },
  },
  {
    id: "neural-networks",
    level: "domain",
    domain: "neural-networks",
    label: { cs: "Neuronové sítě", en: "Neural Networks" },
    tagline: {
      cs: "Vrstvená matematika inspirovaná mozkem.",
      en: "Layered math loosely inspired by the brain.",
    },
    parable: {
      cs: "Představte si tým auditorů. První čte čísla, druhý je sčítá do skupin, třetí dělá závěry. Každý jen jednoduchá práce — ale dohromady umějí překvapivě složité úsudky.",
      en: "Imagine a chain of auditors. The first reads raw numbers, the second groups them, the third draws conclusions. Each does something simple — together they reach surprisingly nuanced verdicts.",
    },
    whyItMatters: {
      cs: "Veškerý hluboký learning (vidění, řeč, jazyk) stojí na neuronkách. Pochopení vrstev pomáhá vědět, proč model selhává.",
      en: "All of deep learning (vision, speech, language) is built on neural nets. Understanding the layers tells you why a model fails.",
    },
  },
  {
    id: "generative-ai",
    level: "domain",
    domain: "generative-ai",
    label: { cs: "Generativní AI", en: "Generative AI" },
    tagline: {
      cs: "Modely, které tvoří — text, obraz, hudbu, kód.",
      en: "Models that create — text, image, audio, code.",
    },
    parable: {
      cs: "Klasifikátor je soudce („je to kočka, ano/ne?“). Generativní model je malíř („nakresli mi kočku“). Dva různé řemeslné cíle, ale často sdílí mozek.",
      en: "A classifier is a judge ('is this a cat, yes or no?'). A generative model is a painter ('draw me a cat'). Different crafts, often the same brain underneath.",
    },
    whyItMatters: {
      cs: "Co budí všechnu pozornost (a investice) od roku 2022. Posunulo se z „experimentu“ do běžných firemních produktů.",
      en: "The reason 2022+ AI exploded into the mainstream. Moved from research demo to everyday product feature.",
    },
  },
  {
    id: "llms",
    level: "domain",
    domain: "llms",
    label: { cs: "LLM", en: "LLMs" },
    tagline: {
      cs: "Velké jazykové modely — autopilot pro slova.",
      en: "Large language models — autopilot for words.",
    },
    parable: {
      cs: "LLM je nesmírně načtený student před ústní zkouškou. Umí pohotově odpovídat, někdy si však „dovymýšlí“ — sebevědomě, s úsměvem, ale špatně. Tomu říkáme halucinace.",
      en: "An LLM is a wildly well-read student facing an oral exam. Quick, confident answers — sometimes elegantly made up. That's what we call a hallucination.",
    },
    whyItMatters: {
      cs: "Jádro většiny dnešních AI produktů: copiloti, asistenti, RAG, agenti. Kdo chápe LLM, chápe stack.",
      en: "The core of most modern AI products: copilots, assistants, RAG, agents. Understand LLMs and you understand the stack.",
    },
  },
  {
    id: "rag",
    level: "domain",
    domain: "rag",
    label: { cs: "RAG", en: "RAG" },
    tagline: {
      cs: "Vyhledávání + LLM = odpovědi s důkazy.",
      en: "Retrieval + LLM = answers backed by sources.",
    },
    parable: {
      cs: "Místo aby student odpovídal z hlavy, otevře si tahák. RAG nejdřív najde relevantní stránky firemních dokumentů a teprve pak nechá LLM odpovědět — s citací.",
      en: "Instead of answering from memory, the student opens a cheat sheet. RAG first retrieves relevant document snippets, then lets the LLM answer — with citations.",
    },
    whyItMatters: {
      cs: "Nejjednodušší a nejlevnější způsob, jak LLM „naučit“ vaše interní data — bez fine-tuningu. Snižuje halucinace.",
      en: "The cheapest, fastest way to 'teach' an LLM your internal data — no fine-tuning needed. Cuts hallucinations.",
    },
  },
  {
    id: "agents",
    level: "domain",
    domain: "agents",
    label: { cs: "Agenti", en: "Agents" },
    tagline: {
      cs: "LLM s rukama — umí přemýšlet a jednat.",
      en: "LLMs with hands — they reason and act.",
    },
    parable: {
      cs: "Klasický chatbot je rádce. Agent je stážista, kterému řeknete „zařiď to“ — sám si rozdělí úkol, prohledá web, zavolá API, výsledek shrne.",
      en: "A chatbot is an advisor. An agent is an intern you tell 'just handle it' — it splits the task, browses the web, calls APIs, and reports back.",
    },
    whyItMatters: {
      cs: "Od jednoduché odpovědi k automatizaci celých workflow. Nejvíc růstu a nejvíc rizik na rok 2025+.",
      en: "From single replies to automating whole workflows. The biggest growth area — and the biggest risk surface — for 2025+.",
    },
  },
  {
    id: "evaluation",
    level: "domain",
    domain: "evaluation",
    label: { cs: "Vyhodnocování", en: "Evaluation" },
    tagline: {
      cs: "Jak vůbec poznáme, že model funguje?",
      en: "How do we know the model actually works?",
    },
    parable: {
      cs: "Tester v restauraci. Nejdřív zkouší předkrm, pak hlavní chod, pak dezert. Jeden „chutná“ není dost — potřebujete strukturovanou sadu chutí a opakovatelnou stupnici.",
      en: "A restaurant taster — starter, main, dessert. A single 'tastes nice' isn't enough; you need a structured flight and a repeatable scale.",
    },
    whyItMatters: {
      cs: "Bez evalů jsou releases ruleta. Eval je to, co odděluje hobby projekt od produkční AI.",
      en: "Without evals every release is a coin flip. Evals are what separate a hobby project from production AI.",
    },
  },
  {
    id: "ai-safety",
    level: "domain",
    domain: "ai-safety",
    label: { cs: "AI bezpečnost", en: "AI Safety" },
    tagline: {
      cs: "Aby model dělal, co chceme — a nic víc.",
      en: "Getting the model to do what we want — and no more.",
    },
    parable: {
      cs: "Dáte robotovi pokyn „udělej kafe“. Bezpečný robot ho udělá. Nebezpečný demoluje kuchyň, protože „udělat kafe“ chápal extrémně doslovně.",
      en: "Tell a robot 'make me coffee'. A safe one does. An unsafe one demolishes the kitchen because it took 'make coffee' too literally.",
    },
    whyItMatters: {
      cs: "Reputace, regulace (AI Act), a důvěra uživatelů stojí na tom, jak dobře umíme model krotit.",
      en: "Reputation, regulation (EU AI Act) and user trust all hinge on how well we can keep models in line.",
    },
  },
  {
    id: "business-use-cases",
    level: "domain",
    domain: "business-use-cases",
    label: { cs: "Byznys využití", en: "Business Use Cases" },
    tagline: {
      cs: "Kde AI vrací investice rychle.",
      en: "Where AI actually pays back fast.",
    },
    parable: {
      cs: "Stejný kladiv může zatlouct hřebík nebo rozbít palec. Použití AI v byznysu je o tom, najít hřebíky — nejlépe ty drahé.",
      en: "The same hammer can drive a nail or smash a thumb. Business AI is about finding the nails — ideally the expensive ones.",
    },
    whyItMatters: {
      cs: "Bez konkrétního use casu je celá AI strategie jen prezentace. Odsud začínáme měřit ROI.",
      en: "Without a concrete use case, an AI strategy is just a slide deck. This is where ROI starts being measured.",
    },
  },
];

/* ------------------------------------------------------------------ */
/* Concepts (children of each domain)                                  */
/* ------------------------------------------------------------------ */

export const CONCEPTS: ConceptNode[] = [
  /* ---- AI Basics ---- */
  {
    id: "symbolic-vs-statistical",
    level: "concept",
    domain: "ai-basics",
    label: { cs: "Symbolická vs. statistická AI", en: "Symbolic vs. statistical AI" },
    tagline: {
      cs: "Pravidla psaná člověkem versus vzorce naučené z dat.",
      en: "Rules written by humans vs. patterns learned from data.",
    },
    parable: {
      cs: "Symbolická AI je jako kuchařka („když je těsto lepkavé, přidej mouku“). Statistická je jako šéfkuchař, co se naučil intuici z 10 000 jídel.",
      en: "Symbolic AI is a recipe book ('if dough is sticky, add flour'). Statistical AI is a chef who learned intuition from 10,000 meals.",
    },
    whyItMatters: {
      cs: "Hodně dnešních systémů je hybrid — pravidlový plot kolem statistického modelu. Pomáhá vědět, kde se zdroj chyby může schovávat.",
      en: "Most modern systems are hybrids — rule fences around statistical models. Knowing the split helps locate bugs.",
    },
  },
  {
    id: "search-planning",
    level: "concept",
    domain: "ai-basics",
    label: { cs: "Vyhledávání a plánování", en: "Search & planning" },
    tagline: { cs: "Najít nejlepší cestu ze startu do cíle.", en: "Find the best path from start to goal." },
    parable: {
      cs: "Google Maps počítá, jak dojet z A do B. Stejný typ algoritmů hraje šachy nebo plánuje výrobu — stačí vyměnit „silnice“ za „tahy“ nebo „operace“.",
      en: "Google Maps computes A → B. The same algorithms play chess or schedule factories — just swap 'roads' for 'moves' or 'operations'.",
    },
    whyItMatters: {
      cs: "Pořád nejsilnější přístup, kde jde o garantovanou optimalitu (logistika, robotika).",
      en: "Still the strongest approach where guaranteed optimality matters (logistics, robotics).",
    },
  },
  {
    id: "optimization",
    level: "concept",
    domain: "ai-basics",
    label: { cs: "Optimalizace", en: "Optimization" },
    tagline: { cs: "Najít minimum / maximum funkce.", en: "Find the min / max of a function." },
    parable: {
      cs: "Hledáte nejhlubší jezírko v krajině. Jdete krok po kroku po svahu dolů. Tomu se říká gradient descent.",
      en: "You're looking for the deepest pond in a landscape. You walk downhill step by step. That's gradient descent.",
    },
    whyItMatters: {
      cs: "Trénink každého ML modelu = optimalizační úloha. Bez tohohle nepochopíte, proč to celé funguje.",
      en: "Training any ML model = an optimization problem. Without it none of the rest makes sense.",
    },
  },

  /* ---- Machine Learning ---- */
  {
    id: "supervised-learning",
    level: "concept",
    domain: "machine-learning",
    label: { cs: "Supervised learning", en: "Supervised learning" },
    tagline: { cs: "Učení z dvojic vstup → správná odpověď.", en: "Learning from labeled (input → answer) pairs." },
    parable: {
      cs: "Učitel s rudým perem opravuje žákovi diktát. Po pár tisíci diktátech žák začne psát skoro bezchybně.",
      en: "A teacher with a red pen corrects a student's dictation. After thousands of dictations the student is near-perfect.",
    },
    whyItMatters: {
      cs: "Nejčastější nasazení v praxi: klasifikace e-mailů, predikce churnu, OCR.",
      en: "The most common deployment in practice: email classification, churn prediction, OCR.",
    },
  },
  {
    id: "unsupervised-learning",
    level: "concept",
    domain: "machine-learning",
    label: { cs: "Unsupervised learning", en: "Unsupervised learning" },
    tagline: { cs: "Najít strukturu bez správné odpovědi.", en: "Find structure without correct answers." },
    parable: {
      cs: "Vysypete hromadu legendárních kostek na koberec a kategorizujete je sami podle barvy a tvaru. Žádný učitel — jen vy a vzory.",
      en: "Dump a heap of LEGO on the floor and sort it yourself by colour and shape. No teacher — just you and patterns.",
    },
    whyItMatters: {
      cs: "Segmentace zákazníků, anomálie, embeddingy — všechno postavené na učení bez labelů.",
      en: "Customer segmentation, anomaly detection, embeddings — all built on label-free learning.",
    },
  },
  {
    id: "reinforcement-learning",
    level: "concept",
    domain: "machine-learning",
    label: { cs: "Reinforcement learning", en: "Reinforcement learning" },
    tagline: { cs: "Učení odměnami a tresty.", en: "Learning by reward and punishment." },
    parable: {
      cs: "Dítě se učí jezdit na kole — spadne, vstane, zkusí to znovu, jednou pojede. Odměna = jízda, trest = bolest.",
      en: "A kid learning to ride a bike — fall, get up, try again, eventually you ride. Reward = riding, penalty = pain.",
    },
    whyItMatters: {
      cs: "Mozkem AlphaGo, robotiky a postupně i fine-tuningu LLM (RLHF).",
      en: "The brain behind AlphaGo, robotics and increasingly LLM fine-tuning (RLHF).",
    },
  },
  {
    id: "gradient-descent",
    level: "concept",
    domain: "machine-learning",
    label: { cs: "Gradient descent", en: "Gradient descent" },
    tagline: { cs: "Iterativní sestup po svahu chyby.", en: "Walking downhill on the error landscape." },
    parable: {
      cs: "V mlze nevidíte vrchol kopce, ale cítíte sklon pod nohama. Tak prostě jdete dolů. Po pár hodinách jste v údolí.",
      en: "In fog you can't see the summit, but you can feel the slope under your feet. You just keep walking down. Eventually you reach the valley.",
    },
    whyItMatters: {
      cs: "Algoritmus, který trénuje prakticky všechno — od regrese po GPT.",
      en: "The algorithm training basically everything — from linear regression to GPT.",
    },
  },
  {
    id: "overfitting",
    level: "concept",
    domain: "machine-learning",
    label: { cs: "Overfitting", en: "Overfitting" },
    tagline: { cs: "Model umí trénink nazpaměť, na novém selže.", en: "Memorising the training set, failing on new data." },
    parable: {
      cs: "Student, který se naučil naprostou doslovnou znalost testu z minulého roku. U letošního testu narazí na trochu jinou otázku a propadne.",
      en: "A student who memorised last year's exam verbatim — and fails this year because the questions changed slightly.",
    },
    whyItMatters: {
      cs: "Důvod, proč máme train / val / test splity. Bez toho je každý report na model lží.",
      en: "Why we have train/val/test splits. Without them, every model report is essentially a lie.",
    },
  },

  /* ---- Neural Networks ---- */
  {
    id: "artificial-neuron",
    level: "concept",
    domain: "neural-networks",
    label: { cs: "Umělý neuron", en: "Artificial neuron" },
    tagline: { cs: "Vážený součet + aktivace.", en: "Weighted sum + activation." },
    parable: {
      cs: "Komise hlasuje. Každý člen má jiný vliv (váhu). Sečteme hlasy, zaokrouhlíme „ano/ne“. To je neuron.",
      en: "A weighted committee vote. Each member has different sway (weight). Sum the votes, threshold to yes/no. That's one neuron.",
    },
    whyItMatters: {
      cs: "Atomová jednotka všech deep learning modelů. Stovky miliard takových komisí dají GPT.",
      en: "The atomic unit of every deep learning model. Hundreds of billions of those committees = GPT.",
    },
  },
  {
    id: "relu",
    level: "concept",
    domain: "neural-networks",
    label: { cs: "ReLU a aktivační funkce", en: "ReLU & activation functions" },
    tagline: { cs: "Co dělá síť nelineární.", en: "What makes a net non-linear." },
    parable: {
      cs: "Aktivace je vrátný — záporné nápady neprojdou, kladné jdou dál v původní velikosti. Jednoduchá pravidla, mocné důsledky.",
      en: "An activation is a bouncer — negatives don't pass, positives go through at full size. Tiny rule, huge consequence.",
    },
    whyItMatters: {
      cs: "Bez aktivace by celá hluboká síť kolabovala v jednu lineární operaci.",
      en: "Without activations a deep net collapses into a single linear operation.",
    },
  },
  {
    id: "backpropagation",
    level: "concept",
    domain: "neural-networks",
    label: { cs: "Backpropagation", en: "Backpropagation" },
    tagline: { cs: "Jak síť ví, které váhy upravit.", en: "How a net knows which weights to nudge." },
    parable: {
      cs: "Vyšetřování po havárii. Jdete od následku ke každému článku řetězu a ptáte se: „kolik z chyby jsi způsobil ty?“ Poté upravíte odpovědně.",
      en: "A post-incident review. You walk backward from the outcome through every step, asking 'how much of this was your fault?' Then you adjust accordingly.",
    },
    whyItMatters: {
      cs: "Algoritmus, díky kterému deep learning vůbec funguje. Před ním jsme uměli trénovat jen mělké sítě.",
      en: "The algorithm that makes deep learning possible. Before it we could only train shallow nets.",
    },
  },
  {
    id: "deep-learning",
    level: "concept",
    domain: "neural-networks",
    label: { cs: "Hluboké učení", en: "Deep learning" },
    tagline: { cs: "Hodně vrstev, hodně dat, hodně GPU.", en: "Many layers, much data, lots of GPUs." },
    parable: {
      cs: "Mistr je řemeslník, který má v hlavě 200 vrstev intuice. Než se z nováčka stane mistr, musí projít stovkami tisíc opakování — to jsou trénovací data.",
      en: "A master craftsman with 200 layers of intuition. Going from novice to master takes hundreds of thousands of repetitions — those are training samples.",
    },
    whyItMatters: {
      cs: "Pod kapotou všeho moderního: vidění, rozpoznávání řeči, jazyk.",
      en: "Under the hood of everything modern: vision, speech, language.",
    },
  },

  /* ---- Generative AI ---- */
  {
    id: "transformer",
    level: "concept",
    domain: "generative-ai",
    label: { cs: "Transformer", en: "Transformer" },
    tagline: { cs: "Architektura, která spustila celou éru.", en: "The architecture that lit the fuse on the modern era." },
    parable: {
      cs: "Místo aby model četl text slovo po slovu jako kniha (RNN), dívá se na celou stránku najednou a sám zvýrazňuje, co je důležité (attention).",
      en: "Instead of reading text word by word like a book (RNN), the model looks at the whole page at once and highlights what matters (attention).",
    },
    whyItMatters: {
      cs: "Základ GPT, Claude, Llama, BERT, Diffusion. Vědět, co je transformer, je dnes základ digitální gramotnosti.",
      en: "Foundation of GPT, Claude, Llama, BERT, diffusion. Knowing what a Transformer is is basic AI literacy.",
    },
    references: [
      { label: "Attention Is All You Need (2017)", url: "https://arxiv.org/abs/1706.03762" },
    ],
  },
  {
    id: "attention",
    level: "concept",
    domain: "generative-ai",
    label: { cs: "Attention", en: "Attention" },
    tagline: { cs: "Kde se má model dívat.", en: "Where the model should look." },
    parable: {
      cs: "Když překládáte větu, oči vám neskáčou rovnoměrně — soustředíte se na podstatná slova. Attention je matematický „reflektor“ pro každé další slovo.",
      en: "When you translate a sentence, your eyes don't move uniformly — you focus on key words. Attention is the math 'spotlight' the model points at each next word.",
    },
    whyItMatters: {
      cs: "Jeden mechanismus, který funguje na textu, obraze, audiu i kódu. Univerzální klíč.",
      en: "A single mechanism that works on text, images, audio and code. The universal key.",
    },
  },
  {
    id: "diffusion-models",
    level: "concept",
    domain: "generative-ai",
    label: { cs: "Diffusion modely", en: "Diffusion models" },
    tagline: { cs: "Z čistého šumu k obrázku, krok po kroku.", en: "From pure noise to image, step by step." },
    parable: {
      cs: "Restaurátor olejomalby. Začíná u zničeného plátna plného skvrn a postupnými tahy zpod prachu „vytahuje“ původní obraz. Model dělá totéž — jen na šum.",
      en: "An art restorer. They start from a noise-ravaged canvas and step by step coax the original painting out from under the dust. The model does the same with random noise.",
    },
    whyItMatters: {
      cs: "Stojí za DALL·E, Stable Diffusion, Midjourney. Hodí se i mimo obrázky (audio, molekuly).",
      en: "Behind DALL·E, Stable Diffusion, Midjourney. Also used outside images (audio, molecules).",
    },
  },
  {
    id: "gan",
    level: "concept",
    domain: "generative-ai",
    label: { cs: "GAN", en: "GAN" },
    tagline: { cs: "Falzifikátor proti detektivovi.", en: "A forger vs. a detective." },
    parable: {
      cs: "Padělatel maluje obrazy, znalec se snaží odhalit, které jsou falešné. Oba se zlepšují, dokud nejsou padělky nerozeznatelné od originálu.",
      en: "A forger paints, a critic spots fakes. Both improve until the forgeries are indistinguishable from the real thing.",
    },
    whyItMatters: {
      cs: "První vlna fotorealistických deepfaků; dodnes se používá u úzkých domén jako tváře nebo styly.",
      en: "The first wave of photorealistic deepfakes; still used in narrow domains like faces and style transfer.",
    },
  },

  /* ---- LLMs ---- */
  {
    id: "tokenization",
    level: "concept",
    domain: "llms",
    label: { cs: "Tokenizace", en: "Tokenization" },
    tagline: { cs: "Jak model „vidí“ text.", en: "How the model 'sees' text." },
    parable: {
      cs: "Model nečte písmena ani slova — čte tokeny, něco mezi tím. Slovo „strojové“ se může rozpadnout na „stro-jo-vé“. Jeho slovník má desítky tisíc takových kousků.",
      en: "The model doesn't read letters or words — it reads tokens, something in between. 'unbelievable' might split as 'un-believ-able'. Its vocab has tens of thousands of such pieces.",
    },
    whyItMatters: {
      cs: "Vysvětluje, proč LLM počítá špatně slova „strawberry“ a proč jsou ceny účtované „za token“.",
      en: "Explains why LLMs miscount letters in 'strawberry' and why pricing is 'per token'.",
    },
  },
  {
    id: "embeddings",
    level: "concept",
    domain: "llms",
    label: { cs: "Embeddingy", en: "Embeddings" },
    tagline: { cs: "Slova jako body ve vesmíru významů.", en: "Words as points in a meaning-space." },
    parable: {
      cs: "Představte si mapu, kde „pes“ a „kočka“ stojí blízko sebe a obě daleko od „šroubováku“. Vzdálenost = významová podobnost.",
      en: "Picture a map where 'dog' and 'cat' sit close, both far from 'screwdriver'. Distance = semantic similarity.",
    },
    whyItMatters: {
      cs: "Pohánní vyhledávání v RAG, doporučení, klasifikace. Universal currency moderního NLP.",
      en: "Powers RAG retrieval, recommendations, classification. The universal currency of modern NLP.",
    },
    related: ["vector-database"],
  },
  {
    id: "pretraining",
    level: "concept",
    domain: "llms",
    label: { cs: "Pre-training", en: "Pre-training" },
    tagline: { cs: "Měsíce čtení internetu zaplaceného GPU.", en: "Months of GPU-funded internet reading." },
    parable: {
      cs: "Než dítě začne mluvit smysluplně, dva roky jen poslouchá. Pre-training je tahle „dva roky“ fáze — jen za miliony dolarů a v rychlosti světla.",
      en: "Before a child speaks meaningfully it spends two years just listening. Pre-training is that 'two years' phase — at million-dollar scale and warp speed.",
    },
    whyItMatters: {
      cs: "Tvoří „znalost světa“ modelu. Drtivá většina firem nikdy nedělá — kupují přístup k hotovému.",
      en: "Builds the model's 'knowledge of the world'. Almost no company does this from scratch — they consume the result.",
    },
  },
  {
    id: "fine-tuning",
    level: "concept",
    domain: "llms",
    label: { cs: "Fine-tuning", en: "Fine-tuning" },
    tagline: { cs: "Přizpůsobení hotového modelu vašemu úkolu.", en: "Adapting a pre-trained model to your task." },
    parable: {
      cs: "Univerzitního absolventa pošlete na třídenní školení o vašem produktu. Nemění se mu osobnost, jen tón a doménové znalosti.",
      en: "Sending a university grad to a three-day onboarding for your product. Personality stays, tone and domain knowledge update.",
    },
    whyItMatters: {
      cs: "Kde RAG nestačí (styl, formát, brand) — laďujte. Levnější než pre-training, dražší než prompt engineering.",
      en: "Where RAG can't reach (style, format, brand) — fine-tune. Cheaper than pre-training, costlier than prompting.",
    },
  },
  {
    id: "rlhf",
    level: "concept",
    domain: "llms",
    label: { cs: "RLHF / DPO", en: "RLHF / DPO" },
    tagline: { cs: "Učení preferencí od lidí.", en: "Teaching the model human preferences." },
    parable: {
      cs: "Šéfkuchař zkouší dvě verze polévky, ochutnávač řekne která lépe chutná. Model se z tisíců takových porovnání naučí, co lidé preferují.",
      en: "A chef plates two soups, a taster picks the better one. After thousands of such pairs, the model learns what humans prefer.",
    },
    whyItMatters: {
      cs: "Co dělá z „dokončovače textu“ skutečného „chat asistenta“. Bez něj by raw GPT byl skoro nepoužitelný.",
      en: "Turns a raw text completer into a real chat assistant. Without it, base GPT would be nearly unusable.",
    },
  },
  {
    id: "hallucinations",
    level: "concept",
    domain: "llms",
    label: { cs: "Halucinace", en: "Hallucinations" },
    tagline: { cs: "Sebevědomé výmysly modelu.", en: "Confidently wrong outputs." },
    parable: {
      cs: "Studentem, který nikdy neřekne „nevím“. Místo přiznání mezery improvizuje s naprostou jistotou. Někdy trefí, často ne.",
      en: "A student who never says 'I don't know'. Instead they confidently make something up. Sometimes right, often not.",
    },
    whyItMatters: {
      cs: "Hlavní důvod, proč musíme LLM kombinovat s RAG, evaly a guardrails. Bez toho je nasazení riziko.",
      en: "The single biggest reason we pair LLMs with RAG, evals and guardrails. Without those, shipping is reckless.",
    },
  },

  /* ---- RAG ---- */
  {
    id: "vector-database",
    level: "concept",
    domain: "rag",
    label: { cs: "Vektorová databáze", en: "Vector database" },
    tagline: { cs: "Vyhledávání podle významu, ne podle slov.", en: "Search by meaning, not by keywords." },
    parable: {
      cs: "Klasická DB hledá přesné slovo. Vektorová DB hledá „přátele s podobným srdcem“ — najde dokument, i když používá úplně jiné fráze, ale stejný význam.",
      en: "A normal DB matches exact words. A vector DB matches 'friends with similar hearts' — it finds a document even when the wording is totally different but the meaning is the same.",
    },
    whyItMatters: {
      cs: "Páteř každé RAG aplikace. Bez ní by retrieval byl jako Ctrl+F v PDF.",
      en: "The backbone of every RAG app. Without it retrieval is just Ctrl+F in a PDF.",
    },
  },
  {
    id: "chunking",
    level: "concept",
    domain: "rag",
    label: { cs: "Chunking", en: "Chunking" },
    tagline: { cs: "Rozsekání dokumentů na kousky, které dávají smysl.", en: "Splitting documents into pieces that stand alone." },
    parable: {
      cs: "Krájíte knihu na kapitoly, ne na věty. Příliš malé kousky ztratí kontext, příliš velké se nevejdou do modelu.",
      en: "You slice a book into chapters, not single sentences. Too small loses context; too big overflows the model.",
    },
    whyItMatters: {
      cs: "Špatný chunking = mizerné RAG odpovědi, i s nejdražším modelem.",
      en: "Bad chunking = poor RAG answers, even with the priciest model.",
    },
  },
  {
    id: "reranking",
    level: "concept",
    domain: "rag",
    label: { cs: "Reranking", en: "Reranking" },
    tagline: { cs: "Druhé kolo, kde se vyberou ty fakt nejlepší.", en: "A second round that picks the truly best matches." },
    parable: {
      cs: "Náborář prošel CV podle klíčových slov a pozval 10 lidí. Reranker je následný pohovor, který z 10 vybere 3 nejlepší.",
      en: "A recruiter screens CVs by keywords and invites 10 people. Reranking is the follow-up interview that picks the top 3.",
    },
    whyItMatters: {
      cs: "Drobná investice, výrazné zlepšení kvality RAG odpovědí.",
      en: "Small investment, big quality jump on RAG answers.",
    },
  },
  {
    id: "context-window",
    level: "concept",
    domain: "rag",
    label: { cs: "Context window", en: "Context window" },
    tagline: { cs: "Kolik tokenů model „vidí“ najednou.", en: "How many tokens the model can see at once." },
    parable: {
      cs: "Krátkodobá paměť modelu. Co se do ní nevejde, prostě neexistuje. Velký window = víc nacpat, ale taky víc zaplatit.",
      en: "The model's short-term memory. What doesn't fit doesn't exist. Bigger window = more crammed in, but also more $$.",
    },
    whyItMatters: {
      cs: "Klíčový limit, kolem kterého se točí celá architektura RAG i agentů.",
      en: "The hard limit around which both RAG and agent architectures revolve.",
    },
  },

  /* ---- Agents ---- */
  {
    id: "tool-use",
    level: "concept",
    domain: "agents",
    label: { cs: "Tool use", en: "Tool use" },
    tagline: { cs: "Model volá API, kalkulačku, vyhledávač.", en: "The model calls APIs, calculators, search engines." },
    parable: {
      cs: "Asistent, který si umí říct: „tohle nepočítám z hlavy, otevřu Excel“. Model si vybere nástroj a my mu jen ukážeme menu.",
      en: "An assistant who says 'I won't do this in my head, let me open Excel'. The model picks the tool; we just provide the menu.",
    },
    whyItMatters: {
      cs: "Jednoduchý posun s obrovským dopadem. Z chatbota se najednou stane „digitální stážista“.",
      en: "A simple shift with huge impact. Suddenly the chatbot becomes a 'digital intern'.",
    },
  },
  {
    id: "react-pattern",
    level: "concept",
    domain: "agents",
    label: { cs: "ReAct pattern", en: "ReAct pattern" },
    tagline: { cs: "Smyčka Reason → Act → Observe.", en: "A Reason → Act → Observe loop." },
    parable: {
      cs: "Detektiv: přemýšlí, prohledá místnost, najde stopu, znovu přemýšlí. Stejnou smyčku dělá agent — jen rychleji a v terminálu.",
      en: "A detective thinks, searches the room, finds a clue, thinks again. The agent runs the same loop — just faster and in a terminal.",
    },
    whyItMatters: {
      cs: "Pravděpodobně nejjednodušší recept, jak postavit pracujícího agenta. Skvělý startovní bod.",
      en: "Probably the simplest recipe for a working agent. Great starting point.",
    },
  },
  {
    id: "agent-memory",
    level: "concept",
    domain: "agents",
    label: { cs: "Paměť agenta", en: "Agent memory" },
    tagline: { cs: "Jak si pamatovat, co se stalo včera.", en: "How to remember what happened yesterday." },
    parable: {
      cs: "Notes, deník, vektorová DB — všechno jsou „protézy paměti“ pro model bez vlastní krátkodobé paměti.",
      en: "Notes, a journal, a vector DB — all 'memory prosthetics' for a model that has none on its own.",
    },
    whyItMatters: {
      cs: "Bez paměti je agent rybička v akváriu. S pamětí umí navazovat na minulé úkoly.",
      en: "Without memory an agent is a goldfish. With memory it can build on yesterday's work.",
    },
  },
  {
    id: "multi-agent",
    level: "concept",
    domain: "agents",
    label: { cs: "Multi-agent systémy", en: "Multi-agent systems" },
    tagline: { cs: "Tým agentů místo jednoho hrdiny.", en: "A team of agents instead of a lone hero." },
    parable: {
      cs: "Redakce — někdo píše, někdo edituje, někdo dělá fakta. Každý má jinou roli, dohromady vznikne článek.",
      en: "A newsroom — writer, editor, fact-checker. Different roles, one article at the end.",
    },
    whyItMatters: {
      cs: "Často jediná cesta, jak rozumně škálovat komplexní úkoly bez „mega-promptu“.",
      en: "Often the only sane way to scale complex tasks without a 'mega prompt'.",
    },
  },

  /* ---- Evaluation ---- */
  {
    id: "benchmarks",
    level: "concept",
    domain: "evaluation",
    label: { cs: "Benchmarky", en: "Benchmarks" },
    tagline: { cs: "Standardizované testy modelů.", en: "Standardised model exams." },
    parable: {
      cs: "Maturita pro AI. Každý model dělá stejné otázky a my srovnáváme známky. Pozor — známka z maturity neznamená, že umí dělat vaši práci.",
      en: "An A-level exam for AI. Every model gets the same questions; we compare grades. Beware — top marks don't mean the model can do your job.",
    },
    whyItMatters: {
      cs: "Rychlá orientace v krajině modelů, ale nikdy nenahradí evals na vašich datech.",
      en: "Fast orientation in the model landscape — but never replaces evals on your own data.",
    },
  },
  {
    id: "llm-as-judge",
    level: "concept",
    domain: "evaluation",
    label: { cs: "LLM jako soudce", en: "LLM-as-judge" },
    tagline: { cs: "Necháme jeden LLM ohodnotit výstup druhého.", en: "Letting one LLM grade another's output." },
    parable: {
      cs: "Dva chéfové ochutnávají třetímu jeho jídlo a hodnotí. Levnější než zaplatit Michelin inspektora, ne tak spolehlivé.",
      en: "Two chefs taste a third chef's plate and score it. Cheaper than hiring a Michelin inspector, less reliable.",
    },
    whyItMatters: {
      cs: "Šíleně užitečné pro škálování. Ale: hlídejte si systematické bias, jinak si naprogramujete „LLM ozvěnu“.",
      en: "Wildly useful for scale. But: watch for systematic bias, otherwise you're programming an 'LLM echo'.",
    },
  },
  {
    id: "eval-sets",
    level: "concept",
    domain: "evaluation",
    label: { cs: "Eval sety", en: "Eval sets" },
    tagline: { cs: "Vlastní sada otázek, kde víte správnou odpověď.", en: "Your own question set with known answers." },
    parable: {
      cs: "Test, který si píšete sami pro své studenty. Měříte přesně to, na čem vám záleží — žádné generické otázky o hlavních městech.",
      en: "A test you write yourself for your students. You measure exactly what you care about — no generic capital-of-France trivia.",
    },
    whyItMatters: {
      cs: "Bez vlastní eval sady neumíte říct, jestli nový model je lepší pro vás. Jediná cesta k disciplinovanému releasi.",
      en: "Without your own eval set you can't tell whether a new model is better for you. The only path to disciplined release cycles.",
    },
  },
  {
    id: "ab-testing",
    level: "concept",
    domain: "evaluation",
    label: { cs: "A/B testování", en: "A/B testing" },
    tagline: { cs: "Online verdikt od reálných uživatelů.", en: "Live verdict from real users." },
    parable: {
      cs: "Polovina restaurace dostane nový recept, polovina starý. Po týdnu se podíváte, kdo přišel znovu.",
      en: "Half the restaurant gets the new recipe, half the old. A week later you check who came back.",
    },
    whyItMatters: {
      cs: "Jediný způsob, jak měřit AI dopad „v terénu“ — protože offline evaly nikdy nereplikují všechno.",
      en: "The only way to measure AI impact 'in the wild' — because offline evals never replicate everything.",
    },
  },

  /* ---- AI Safety ---- */
  {
    id: "alignment",
    level: "concept",
    domain: "ai-safety",
    label: { cs: "Alignment", en: "Alignment" },
    tagline: { cs: "Model dělá to, co opravdu chceme.", en: "Model doing what we actually want." },
    parable: {
      cs: "Džin, který plní přání doslovně. Když mu řeknete „učiň mě šťastným“, může vám vstříknout dopamin přímo do mozku. To rozhodně nechcete.",
      en: "A genie that grants wishes literally. Ask it to 'make me happy' and you might end up wired to a dopamine drip. Probably not what you meant.",
    },
    whyItMatters: {
      cs: "Roste s mocí modelů — čím lépe umějí jednat, tím dražší jsou jejich nedorozumění.",
      en: "Stakes rise with model capability — the better they act, the costlier their misunderstandings.",
    },
  },
  {
    id: "red-teaming",
    level: "concept",
    domain: "ai-safety",
    label: { cs: "Red teaming", en: "Red teaming" },
    tagline: { cs: "Cílená snaha model přimět dělat hlouposti.", en: "Deliberately trying to make the model misbehave." },
    parable: {
      cs: "Penetrační test. Najmete „hackera“, který se model snaží zlomit dřív, než to udělají zákazníci nebo novináři.",
      en: "A penetration test. You hire a 'hacker' to break the model before customers or journalists do.",
    },
    whyItMatters: {
      cs: "Levnější chyba se najde interně, než vyletí do médií. Povinný krok před prod nasazením.",
      en: "Cheaper to find the bug internally than in the news. A mandatory step before production rollout.",
    },
  },
  {
    id: "bias-fairness",
    level: "concept",
    domain: "ai-safety",
    label: { cs: "Bias a fairness", en: "Bias & fairness" },
    tagline: { cs: "Když model zdědí předsudky z dat.", en: "When the model inherits prejudice from its data." },
    parable: {
      cs: "Učitel, který viděl jen jednu školu, automaticky předpokládá, že tak vypadá svět. Model dělá totéž s tréninkovým datasetem.",
      en: "A teacher who only ever saw one school assumes the whole world looks like that. The model does the same with its training data.",
    },
    whyItMatters: {
      cs: "Právní (AI Act) a etický problém. Měřitelný — a tedy řešitelný — ale jen když ho nezametete pod stůl.",
      en: "A legal (EU AI Act) and ethical problem. Measurable — and therefore solvable — but only if you don't bury it.",
    },
  },
  {
    id: "privacy",
    level: "concept",
    domain: "ai-safety",
    label: { cs: "Privacy", en: "Privacy" },
    tagline: { cs: "Co se s daty stane, když jdou do modelu.", en: "What happens to data once it enters a model." },
    parable: {
      cs: "Když pošlete papír do skartovačky, je pryč. Když ho pošlete do LLM, nevíte, jestli si ho někdo nezapamatoval. Velký rozdíl.",
      en: "Shred a document and it's gone. Send it to an LLM and you don't know whether someone took notes. Big difference.",
    },
    whyItMatters: {
      cs: "Klíčové pro firemní nasazení (GDPR, smluvní povinnosti). Často určuje, jaký provider vůbec lze zvolit.",
      en: "Critical for enterprise use (GDPR, contractual duties). Often dictates which provider is even an option.",
    },
  },

  /* ---- Business Use Cases ---- */
  {
    id: "customer-support",
    level: "concept",
    domain: "business-use-cases",
    label: { cs: "Zákaznická podpora", en: "Customer support" },
    tagline: { cs: "Chatbot / asistent na první linii.", en: "Chatbot / assistant on the front line." },
    parable: {
      cs: "Operátor, který nikdy nespí, umí 30 jazyků a v půl třetí ráno zná všechny stránky vašeho helpdesku zpaměti.",
      en: "An operator that never sleeps, speaks 30 languages, and at 2:30 AM remembers every page of your help-desk.",
    },
    whyItMatters: {
      cs: "Nejčastější první AI use case ve firmách — krátká cesta k měřitelnému dopadu.",
      en: "The most common 'first AI use case' in companies — a short path to measurable impact.",
    },
  },
  {
    id: "doc-search",
    level: "concept",
    domain: "business-use-cases",
    label: { cs: "Vyhledávání ve firemních datech", en: "Internal document search" },
    tagline: { cs: "Google nad vaší Confluence / SharePointem.", en: "Google over your own Confluence / SharePoint." },
    parable: {
      cs: "Knihovník, který přečetl všechny vaše interní dokumenty a v 5 vteřinách vám podá tu jednu stránku, co potřebujete — i s odkazem.",
      en: "A librarian who has read every internal doc and can hand you the exact page you need in five seconds — with a link.",
    },
    whyItMatters: {
      cs: "Vysoký ROI, malá technická náročnost (RAG). Často nejlepší pilotní projekt.",
      en: "High ROI, low technical complexity (RAG). Often the best pilot project.",
    },
  },
  {
    id: "coding-assistants",
    level: "concept",
    domain: "business-use-cases",
    label: { cs: "Asistenti pro vývojáře", en: "Coding assistants" },
    tagline: { cs: "Copilot, Cursor, Claude Code.", en: "Copilot, Cursor, Claude Code." },
    parable: {
      cs: "Junior developer u vašeho stolu, který umí celý stack a píše 10× rychleji, ale občas potřebuje review.",
      en: "A junior dev at your desk who knows the whole stack and types 10× faster — but still needs review.",
    },
    whyItMatters: {
      cs: "Měřitelné zrychlení (15–55 % podle studií). Dnes spíš nutnost než výhoda.",
      en: "Measurable speedup (15–55 % depending on study). These days it's table stakes, not differentiation.",
    },
  },
  {
    id: "content-generation",
    level: "concept",
    domain: "business-use-cases",
    label: { cs: "Generování obsahu", en: "Content generation" },
    tagline: { cs: "Marketing, dokumentace, lokalizace.", en: "Marketing, documentation, localisation." },
    parable: {
      cs: "Tým copywriterů, kterému diktujete brief — a oni vám do hodiny vrátí 50 variant. Vy z nich vyberete jednu.",
      en: "A copy team that takes a brief and returns 50 variants in an hour. You pick one.",
    },
    whyItMatters: {
      cs: "Posouvá poměr „čas na produkt vs. čas na obsah“ — najednou je obsah skoro zdarma.",
      en: "Shifts the 'time on product vs. time on content' ratio — suddenly content is nearly free.",
    },
  },
  {
    id: "decision-support",
    level: "concept",
    domain: "business-use-cases",
    label: { cs: "Podpora rozhodování", en: "Decision support" },
    tagline: { cs: "Briefy, srovnání, doporučení pro manažery.", en: "Briefs, comparisons, recommendations for managers." },
    parable: {
      cs: "Analytik, který přečte 200 stránek reportů a do oběda vám napíše 1stránkový brief s odkazy. Není to jeho rozhodnutí — ale dobrý brief.",
      en: "An analyst who reads 200 pages of reports and hands you a one-pager with citations before lunch. Not the decision — but a great brief.",
    },
    whyItMatters: {
      cs: "Pomalá, ale vysoká hodnota. Často skrytý důvod, proč management AI vůbec financuje.",
      en: "Slow burn, high value. Often the hidden reason management funds AI in the first place.",
    },
  },
];

/* ------------------------------------------------------------------ */
/* Cross-domain bridges (curved dashed lines on the main map)          */
/* ------------------------------------------------------------------ */

export const DOMAIN_BRIDGES: ConceptEdge[] = [
  { from: "ai-basics", to: "machine-learning" },
  { from: "machine-learning", to: "neural-networks" },
  { from: "neural-networks", to: "generative-ai" },
  { from: "generative-ai", to: "llms" },
  { from: "llms", to: "rag", bridge: true },
  { from: "llms", to: "agents", bridge: true },
  { from: "rag", to: "agents", bridge: true },
  { from: "agents", to: "ai-safety", bridge: true },
  { from: "llms", to: "ai-safety", bridge: true },
  { from: "evaluation", to: "llms", bridge: true },
  { from: "evaluation", to: "machine-learning", bridge: true },
  { from: "business-use-cases", to: "llms", bridge: true },
  { from: "business-use-cases", to: "rag", bridge: true },
  { from: "business-use-cases", to: "agents", bridge: true },
];

/* ------------------------------------------------------------------ */
/* Lookups                                                              */
/* ------------------------------------------------------------------ */

export const ALL_NODES: ConceptNode[] = [...DOMAINS, ...CONCEPTS];

const NODES_BY_ID = new Map(ALL_NODES.map((n) => [n.id, n]));

export function getNode(id: string): ConceptNode | undefined {
  return NODES_BY_ID.get(id);
}

export function conceptsForDomain(domainId: string): ConceptNode[] {
  return CONCEPTS.filter((c) => c.domain === domainId);
}

/** Domain id → display colour token. Order matches DOMAINS. */
export const DOMAIN_COLORS: Record<string, string> = {
  "ai-basics": "hsl(212 100% 60%)",
  "machine-learning": "hsl(265 70% 62%)",
  "neural-networks": "hsl(195 78% 50%)",
  "generative-ai": "hsl(335 80% 60%)",
  llms: "hsl(22 97% 61%)",
  rag: "hsl(155 60% 45%)",
  agents: "hsl(45 95% 55%)",
  evaluation: "hsl(285 65% 60%)",
  "ai-safety": "hsl(4 80% 60%)",
  "business-use-cases": "hsl(132 49% 47%)",
};
