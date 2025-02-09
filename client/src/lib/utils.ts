import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface GrammarTense {
  name: string;
  description: string;
  example: string;
  translation: string;
}

export const grammarTenses: GrammarTense[] = [
  {
    name: "presente (present indicative)",
    description: "Describes actions happening now or habitual actions",
    example: "Yo hablo español",
    translation: "I speak Spanish"
  },
  {
    name: "pretérito indefinido (simple past)",
    description: "Narrates completed actions in the past",
    example: "Ella comió en el restaurante",
    translation: "She ate at the restaurant"
  },
  {
    name: "pretérito imperfecto (imperfect past)",
    description: "Describes ongoing, habitual, or background actions in the past",
    example: "Nosotros jugábamos fútbol los sábados",
    translation: "We used to play soccer on Saturdays"
  },
  {
    name: "futuro simple (simple future)",
    description: "Indicates actions that will happen",
    example: "Mañana viajaré a Madrid",
    translation: "Tomorrow I will travel to Madrid"
  },
  {
    name: "condicional simple (simple conditional)",
    description: "Expresses hypothetical or conditional actions",
    example: "Yo iría si tuviera tiempo",
    translation: "I would go if I had time"
  },
  {
    name: "pretérito perfecto compuesto (present perfect)",
    description: "Talks about actions completed in the past that have relevance to the present",
    example: "Ellos han terminado el trabajo",
    translation: "They have finished the work"
  },
  {
    name: "pretérito pluscuamperfecto (pluperfect)",
    description: "Describes a past action that occurred before another past action",
    example: "Yo había leído el libro antes de ver la película",
    translation: "I had read the book before watching the movie"
  },
  {
    name: "futuro perfecto (future perfect)",
    description: "Indicates that an action will have been completed by a certain point in the future",
    example: "Para entonces, tú habrás terminado el proyecto",
    translation: "By then, you will have finished the project"
  },
  {
    name: "condicional perfecto (conditional perfect)",
    description: "Expresses what would have happened under different conditions",
    example: "Nosotros habríamos ido si nos hubieras invitado",
    translation: "We would have gone if you had invited us"
  },
  {
    name: "presente de subjuntivo (present subjunctive)",
    description: "Used in subordinate clauses to express doubt, desire, emotion, or uncertainty in the present/future",
    example: "Espero que tú estudies para el examen",
    translation: "I hope that you study for the exam"
  },
  {
    name: "pretérito imperfecto de subjuntivo (imperfect subjunctive)",
    description: "Refers to past actions in a subjunctive context",
    example: "Si yo supiera la respuesta, te lo diría",
    translation: "If I knew the answer, I would tell you"
  },
  {
    name: "pretérito perfecto de subjuntivo (present perfect subjunctive)",
    description: "Describes past actions with present relevance in contexts that require the subjunctive mood",
    example: "Dudo que ellos hayan llegado ya",
    translation: "I doubt that they have already arrived"
  },
  {
    name: "pretérito pluscuamperfecto de subjuntivo (pluperfect subjunctive)",
    description: "Indicates an action that had occurred before another past action within a subjunctive framework",
    example: "Ojalá hubieras venido a la fiesta",
    translation: "I wish you had come to the party"
  }
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