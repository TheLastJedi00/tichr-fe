import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { EnviarFeedbackPayload, Feedback } from './models';

/**
 * Canal de feedback do professor.
 *
 * Separado do `AdminApiService` de propósito: aquele é o serviço do backoffice
 * (toda rota dele exige admin), e enviar feedback é do professor comum. As duas
 * chamadas de triagem, essas sim, moram lá.
 */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  enviar(payload: EnviarFeedbackPayload): Observable<Feedback> {
    return this.http.post<Feedback>(`${this.base}/feedbacks`, payload);
  }
}
