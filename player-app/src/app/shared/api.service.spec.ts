import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideHttpTesting } from '../../test-helpers/http-testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { API_BASE } from './env';

describe('ApiService (player-app)', () => {
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

  it('getState debe hacer GET /api/state', () => {
    const mock = { phase: 'idle', current_turn: 0, additional_points: 0, correct_answer_shown: false, turn_duration_seconds: 30, turn_end_at: null, active_question: null };
    api.getState().subscribe(state => {
      expect(state.current_turn).toBe(0);
    });
    const req = httpMock.expectOne(`${API_BASE}/api/state`);
    expect(req.request.method).toBe('GET');
    req.flush(mock);
  });

  it('getPlayers debe hacer GET /api/players', () => {
    const mock = [{ id: 1, name: 'A', points: 0 }];
    api.getPlayers().subscribe(players => {
      expect(players.length).toBe(1);
      expect(players[0].name).toBe('A');
    });
    const req = httpMock.expectOne(`${API_BASE}/api/players`);
    expect(req.request.method).toBe('GET');
    req.flush(mock);
  });

  it('getColors debe hacer GET /api/colors', () => {
    const mock = [{ id: 2, name: 'Rojo', hexValue: '#f00' }];
    api.getColors().subscribe(colors => expect(colors[0].id).toBe(2));
    const req = httpMock.expectOne(`${API_BASE}/api/colors`);
    expect(req.request.method).toBe('GET');
    req.flush(mock);
  });
});


