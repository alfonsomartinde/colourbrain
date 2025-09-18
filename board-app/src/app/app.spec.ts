import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TimerComponent } from './components/timer/timer.component';
import { API_BASE } from './shared/env';

describe('App', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render something meaningful', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    // The board has no global h1, but has a timer and may render question text
    expect(compiled.querySelector('timer')).toBeTruthy();
  });

  it('should show endgame banner when phase idle and turn > 0', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    // ngOnInit initial calls
    httpMock.expectOne(`${API_BASE}/api/state`).flush({ phase: 'idle', current_turn: 1, additional_points: 0, correct_answer_shown: false, turn_duration_seconds: 0, turn_end_at: null, active_question: null });
    // Evitar sección de jugadores para no acceder a índices inexistentes
    httpMock.expectOne(`${API_BASE}/api/players`).flush([]);
    httpMock.expectOne(`${API_BASE}/api/colors`).flush([]);

    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('FIN DE LA PARTIDA');
  });

  it('should return showAnswers true when countdown is zero', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    // flush initial requests flexibly
    const init = httpMock.match(req => req.url.startsWith(`${API_BASE}/api/`));
    for (const req of init) {
      if (req.request.url.endsWith('/api/state')) {
        req.flush({ phase: 'question', current_turn: 1, additional_points: 0, correct_answer_shown: false, turn_duration_seconds: 30, turn_end_at: null, active_question: { id: 1, text: 'Q', requiredColorsCount: 1 } });
      } else if (req.request.url.endsWith('/api/players')) {
        req.flush([]);
      } else if (req.request.url.endsWith('/api/colors')) {
        req.flush([]);
      }
    }

    const cmp: any = fixture.componentInstance as any;
    const now = Date.now();
    const past = new Date(now - 1).toISOString().replace('T', ' ').replace('Z', '');
    cmp.state.set({ phase: 'question', current_turn: 1, additional_points: 0, correct_answer_shown: false, turn_duration_seconds: 30, turn_end_at: past, active_question: { id: 1, text: 'Q', requiredColorsCount: 1 } });
    cmp.now.set(now);
    expect(cmp.showAnswers()).toBeTrue();
  });

  it('should mark winner based on reveal winners list', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const init = httpMock.match(req => req.url.startsWith(`${API_BASE}/api/`));
    for (const req of init) {
      if (req.request.url.endsWith('/api/state')) {
        req.flush({ phase: 'reveal', current_turn: 1, additional_points: 0, correct_answer_shown: true, turn_duration_seconds: 30, turn_end_at: null, active_question: null });
      } else if (req.request.url.endsWith('/api/players')) {
        req.flush([{ id: 1, name: 'A', points: 0 }]);
      } else if (req.request.url.endsWith('/api/colors')) {
        req.flush([]);
      }
    }
    const cmp: any = fixture.componentInstance as any;
    cmp.players.set([{ id: 1, name: 'A', points: 0 }]);
    cmp.reveal.set({ correctColorIds: [1], winners: [1] });
    expect(cmp.isWinner(0)).toBeTrue();
  });

  it('fetchOnceAtReveal should request answers and reveal and update signals', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    // clear initial requests
    const init = httpMock.match(req => req.url.startsWith(`${API_BASE}/api/`));
    for (const req of init) {
      if (req.request.url.endsWith('/api/state')) {
        req.flush({ phase: 'question', current_turn: 1, additional_points: 0, correct_answer_shown: false, turn_duration_seconds: 30, turn_end_at: null, active_question: null });
      } else if (req.request.url.endsWith('/api/players')) {
        req.flush([{ id: 1, name: 'A', points: 0 }]);
      } else if (req.request.url.endsWith('/api/colors')) {
        req.flush([]);
      }
    }

    const cmp: any = fixture.componentInstance as any;
    const now = Date.now();
    const past = new Date(now - 1).toISOString().replace('T', ' ').replace('Z', '');
    cmp.state.set({ phase: 'reveal', current_turn: 1, additional_points: 0, correct_answer_shown: true, turn_duration_seconds: 30, turn_end_at: past, active_question: null });
    cmp.now.set(now);

    // invoke private method
    cmp.fetchOnceAtReveal();

    const reqAnswers = httpMock.expectOne(`${API_BASE}/api/answers/current`);
    expect(reqAnswers.request.method).toBe('GET');
    reqAnswers.flush({ turn_id: 1, question_id: 1, answers: [{ playerId: 1, colorIds: [1,2] }] });

    const reqReveal = httpMock.expectOne(`${API_BASE}/api/reveal/current`);
    expect(reqReveal.request.method).toBe('GET');
    reqReveal.flush({ correctColorIds: [1], winners: [1] });

    expect(cmp.answersByPlayerId()).toEqual({ 1: [1,2] });
    expect(cmp.reveal()).toEqual({ correctColorIds: [1], winners: [1] });
  });

  it('updatePlayersPolling should fetch players once when revealed', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const init = httpMock.match(req => req.url.startsWith(`${API_BASE}/api/`));
    for (const req of init) {
      if (req.request.url.endsWith('/api/state')) {
        req.flush({ phase: 'reveal', current_turn: 3, additional_points: 0, correct_answer_shown: true, turn_duration_seconds: 30, turn_end_at: null, active_question: null });
      } else if (req.request.url.endsWith('/api/players') || req.request.url.endsWith('/api/colors')) {
        req.flush([]);
      }
    }
    const cmp: any = fixture.componentInstance as any;
    const spy = spyOn(cmp, 'loadPlayers');
    cmp.updatePlayersPolling();
    expect(spy).toHaveBeenCalledTimes(1);
    // segunda llamada en mismo turno no vuelve a cargar
    cmp.updatePlayersPolling();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('updateStatePolling should pause during countdown and resume otherwise', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const init = httpMock.match(req => req.url.startsWith(`${API_BASE}/api/`));
    for (const req of init) {
      if (req.request.url.endsWith('/api/state')) {
        req.flush({ phase: 'question', current_turn: 1, additional_points: 0, correct_answer_shown: false, turn_duration_seconds: 30, turn_end_at: null, active_question: { id: 1, text: 'Q', requiredColorsCount: 1 } });
      } else if (req.request.url.endsWith('/api/players') || req.request.url.endsWith('/api/colors')) {
        req.flush([]);
      }
    }
    const cmp: any = fixture.componentInstance as any;
    const ensureSpy = spyOn<any>(cmp, 'ensureStatePolling');
    // countdown activo: turn_end_at en futuro
    const future = new Date(Date.now() + 10_000).toISOString().replace('T', ' ').replace('Z', '');
    cmp.state.set({ phase: 'question', current_turn: 1, additional_points: 0, correct_answer_shown: false, turn_duration_seconds: 30, turn_end_at: future, active_question: { id: 1, text: 'Q', requiredColorsCount: 1 } });
    cmp.now.set(Date.now());
    cmp.updateStatePolling();
    expect(ensureSpy).toHaveBeenCalledWith(false);
    // sin turno activo: debería activar polling
    ensureSpy.calls.reset();
    cmp.state.set({ phase: 'idle', current_turn: 0, additional_points: 0, correct_answer_shown: false, turn_duration_seconds: 30, turn_end_at: null, active_question: null });
    cmp.updateStatePolling();
    expect(ensureSpy).toHaveBeenCalledWith(true);
  });
});

