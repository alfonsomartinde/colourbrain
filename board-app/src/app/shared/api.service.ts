import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE } from './env';
import { GameState, Player, Color } from './types';
import { Observable } from 'rxjs';

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

  getCurrentAnswers(): Observable<{ turn_id: number|null; question_id: number|null; answers: { playerId: number; colorIds: number[] }[] }>{
    return this.http.get<{ turn_id: number|null; question_id: number|null; answers: { playerId: number; colorIds: number[] }[] }>(`${API_BASE}/api/answers/current`);
  }

  getCurrentReveal(): Observable<{ correctColorIds: number[]; winners: number[] }>{
    return this.http.get<{ correctColorIds: number[]; winners: number[] }>(`${API_BASE}/api/reveal/current`);
  }
}
