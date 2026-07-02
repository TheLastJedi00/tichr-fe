import { Injectable, signal } from '@angular/core';

export interface AppError {
  titulo: string;
  mensagem: string;
}

/**
 * Estado global do modal de erro. O interceptor alimenta; o host consome.
 */
@Injectable({ providedIn: 'root' })
export class ErrorService {
  readonly erro = signal<AppError | null>(null);

  show(mensagem: string, titulo = 'Ops! Algo deu errado'): void {
    this.erro.set({ titulo, mensagem });
  }

  dismiss(): void {
    this.erro.set(null);
  }
}
