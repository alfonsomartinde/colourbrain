import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
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

  it('should render title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Presentador');
  });

  it('should call start-game on click and then fetch state and players', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const btn = (fixture.nativeElement as HTMLElement).querySelector('button.danger') as HTMLButtonElement;
    expect(btn).toBeTruthy();

    // Responder peticiones iniciales (orden no determinista)
    const initReqs = httpMock.match(req => req.url.startsWith(`${API_BASE}/api/`));
    // Deben ser 4: state, players, history, colors
    expect(initReqs.length).toBe(4);
    for (const req of initReqs) {
      if (req.request.url.endsWith('/api/state')) {
        req.flush({ phase: 'idle', current_turn: 0, additional_points: 0, correct_answer_shown: false, turn_duration_seconds: 30, turn_end_at: null, active_question: null });
      } else if (req.request.url.endsWith('/api/players')) {
        req.flush([]);
      } else if (req.request.url.endsWith('/api/history')) {
        req.flush([]);
      } else if (req.request.url.endsWith('/api/colors')) {
        req.flush([]);
      }
    }

    spyOn(window, 'confirm').and.returnValue(true);

    btn.click();

    const post = httpMock.expectOne(`${API_BASE}/api/presenter/start-game`);
    expect(post.request.method).toBe('POST');
    post.flush({ ok: true });

    // Después del POST, el componente vuelve a cargar estado y players (orden no determinista)
    const afterPost = httpMock.match(req =>
      req.url === `${API_BASE}/api/state` ||
      req.url === `${API_BASE}/api/players` ||
      req.url === `${API_BASE}/api/history`
    );
    for (const req of afterPost) {
      if (req.request.url.endsWith('/api/state')) {
        req.flush({ phase: 'idle', current_turn: 0, additional_points: 0, correct_answer_shown: false, turn_duration_seconds: 30, turn_end_at: null, active_question: null });
      } else if (req.request.url.endsWith('/api/players')) {
        req.flush([]);
      } else if (req.request.url.endsWith('/api/history')) {
        req.flush([]);
      }
    }
  });

  it('should call start-turn', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    // responder init
    const initReqs = httpMock.match(req => req.url.startsWith(`${API_BASE}/api/`));
    for (const req of initReqs) {
      if (req.request.url.endsWith('/api/state')) {
        req.flush({ phase: 'idle', current_turn: 0, additional_points: 0, correct_answer_shown: false, turn_duration_seconds: 30, turn_end_at: null, active_question: null });
      } else if (req.request.url.endsWith('/api/players') || req.request.url.endsWith('/api/history') || req.request.url.endsWith('/api/colors')) {
        req.flush([]);
      }
    }
    // invocar método directamente
    (fixture.componentInstance as any).onStartTurn();
    const post = httpMock.expectOne(`${API_BASE}/api/presenter/start-turn`);
    expect(post.request.method).toBe('POST');
    post.flush({ ok: true });
    // El componente puede solicitar estado después; no lo exigimos aquí
  });

  it('should call show-correct and refresh state and history', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    // responder init
    const initReqs = httpMock.match(req => req.url.startsWith(`${API_BASE}/api/`));
    for (const req of initReqs) {
      if (req.request.url.endsWith('/api/state')) {
        req.flush({ phase: 'question', current_turn: 2, additional_points: 0, correct_answer_shown: false, turn_duration_seconds: 30, turn_end_at: null, active_question: { id: 2, text: 'Q2', requiredColorsCount: 2 } });
      } else if (req.request.url.endsWith('/api/players') || req.request.url.endsWith('/api/history') || req.request.url.endsWith('/api/colors')) {
        req.flush([]);
      }
    }
    (fixture.componentInstance as any).onShowCorrect();
    const post = httpMock.expectOne(`${API_BASE}/api/presenter/show-correct`);
    expect(post.request.method).toBe('POST');
    post.flush({ ok: true, data: { correctColorIds: [1], winners: [] } });
    const afterPost = httpMock.match(req => req.url === `${API_BASE}/api/state` || req.url === `${API_BASE}/api/history`);
    expect(afterPost.length).toBeGreaterThan(0);
    for (const req of afterPost) {
      if (req.request.url.endsWith('/api/state')) {
        req.flush({ phase: 'reveal', current_turn: 2, additional_points: 0, correct_answer_shown: true, turn_duration_seconds: 30, turn_end_at: null, active_question: null });
      } else {
        req.flush([]);
      }
    }
  });
});
