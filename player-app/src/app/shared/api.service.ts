import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE } from './env';
import { GameState, Player, Color } from './types';
import { Observable } from 'rxjs';

/**
 * HTTP data access service for player-app.
 * Provides typed methods for backend endpoints. All methods return cold Observables.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  /**
   * Fetches current game state snapshot.
   * @returns Observable with GameState
   * @example
   * this.api.getState().subscribe(s => console.log(s.phase));
   */
  getState(): Observable<GameState> {
    return this.http.get<GameState>(`${API_BASE}/api/state`);
  }

  /**
   * Fetches players list with id, name and points.
   * @returns Observable with Player[]
   */
  getPlayers(): Observable<Player[]> {
    return this.http.get<Player[]>(`${API_BASE}/api/players`);
  }

  /**
   * Fetches available color palette for the game.
   * @returns Observable with Color[]
   */
  getColors(): Observable<Color[]> {
    return this.http.get<Color[]>(`${API_BASE}/api/colors`);
  }

  /**
   * Sends a player's answer for the current turn.
   * Enforces 1 answer per player/turn on the backend.
   * @param body payload containing playerId and colorIds
   * @returns Observable with operation result: { ok, accepted, ignored, reason? }
   * @example
   * this.api.postPlayerAnswer({ playerId: 1, colorIds: [3,5] }).subscribe();
   */
  postPlayerAnswer(body: { playerId: number; colorIds: number[] }): Observable<{ ok: boolean; accepted?: boolean; ignored?: boolean; reason?: string }> {
    return this.http.post<{ ok: boolean; accepted?: boolean; ignored?: boolean; reason?: string }>(`${API_BASE}/api/player/answer`, body);
  }
}
