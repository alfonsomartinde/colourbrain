import { Component, inject, signal, OnInit, OnDestroy, effect, EffectRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from './shared/api.service';
import { Player, GameState, HistoryItem, Color } from './shared/types';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('presenter-app');
  protected readonly state = signal<GameState | null>(null);
  protected readonly players = signal<Player[]>([]);
  protected readonly history = signal<HistoryItem[] | null>(null);
  protected readonly now = signal<number>(Date.now());
  readonly #timer: any = setInterval(() => {
    this.now.set(Date.now());
    this.updateAnswersPolling();
  }, 250);
  private expiryTimeoutId?: number;
  protected readonly colors = signal<Color[]>([]);
  protected readonly currentAnswers = signal<Record<number, number[]>>({});
  api = inject(ApiService);
  #stateInFlight = false;
  #lastStateFetchAt = 0;
  #pendingStateTimer?: number;
  #playersInFlight = false;
  #historyInFlight = false;
  #colorsInFlight = false;
  #answersInFlight = false;
  #answersPoll?: any;
  #expiryEffect: EffectRef = effect(() => {
    const s = this.state();
    // limpiar timer anterior
    if (this.expiryTimeoutId !== undefined) {
      clearTimeout(this.expiryTimeoutId);
      this.expiryTimeoutId = undefined;
    }
    if (!s?.turn_end_at) return;
    const endMs = new Date(s.turn_end_at.replace(' ', 'T') + 'Z').getTime();
    const skewMs = 200; // colchón
    const minDelayMs = 1000; // mínimo 1s
    const raw = endMs - Date.now() + skewMs;
    const delay = Math.max(minDelayMs, raw);

    // si ya expiró, no programes nada
    if (raw <= 0) return;

    this.expiryTimeoutId = window.setTimeout(() => this.fetchState(), delay);
  });

  ngOnInit() {
    // Cargar snapshot inicial simple
    this.fetchState();
    this.fetchPlayers();
    this.fetchHistory();
    this.fetchColors();
  }

  onStartGame(): void {
    const confirmed = window.confirm(
      'Esto reiniciará la partida y borrará puntuaciones y respuestas. ¿Deseas continuar?'
    );
    if (!confirmed) return;
    this.api.postStartGame().subscribe(() => {
      // Resetear historial en UI
      this.history.set([]);
      this.fetchState();
      this.fetchPlayers();
      this.currentAnswers.set({});
    });
  }

  onStartTurn(): void {
    this.api.postStartTurn().subscribe(() => {
      this.fetchState();
      this.currentAnswers.set({});
    });
  }

  onShowCorrect(): void {
    this.api.postShowCorrect().subscribe(() => {
      this.fetchState();
      this.fetchHistory();
    });
  }

  onFinishIfAllAnswered(): void {
    this.api.postFinishTurnIfAllAnswered().subscribe(res => {
      if (res?.ended) {
        this.fetchState();
        this.fetchHistory();
      }
    });
  }

  onRename(id: number, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    this.api.renamePlayer(id, trimmed).subscribe(res => {
      if (res?.players) this.players.set(res.players);
    });
  }

  trackPlayer = (_: number, p: Player) => p.id;

  secondsLeft(): number | null {
    const s = this.state();
    if (!s?.turn_end_at) return null;
    const end = new Date(s.turn_end_at.replace(' ', 'T') + 'Z').getTime();
    const diff = Math.max(0, Math.floor((end - this.now()) / 1000));
    return diff;
  }

  /**
   * true si se puede revelar la respuesta
   * canReveal if
   * - el tiempo ha terminado
   * - el estado no es reveal
   * @returns boolean
   */
  disableReveal(): boolean {
    const secs = this.secondsLeft();
    return (secs !== null && secs > 0) || this.state()?.phase === 'reveal';
  }

  canFinishIfAllAnswered(): boolean {
    const s = this.state();
    if (!s || s.phase !== 'question') return false;
    const players = this.players();
    if (!players || players.length === 0) return false;
    const ans = this.currentAnswers();
    return players.every(p => Array.isArray(ans[p.id]) && ans[p.id].length > 0);
  }

  ngOnDestroy(): void {
    if (this.#timer) clearInterval(this.#timer);
    if (this.expiryTimeoutId !== undefined) clearTimeout(this.expiryTimeoutId);
    if (this.#pendingStateTimer !== undefined) clearTimeout(this.#pendingStateTimer);
    if (this.#expiryEffect) this.#expiryEffect.destroy();
    if (this.#answersPoll) clearInterval(this.#answersPoll);
  }

  colorHex(id: number): string {
    return this.colors().find(c => c.id === id)?.hexValue ?? '';
  }

  // Helper for template: get player's colorIds for a history item
  getAnswerColorIds(h: HistoryItem, playerId: number): number[] | null {
    const ans = h.answers.find(a => a.playerId === playerId);
    return ans ? ans.colorIds : null;
  }

  paintColorCards(colorIds: number[] | null): string {
    return colorIds ? colorIds.map(id => this.colorHex(id)).join(', ') : '';
  }

  private fetchState(): void {
    const now = Date.now();
    const minIntervalMs = 1000; // máximo 1 req/seg
    if (this.#stateInFlight) return;
    const elapsed = now - this.#lastStateFetchAt;
    if (elapsed < minIntervalMs) {
      if (this.#pendingStateTimer !== undefined) {
        clearTimeout(this.#pendingStateTimer);
      }
      this.#pendingStateTimer = window.setTimeout(() => {
        this.#pendingStateTimer = undefined;
        this.fetchState();
      }, minIntervalMs - elapsed);
      return;
    }
    this.#stateInFlight = true;
    this.api.getState().subscribe({
      next: s => {
        this.state.set(s);
        this.#lastStateFetchAt = Date.now();
        // polling de respuestas durante el turno
        const secs = this.secondsLeft();
        if (s.phase === 'question' && secs !== null && secs > 0) {
          this.fetchCurrentAnswers();
        }
        // si cambia de turno o se reinicia, limpiar respuestas actuales
        if (s.phase !== 'question') {
          this.currentAnswers.set({});
        }
      },
      error: () => {
        /* noop */
      },
      complete: () => {
        this.#stateInFlight = false;
      },
    });
  }

  private fetchPlayers(): void {
    if (this.#playersInFlight) return;
    this.#playersInFlight = true;
    this.api.getPlayers().subscribe({
      next: p => this.players.set(p),
      error: () => {
        /* noop */
      },
      complete: () => {
        this.#playersInFlight = false;
      },
    });
  }

  private fetchHistory(): void {
    if (this.#historyInFlight) return;
    this.#historyInFlight = true;
    this.api.getHistory().subscribe({
      next: h => this.history.set(h),
      error: () => {
        /* noop */
      },
      complete: () => {
        this.#historyInFlight = false;
      },
    });
  }

  private fetchColors(): void {
    if (this.#colorsInFlight) return;
    this.#colorsInFlight = true;
    this.api.getColors().subscribe({
      next: c => this.colors.set(c),
      error: () => {
        /* noop */
      },
      complete: () => {
        this.#colorsInFlight = false;
      },
    });
  }

  private fetchCurrentAnswers(): void {
    if (this.#answersInFlight) return;
    this.#answersInFlight = true;
    this.api.getCurrentAnswers().subscribe({
      next: res => {
        const dict: Record<number, number[]> = {};
        res.answers.forEach(a => (dict[a.playerId] = a.colorIds));
        this.currentAnswers.set(dict);
      },
      error: () => {
        /* noop */
      },
      complete: () => {
        this.#answersInFlight = false;
      },
    });
  }

  /**
   * Inicia o detiene el polling de respuestas actuales según estado del turno.
   */
  private updateAnswersPolling(): void {
    const s = this.state();
    const secs = this.secondsLeft();
    const shouldPoll = !!(s && s.phase === 'question' && secs !== null && secs > 0);
    if (shouldPoll) {
      if (!this.#answersPoll) {
        this.#answersPoll = setInterval(() => this.fetchCurrentAnswers(), 2000);
      }
    } else if (this.#answersPoll) {
      clearInterval(this.#answersPoll);
      this.#answersPoll = undefined;
    }
  }
}
