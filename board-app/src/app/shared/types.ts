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
