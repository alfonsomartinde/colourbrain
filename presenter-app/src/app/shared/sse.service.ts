import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from './env';

/** Servicio SSE simple para escuchar eventos del backend. */
@Injectable({ providedIn: 'root' })
export class SseService {
  connect<T = unknown>(path: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      const es = new EventSource(`${API_BASE}${path}`);
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as T;
          subscriber.next(data);
        } catch (e) {
          // Ignorar mensajes no JSON
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


