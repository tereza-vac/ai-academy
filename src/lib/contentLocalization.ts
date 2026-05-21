import { baseLocale, loadedLocales } from "@/i18n/i18n-util";
import { useLocaleStore } from "@/stores/localeStore";
import type {
  BuildLabItem,
  Question,
  Quiz,
  Resource,
  Topic,
  Track,
} from "@/types/domain";

/**
 * Resolve a data-owned translation key through the loaded typesafe-i18n
 * dictionaries. This mirrors Priprava's Reo model: rows store keys, dictionaries
 * store localized strings, and runtime code resolves the key for the active
 * locale with fallback to the base locale.
 */
export function translateContentKey(
  key: string | null | undefined,
  fallback: string | null | undefined,
  locale = useLocaleStore.getState().locale,
): string | null {
  if (!key) return fallback ?? null;

  const localized = readPath(loadedLocales[locale], key);
  if (typeof localized === "string") return localized;

  const base = readPath(loadedLocales[baseLocale], key);
  if (typeof base === "string") return base;

  return fallback ?? null;
}

function readPath(source: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[part];
  }, source);
}

export function localizeTrack(track: Track): Track {
  const baseKey = `content.tracks.${slugToKey(track.slug)}`;
  return {
    ...track,
    title: translateContentKey(track.titleKey ?? `${baseKey}.title`, track.title) ?? track.title,
    description: translateContentKey(track.descriptionKey ?? `${baseKey}.description`, track.description),
  };
}

export function localizeTopic(topic: Topic): Topic {
  const baseKey = `content.topics.${slugToKey(topic.slug)}`;
  return {
    ...topic,
    title: translateContentKey(topic.titleKey ?? `${baseKey}.title`, topic.title) ?? topic.title,
    summary: translateContentKey(topic.summaryKey ?? `${baseKey}.summary`, topic.summary),
    bodyMd: translateContentKey(topic.bodyKey ?? `${baseKey}.body`, topic.bodyMd),
  };
}

export function localizeResource(resource: Resource): Resource {
  const baseKey = `content.resources.${slugToKey(resource.id.replace(/^res-/, ""))}`;
  return {
    ...resource,
    title: translateContentKey(resource.titleKey ?? `${baseKey}.title`, resource.title) ?? resource.title,
    summary: translateContentKey(resource.summaryKey ?? `${baseKey}.summary`, resource.summary),
  };
}

export function localizeQuiz(quiz: Quiz): Quiz {
  const baseKey = `content.quizzes.${slugToKey(quiz.slug)}`;
  return {
    ...quiz,
    title: translateContentKey(quiz.titleKey ?? `${baseKey}.title`, quiz.title) ?? quiz.title,
    description: translateContentKey(quiz.descriptionKey ?? `${baseKey}.description`, quiz.description),
    questions: quiz.questions.map((question) => localizeQuestion(question, baseKey)),
  };
}

export function localizeBuildLabItem(item: BuildLabItem): BuildLabItem {
  const baseKey = `content.buildLabItems.${slugToKey(item.slug)}`;
  return {
    ...item,
    title: translateContentKey(item.titleKey ?? `${baseKey}.title`, item.title) ?? item.title,
    summary: translateContentKey(item.summaryKey ?? `${baseKey}.summary`, item.summary),
    bodyMd: translateContentKey(item.bodyKey ?? `${baseKey}.body`, item.bodyMd) ?? item.bodyMd,
  };
}

function localizeQuestion(question: Question, quizBaseKey: string): Question {
  const questionKey = `${quizBaseKey}.${question.id}`;
  const prompt = translateContentKey(question.promptKey ?? `${questionKey}.prompt`, question.prompt) ?? question.prompt;
  const explanation = translateContentKey(
    question.explanationKey ?? `${questionKey}.explanation`,
    question.explanation ?? null,
  );

  if (question.kind === "mcq") {
    return {
      ...question,
      prompt,
      options:
        question.optionKeys?.map((key, index) =>
          translateContentKey(key, question.options[index]) ?? question.options[index],
        ) ??
        question.options.map((option, index) =>
          translateContentKey(`${questionKey}.o${index + 1}`, option) ?? option,
        ),
      ...(explanation ? { explanation } : {}),
    };
  }

  return {
    ...question,
    prompt,
    answer: translateContentKey(question.answerKey ?? `${questionKey}.answer`, question.answer) ?? question.answer,
    ...(explanation ? { explanation } : {}),
  };
}

function slugToKey(value: string): string {
  return value.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}
