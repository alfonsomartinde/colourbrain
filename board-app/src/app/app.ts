import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PlayerBoxComponent } from './components/player-box/player-box.component';
import { ApiService } from './shared/api.service';
import { GameState, Player } from './shared/types';
import { TimerComponent } from './components/timer/timer.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PlayerBoxComponent, TimerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('board-app');
  protected readonly state = signal<GameState | null>(null);
  protected readonly now = signal<number>(Date.now());
  protected readonly players = signal<Player[]>([]);
  protected readonly colors = signal<Record<number, string>>({});
  protected readonly answersByPlayerId = signal<Record<number, number[]>>({});
  protected readonly reveal = signal<{ correctColorIds: number[]; winners: number[] } | null>(null);
  #timer: any;
  #loadPlayers: any;
  #statePoll: any;
  #fetchedAnswersForTurn: number | null = null;
  #fetchedRevealForTurn: number | null = null;
  #playersFetchedOnRevealTurn: number | null = null;
  readonly #api = inject(ApiService);

  ngOnInit(): void {
    this.refresh();
    // refresco simple periódico para marcador
    this.#loadPlayers = setInterval(() => this.loadPlayers(), 2000);
    this.#timer = setInterval(() => {
      this.now.set(Date.now());
      this.fetchOnceAtReveal();
      this.updatePlayersPolling();
      this.updateStatePolling();
    }, 250);
  }

  ngOnDestroy(): void {
    if (this.#timer) clearInterval(this.#timer);
    if (this.#statePoll) clearInterval(this.#statePoll);
    if (this.#loadPlayers) clearInterval(this.#loadPlayers);
  }

  refresh(): void {
    this.#api.getState().subscribe((s) => {
      this.state.set(s);
      this.updateStatePolling();
    });
    this.loadPlayers();
    this.loadColors();
  }

  secondsLeft(): number | null {
    const s = this.state();
    if (!s?.turn_end_at) return null;
    const end = new Date(s.turn_end_at.replace(' ', 'T') + 'Z').getTime();
    const diff = Math.max(0, Math.floor((end - this.now()) / 1000));
    return diff;
  }

  private loadPlayers(): void {
    this.#api.getPlayers().subscribe((p) => this.players.set(p));
  }

  private loadColors(): void {
    this.#api.getColors().subscribe((cs) => {
      const map: Record<number, string> = {};
      cs.forEach(c => map[c.id] = c.hexValue);
      this.colors.set(map);
    });
  }

  showAnswers(): boolean {
    const secs = this.secondsLeft();
    return secs !== null && secs <= 0;
  }

  colorHex(id: number): string {
    return this.colors()[id] ?? '#000000';
  }

  isWinner(playerIndex: number): boolean {
    const r = this.reveal();
    if (!r) return false;
    // players array is in order id 1..4; map index->id
    const id = this.players()[playerIndex]?.id;
    if (!id) return false;
    return r.winners.includes(id);
  }

  private fetchOnceAtReveal(): void {
    const s = this.state();
    const secs = this.secondsLeft();
    const atZero = secs !== null && secs <= 0;
    const currentTurn = s?.current_turn ?? null;
    if (atZero) {
      if (currentTurn !== null && this.#fetchedAnswersForTurn !== currentTurn) {
        this.#api.getCurrentAnswers().subscribe((res) => {
          const dict: Record<number, number[]> = {};
          res.answers.forEach(a => (dict[a.playerId] = a.colorIds));
          this.answersByPlayerId.set(dict);
        });
        this.#fetchedAnswersForTurn = currentTurn;
      }
    } else if (this.#fetchedAnswersForTurn !== null) {
      this.answersByPlayerId.set({});
      this.#fetchedAnswersForTurn = null;
    }

    // Fetch reveal only when presenter has revealed
    if (s?.correct_answer_shown && currentTurn !== null) {
      if (this.#fetchedRevealForTurn !== currentTurn) {
        this.#api.getCurrentReveal().subscribe((r) => this.reveal.set(r));
        this.#fetchedRevealForTurn = currentTurn;
      }
    } else {
      this.reveal.set(null);
      this.#fetchedRevealForTurn = null;
    }
  }

  /**
   * Controla el polling de jugadores.
   * - Antes de revelar y en pre-partida: polling activo (nombres pueden cambiar).
   * - Tras revelar: parar polling y hacer una única carga para capturar puntos finales.
   * - Siguiente turno: reactivar polling y limpiar marca.
   */
  private updatePlayersPolling(): void {
    const s = this.state();
    const currentTurn = s?.current_turn ?? 0;
    const revealed = !!s?.correct_answer_shown;

    if (revealed) {
      if (this.#loadPlayers) {
        clearInterval(this.#loadPlayers);
        this.#loadPlayers = undefined as any;
      }
      if (currentTurn > 0 && this.#playersFetchedOnRevealTurn !== currentTurn) {
        this.loadPlayers();
        this.#playersFetchedOnRevealTurn = currentTurn;
      }
      return;
    }

    if (!this.#loadPlayers) {
      this.#loadPlayers = setInterval(() => this.loadPlayers(), 2000);
    }

    if (this.#playersFetchedOnRevealTurn !== null && this.#playersFetchedOnRevealTurn !== currentTurn) {
      this.#playersFetchedOnRevealTurn = null;
    }
  }

  /**
   * Activa o pausa el polling del estado según el momento del turno.
   * - Durante la cuenta atrás (>0s): pausa el polling.
   * - Sin turno activo o tras llegar a 0s: activa el polling para captar reveal/siguiente turno.
   */
  private updateStatePolling(): void {
    const s = this.state();
    const hasActiveTurn = !!(s && s.current_turn > 0 && s.turn_end_at);
    const secs = this.secondsLeft();
    const shouldPoll = !hasActiveTurn || (secs === null || secs <= 0);
    this.ensureStatePolling(shouldPoll);
  }

  /**
   * Garantiza que el intervalo de polling de estado esté en el estado deseado.
   */
  private ensureStatePolling(shouldRun: boolean): void {
    if (shouldRun) {
      if (!this.#statePoll) {
        this.#statePoll = setInterval(() => {
          this.#api.getState().subscribe((s) => this.state.set(s));
        }, 1000);
      }
    } else if (this.#statePoll) {
      clearInterval(this.#statePoll);
      this.#statePoll = undefined as any;
    }
  }
}
