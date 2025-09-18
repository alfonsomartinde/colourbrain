import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Color, GameState, Player } from './shared/types';
import { ApiService } from './shared/api.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('player-app');
  protected readonly selectedColors = signal<number[]>([]);
  protected readonly answered = signal<boolean>(false);
  protected readonly question = signal<GameState['active_question'] | null>(null);
  protected readonly colors = signal<Color[]>([]);
  protected readonly message = signal<string>('');
  protected readonly turn = signal<number>(0);
  protected readonly state = signal<GameState | null>(null);
  protected readonly players = signal<Player[]>([]);
  protected readonly playerId = signal<number | null>(null);
  protected readonly now = signal<number>(Date.now());
  readonly #api = inject(ApiService);
  #statePoll: any;
  #lastTurn: number | null = null;
  #timer: any;

  ngOnInit(): void {
    this.playerId.set(this.#readPlayerIdFromUrl());
    this.#api.getState().subscribe((s) => {
      this.state.set(s);
      this.question.set(s.active_question ?? null);
      this.turn.set(s.current_turn ?? 0);
      this.#lastTurn = s.current_turn ?? 0;
    });
    this.#api.getColors().subscribe((c) => {
      this.colors.set(c);
    });
    this.#api.getPlayers().subscribe((p) => {
      this.players.set(p);
    });

    // Polling del estado con guarda: no pedir mientras el countdown esté activo
    this.#statePoll = setInterval(() => {
      const s = this.state();
      const secs = this.secondsLeft();
      if (s?.phase === 'question' && secs !== null && secs > 0) {
        return; // aún contando; el estado no cambia
      }
      this.refreshState();
    }, 1000);
    // Tick para countdown
    this.#timer = setInterval(() => this.now.set(Date.now()), 250);
  }

  ngOnDestroy(): void {
    if (this.#statePoll) {
      clearInterval(this.#statePoll);
      this.#statePoll = undefined as any;
    }
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = undefined as any;
    }
  }

  handleColorClick(id: number): void {
    this.selectedColors.update(colors => {
      const idx = colors.indexOf(id);
      if (idx >= 0) {
        const next = colors.slice();
        next.splice(idx, 1);
        return next;
      }
      return [...colors, id];
    });
  }

  handleSubmitAnswer(): void {
    const s = this.state();
    const turn = s?.current_turn ?? 0;
    const me = this.playerId();
    if (!turn || this.selectedColors().length === 0 || !me) {
      if (!me) this.message.set('Selecciona tu equipo primero');
      return;
    }
    this.#api.postPlayerAnswer({ playerId: me, colorIds: this.selectedColors() }).subscribe({
      next: (res) => {
        if (res?.ok && res.accepted !== false) {
          this.answered.set(true);
          this.message.set('Respuesta enviada');
        } else {
          this.answered.set(false);
          this.message.set('No se pudo enviar la respuesta');
        }
      },
      error: () => {
        this.answered.set(false);
        this.message.set('Error de red al enviar respuesta');
      },
    });
  }

  private refreshState(): void {
    this.#api.getState().subscribe((s) => {
      const prevTurn = this.#lastTurn ?? 0;
      this.state.set(s);
      this.question.set(s.active_question ?? null);
      this.turn.set(s.current_turn ?? 0);
      if ((s.current_turn ?? 0) !== prevTurn) {
        // Nuevo turno: desbloquear y limpiar selección
        this.answered.set(false);
        this.selectedColors.set([]);
        this.message.set('');
        this.#lastTurn = s.current_turn ?? 0;
      }
    });
  }

  onSelectTeam(id: number): void {
    const url = this.#buildUrlWithPlayerId(id);
    window.location.href = url;
  }

  currentTeamLabel(): string {
    const id = this.playerId();
    if (!id) return '';
    const p = this.players().find(pl => pl.id === id);
    const name = p?.name ?? '';
    return name;
  }

  currentTeamPoints(): number {
    const id = this.playerId();
    if (!id) return 0;
    const p = this.players().find(pl => pl.id === id);
    return p?.points ?? 0;
  }

  currentReward(): number {
    const s = this.state();
    const pot = s?.additional_points ?? 0;
    return 1 + pot;
  }

  secondsLeft(): number | null {
    const s = this.state();
    if (!s?.turn_end_at) return null;
    const end = new Date(s.turn_end_at.replace(' ', 'T') + 'Z').getTime();
    const diff = Math.max(0, Math.floor((end - this.now()) / 1000));
    return diff;
  }

  #readPlayerIdFromUrl(): number | null {
    try {
      const url = new URL(window.location.href);
      const raw = url.searchParams.get('playerId');
      if (!raw) return null;
      const num = parseInt(raw, 10);
      return Number.isFinite(num) && num >= 1 && num <= 4 ? num : null;
    } catch {
      return null;
    }
  }

  #buildUrlWithPlayerId(id: number): string {
    const url = new URL(window.location.href);
    url.searchParams.set('playerId', String(id));
    return url.toString();
  }
}
