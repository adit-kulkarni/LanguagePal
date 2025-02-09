import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const grammarTenses = [
  "presente (present indicative)",
  "pretérito indefinido (simple past)",
  "pretérito imperfecto (imperfect past)",
  "futuro simple (simple future)",
  "condicional simple (simple conditional)",
  "pretérito perfecto compuesto (present perfect)",
  "pretérito pluscuamperfecto (pluperfect)",
  "futuro perfecto (future perfect)",
  "condicional perfecto (conditional perfect)",
  "presente de subjuntivo (present subjunctive)",
  "pretérito imperfecto de subjuntivo (imperfect subjunctive)",
  "pretérito perfecto de subjuntivo (present perfect subjunctive)",
  "pretérito pluscuamperfecto de subjuntivo (pluperfect subjunctive)"
];

export const vocabularySets = [
  "100 most common nouns",
  "50 most common verbs",
  "basic adjectives",
  "food and dining",
  "travel and directions"
];

export function calculateCEFR(progress: {
  grammar: number;
  vocabulary: number;
  speaking: number;
}): string {
  const average = (progress.grammar + progress.vocabulary + progress.speaking) / 3;

  if (average < 20) return "A1";
  if (average < 40) return "A2";
  if (average < 60) return "B1";
  if (average < 80) return "B2";
  return "C1";
}