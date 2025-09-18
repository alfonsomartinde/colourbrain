import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

export function provideHttpTesting() {
  return [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()];
}


