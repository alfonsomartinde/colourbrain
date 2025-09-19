import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE } from './env';
import { GameState, Player, Color, HistoryItem } from './types';
import { Observable } from 'rxjs';

/** Servicio HTTP para acceso a datos del backend. Devuelve Observables. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  getState(): Observable<GameState> {
    return this.http.get<GameState>(`${API_BASE}/api/state`);
  }

  getPlayers(): Observable<Player[]> {
    return this.http.get<Player[]>(`${API_BASE}/api/players`);
  }

  getColors(): Observable<Color[]> {
    return this.http.get<Color[]>(`${API_BASE}/api/colors`);
  }

  postStartGame(): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${API_BASE}/api/presenter/start-game`, {});
  }

  postStartTurn(): Observable<{ ok: boolean; data?: unknown }> {
    return this.http.post<{ ok: boolean; data?: unknown }>(
      `${API_BASE}/api/presenter/start-turn`,
      {}
    );
  }

  postShowCorrect(): Observable<{
    ok: boolean;
    data?: { correctColorIds: number[]; winners: number[] };
  }> {
    return this.http.post<{ ok: boolean; data?: { correctColorIds: number[]; winners: number[] } }>(
      `${API_BASE}/api/presenter/show-correct`,
      {}
    );
  }

  renamePlayer(id: number, name: string): Observable<{ ok: boolean; players: Player[] }> {
    // Usar POST para evitar 405 si el hosting no soporta PATCH
    return this.http.post<{ ok: boolean; players: Player[] }>(
      `${API_BASE}/api/players/${id}/rename`,
      {
        name,
      }
    );
  }

  getHistory(): Observable<HistoryItem[]> {
    return this.http.get<HistoryItem[]>(`${API_BASE}/api/history`);
  }

  postFinishTurnIfAllAnswered(): Observable<{
    ok: boolean;
    ended: boolean;
    turn_end_at?: string;
    answers?: number;
    players?: number;
  }> {
    return this.http.post<{
      ok: boolean;
      ended: boolean;
      turn_end_at?: string;
      answers?: number;
      players?: number;
    }>(`${API_BASE}/api/presenter/finish-turn-if-all-answered`, {});
  }

  getCurrentAnswers(): Observable<{ answers: { playerId: number; colorIds: number[] }[] }> {
    return this.http.get<{ answers: { playerId: number; colorIds: number[] }[] }>(
      `${API_BASE}/api/answers/current`
    );
  }
}
