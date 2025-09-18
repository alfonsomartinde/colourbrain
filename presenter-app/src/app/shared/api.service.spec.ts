import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideHttpTesting } from '../../test-helpers/http-testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { API_BASE } from './env';

describe('ApiService (presenter-app)', () => {
  let api: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpTesting()]
    });
    api = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getState debe hacer GET /api/state y tipar GameState', () => {
    const mock = { phase: 'idle', current_turn: 0, additional_points: 0, correct_answer_shown: false, turn_duration_seconds: 30, turn_end_at: null, active_question: null };
    api.getState().subscribe(state => {
      expect(state.phase).toBe('idle');
    });
    const req = httpMock.expectOne(`${API_BASE}/api/state`);
    expect(req.request.method).toBe('GET');
    req.flush(mock);
  });

  it('getPlayers debe hacer GET /api/players', () => {
    const mock = [{ id: 1, name: 'A', points: 0 }];
    api.getPlayers().subscribe(players => {
      expect(players.length).toBe(1);
      expect(players[0].id).toBe(1);
    });
    const req = httpMock.expectOne(`${API_BASE}/api/players`);
    expect(req.request.method).toBe('GET');
    req.flush(mock);
  });

  it('getColors debe hacer GET /api/colors', () => {
    const mock = [{ id: 1, name: 'Blanco', hexValue: '#fff' }];
    api.getColors().subscribe(colors => {
      expect(colors[0].hexValue).toBe('#fff');
    });
    const req = httpMock.expectOne(`${API_BASE}/api/colors`);
    expect(req.request.method).toBe('GET');
    req.flush(mock);
  });

  it('postStartGame debe hacer POST /api/presenter/start-game', () => {
    api.postStartGame().subscribe(res => expect(res.ok).toBeTrue());
    const req = httpMock.expectOne(`${API_BASE}/api/presenter/start-game`);
    expect(req.request.method).toBe('POST');
    req.flush({ ok: true });
  });

  it('postStartTurn debe hacer POST /api/presenter/start-turn', () => {
    api.postStartTurn().subscribe(res => expect(res.ok).toBeTrue());
    const req = httpMock.expectOne(`${API_BASE}/api/presenter/start-turn`);
    expect(req.request.method).toBe('POST');
    req.flush({ ok: true });
  });

  it('postShowCorrect debe hacer POST /api/presenter/show-correct', () => {
    api.postShowCorrect().subscribe(res => expect(res.ok).toBeTrue());
    const req = httpMock.expectOne(`${API_BASE}/api/presenter/show-correct`);
    expect(req.request.method).toBe('POST');
    req.flush({ ok: true, data: { correctColorIds: [1], winners: [2] } });
  });

  it('renamePlayer debe hacer PATCH /api/players/:id', () => {
    api.renamePlayer(3, 'Neo').subscribe(res => expect(res.ok).toBeTrue());
    const req = httpMock.expectOne(`${API_BASE}/api/players/3`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'Neo' });
    req.flush({ ok: true, players: [] });
  });

  it('getHistory debe hacer GET /api/history', () => {
    api.getHistory().subscribe(h => expect(Array.isArray(h)).toBeTrue());
    const req = httpMock.expectOne(`${API_BASE}/api/history`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});


