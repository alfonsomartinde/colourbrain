import { TestBed } from '@angular/core/testing';
import { TimerComponent } from './timer.component';
import { provideZonelessChangeDetection, signal } from '@angular/core';

describe('TimerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimerComponent],
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();
  });

  it('should render secondsLeft', () => {
    const fixture = TestBed.createComponent(TimerComponent);
    // set input using ComponentRef API
    fixture.componentRef.setInput('secondsLeft', 42);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('42');
  });
});
