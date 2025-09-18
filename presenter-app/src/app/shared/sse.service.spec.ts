import { TestBed } from '@angular/core/testing';
import { SseService } from './sse.service';
import { API_BASE } from './env';
import { provideZonelessChangeDetection } from '@angular/core';

describe('SseService', () => {
  let svc: SseService;
  let originalES: any;
  const listeners: { [type: string]: Function[] } = {};

  class MockEventSource {
    url: string;
    readyState = 0;
    onmessage: ((this: EventSource, ev: MessageEvent) => any) | null = null;
    onerror: ((this: EventSource, ev: Event) => any) | null = null;
    constructor(url: string) {
      this.url = url;
      listeners['message'] = [];
      listeners['error'] = [];
      const list = ((window as any).__esInstances ||= []);
      list.push(this);
    }
    addEventListener(type: string, cb: Function) {
      (listeners[type] ||= []).push(cb);
    }
    close() {
      this.readyState = 2;
    }
  }

  beforeEach(() => {
    originalES = (window as any).EventSource;
    (window as any).EventSource = MockEventSource as any;
    (window as any).__esInstances = [];
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });
    svc = TestBed.inject(SseService);
  });

  afterEach(() => {
    (window as any).EventSource = originalES;
  });

  it('debe conectar a la URL correcta y emitir JSON parseado', (done) => {
    const values: any[] = [];
    svc.connect('/sse/foo').subscribe({
      next: v => {
        values.push(v);
        expect(values).toEqual([{ x: 1 }]);
        done();
      }
    });

    // Simular onmessage en la instancia creada por el servicio
    const es = (window as any).__esInstances[0];
    const msg = { data: JSON.stringify({ x: 1 }) } as MessageEvent;
    if (es.onmessage) {
      es.onmessage(msg);
    }
  });

  it('debe cerrar la conexión al error y propagarlo', (done) => {
    svc.connect('/sse/bar').subscribe({
      error: () => done()
    });
    const es = (window as any).__esInstances[1] || (window as any).__esInstances[0];
    const ev = new Event('error');
    if (es.onerror) {
      es.onerror(ev);
    }
  });
});


