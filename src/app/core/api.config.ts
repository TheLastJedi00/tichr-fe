import { InjectionToken } from '@angular/core';
import { environment } from '../../environments/environment';

/** URL base da API do backend (NestJS). Definida por ambiente. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiBaseUrl,
});
