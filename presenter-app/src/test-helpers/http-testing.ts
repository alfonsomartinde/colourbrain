import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

/**
 * Provides HttpClient and HttpTestingController for TestBed.configureTestingModule.
 * Use in providers: [provideHttpTesting()]
 */
export function provideHttpTesting() {
  return [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()];
}


