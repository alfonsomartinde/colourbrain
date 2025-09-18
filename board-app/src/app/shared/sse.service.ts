import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from './env';

@Injectable({ providedIn: 'root' })
export class SseService {
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
