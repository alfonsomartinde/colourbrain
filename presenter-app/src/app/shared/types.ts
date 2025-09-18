/** Tipos compartidos según contratos del backend actual (snake_case). */

export interface Color {
  id: number;
  name: string;
  hexValue: string;
}

export interface Player {
  id: number;
  name: string;
  points: number;
}

export interface QuestionPreview {
  id: number;
  text: string;
  requiredColorsCount: number;
}

export type GamePhase = 'idle' | 'question' | 'reveal' | 'intermission';

export interface GameState {
  phase: GamePhase;
  current_turn: number;
  additional_points: number;
  correct_answer_shown: boolean;
  turn_duration_seconds: number;
  turn_end_at: string | null;
  active_question: { id: number; text: string; requiredColorsCount: number } | null;
}

export interface SseEvent<T = unknown> {
  type: string;
  payload: T;
}

export interface HistoryAnswer {
  playerId: number;
  colorIds: number[];
  correct: boolean;
  pointsGained: number;
}

export interface HistoryItem {
  turn: number;
  questionId: number;
  text: string;
  correctColorIds: number[];
  winners: number[];
  answers: HistoryAnswer[];
}


