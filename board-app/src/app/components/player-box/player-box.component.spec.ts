import { TestBed } from '@angular/core/testing';
import { PlayerBoxComponent } from './player-box.component';
import { provideZonelessChangeDetection } from '@angular/core';

describe('PlayerBoxComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerBoxComponent],
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();
  });

  it('should render points and winner class binding', () => {
    const fixture = TestBed.createComponent(PlayerBoxComponent);
    const cmp = fixture.componentInstance;
    cmp.name = 'Equipo Azul';
    cmp.points = 7;
    cmp.isWinner = true;
    cmp.answers = [];
    cmp.colors = { 1: '#ffffff' } as any;
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.player-points')?.textContent).toContain('7');
  });

  it('should render color cards when showAnswers and answers present', () => {
    const fixture = TestBed.createComponent(PlayerBoxComponent);
    const cmp = fixture.componentInstance;
    cmp.name = 'Equipo Azul';
    cmp.points = 7;
    cmp.isWinner = false;
    cmp.answers = [1, 2];
    cmp.colors = { 1: '#fff', 2: '#f00' } as any;
    cmp.showAnswers = true;
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const cards = el.querySelectorAll('.color-card');
    expect(cards.length).toBe(2);
  });
});
