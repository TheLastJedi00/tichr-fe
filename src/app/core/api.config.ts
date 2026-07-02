import { InjectionToken } from '@angular/core';

/** URL base da API do backend (NestJS). */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => 'http://localhost:3000',
});
