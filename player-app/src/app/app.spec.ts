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

  it('should render initial screen', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    // initial ngOnInit XHRs
    httpMock.expectOne(`${API_BASE}/api/state`).flush({ phase: 'idle', current_turn: 0, additional_points: 0, correct_answer_shown: false, turn_duration_seconds: 30, turn_end_at: null, active_question: null });
    httpMock.expectOne(`${API_BASE}/api/colors`).flush([]);
    httpMock.expectOne(`${API_BASE}/api/players`).flush([]);
    const compiled = fixture.nativeElement as HTMLElement;
    // In initial state, prompt to select team exists
    expect(compiled.textContent).toContain('Selecciona tu equipo');
  });

  it('should show team header when playerId present and players loaded', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    // Responder llamadas iniciales con valores neutros
    httpMock.expectOne(`${API_BASE}/api/state`).flush({ phase: 'idle', current_turn: 1, additional_points: 0, correct_answer_shown: false, turn_duration_seconds: 30, turn_end_at: null, active_question: null });
    httpMock.expectOne(`${API_BASE}/api/colors`).flush([]);
    httpMock.expectOne(`${API_BASE}/api/players`).flush([]);

    // Forzar señales para simular selección de equipo y jugadores cargados
    (fixture.componentInstance as any).playerId.set(1);
    (fixture.componentInstance as any).players.set([{ id: 1, name: 'Equipo Azul', points: 5 }]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Equipo Azul');
  });

  it('handleColorClick should toggle selection', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    httpMock.expectOne(`${API_BASE}/api/state`).flush({ phase: 'question', current_turn: 1, additional_points: 0, correct_answer_shown: false, turn_duration_seconds: 30, turn_end_at: null, active_question: { id: 1, text: 'Q', requiredColorsCount: 1 } });
    httpMock.expectOne(`${API_BASE}/api/colors`).flush([{ id: 2, name: 'Rojo', hexValue: '#f00' }]);
    httpMock.expectOne(`${API_BASE}/api/players`).flush([]);
    const cmp: any = fixture.componentInstance as any;
    cmp.handleColorClick(2);
    expect(cmp.selectedColors()).toEqual([2]);
    cmp.handleColorClick(2);
    expect(cmp.selectedColors()).toEqual([]);
  });

  it('handleSubmitAnswer should set message and answered on success', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    httpMock.expectOne(`${API_BASE}/api/state`).flush({ phase: 'question', current_turn: 1, additional_points: 0, correct_answer_shown: false, turn_duration_seconds: 30, turn_end_at: null, active_question: { id: 1, text: 'Q', requiredColorsCount: 1 } });
    httpMock.expectOne(`${API_BASE}/api/colors`).flush([{ id: 2, name: 'Rojo', hexValue: '#f00' }]);
    httpMock.expectOne(`${API_BASE}/api/players`).flush([{ id: 1, name: 'Equipo Azul', points: 5 }]);
    const cmp: any = fixture.componentInstance as any;
    cmp.playerId.set(1);
    cmp.selectedColors.set([2]);
    cmp.handleSubmitAnswer();
    const post = httpMock.expectOne(`${API_BASE}/api/player/answer`);
    expect(post.request.method).toBe('POST');
    post.flush({ ok: true, accepted: true });
    expect(cmp.answered()).toBeTrue();
    expect(cmp.message()).toContain('Respuesta enviada');
  });

  it('handleSubmitAnswer should show error message on network error', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    httpMock.expectOne(`${API_BASE}/api/state`).flush({ phase: 'question', current_turn: 1, additional_points: 0, correct_answer_shown: false, turn_duration_seconds: 30, turn_end_at: null, active_question: { id: 1, text: 'Q', requiredColorsCount: 1 } });
    httpMock.expectOne(`${API_BASE}/api/colors`).flush([{ id: 2, name: 'Rojo', hexValue: '#f00' }]);
    httpMock.expectOne(`${API_BASE}/api/players`).flush([{ id: 1, name: 'Equipo Azul', points: 5 }]);
    const cmp: any = fixture.componentInstance as any;
    cmp.playerId.set(1);
    cmp.selectedColors.set([2]);
    cmp.handleSubmitAnswer();
    const post = httpMock.expectOne(`${API_BASE}/api/player/answer`);
    post.error(new ProgressEvent('error'));
    expect(cmp.answered()).toBeFalse();
    expect(cmp.message()).toContain('Error de red');
  });
});

