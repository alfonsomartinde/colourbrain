import { TestBed } from '@angular/core/testing';
import { SseService } from './sse.service';
import { API_BASE } from './env';
import { provideZonelessChangeDetection } from '@angular/core';

describe('SseService (board-app)', () => {
  let svc: SseService;
  let originalES: any;

  class MockEventSource {
    url: string;
    onmessage: ((this: EventSource, ev: MessageEvent) => any) | null = null;
    onerror: ((this: EventSource, ev: Event) => any) | null = null;
    constructor(url: string) {
      this.url = url;
      const list = ((window as any).__esInstances ||= []);
      list.push(this);
    }
    close() {}
  }

  beforeEach(() => {
    originalES = (window as any).EventSource;
    (window as any).EventSource = MockEventSource as any;
    (window as any).__esInstances = [];
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    svc = TestBed.inject(SseService);
  });

  afterEach(() => {
    (window as any).EventSource = originalES;
  });

  it('emite datos JSON parseados', (done) => {
    svc.connect('/sse/test').subscribe({
      next: v => { expect(v).toEqual({ ok: true }); done(); }
    });
    const es = (window as any).__esInstances[0];
    es.onmessage?.({ data: JSON.stringify({ ok: true }) } as MessageEvent);
  });

  it('propaga error y cierra', (done) => {
    svc.connect('/sse/test').subscribe({ error: () => done() });
    const es = (window as any).__esInstances[0];
    es.onerror?.(new Event('error'));
  });
});
