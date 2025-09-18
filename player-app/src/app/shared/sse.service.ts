import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from './env';

/**
 * Minimal SSE wrapper using EventSource.
 * Converts raw SSE messages to an Observable of parsed JSON payloads.
 */
@Injectable({ providedIn: 'root' })
export class SseService {
  /**
   * Opens an SSE connection to the backend and emits JSON-parsed messages.
   * @param path SSE endpoint path, e.g. '/api/events/stream'
   * @returns Observable<T> that completes on error/teardown
   * @example
   * this.sse.connect<State>('/api/events/stream').subscribe(state => ...);
   */
  connect<T = unknown>(path: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      const es = new EventSource(`${API_BASE}${path}`);
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as T;
          subscriber.next(data);
        } catch {
          // ignore
        }
      };
      es.onerror = (err) => {
        subscriber.error(err);
        es.close();
      };
      return () => es.close();
    });
  }
}
