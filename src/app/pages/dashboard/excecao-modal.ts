import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { CriarExcecaoPayload, EscopoExcecao } from '../../core/models';

/**
 * Modal para cadastrar uma excecao (feriado/imprevisto). Componente burro:
 * captura os dados e emite; quem persiste e dispara o recalculo e a Page.
 */
@Component({
  selector: 'app-excecao-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="overlay" (click)="fechar.emit()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2 class="modal__title">Adicionar exceção</h2>
          <p class="modal__hint">
            Bloqueie uma data. O Tichr recalcula as aulas modulares
            automaticamente.
          </p>

          <label class="campo">
            <span>Data</span>
            <input class="tichr-input" type="date" [value]="data()" (input)="data.set($any($event.target).value)" />
          </label>

          <label class="campo">
            <span>Motivo</span>
            <input class="tichr-input" [value]="motivo()" (input)="motivo.set($any($event.target).value)" placeholder="Ex: Feriado, reunião…" />
          </label>

          <label class="campo">
            <span>Tipo</span>
            <select class="tichr-input" [value]="escopo()" (change)="escopo.set($any($event.target).value)">
              <option value="GLOBAL">Feriado (global)</option>
              <option value="ESCOLA">Evento da escola</option>
              <option value="PESSOAL">Imprevisto pessoal</option>
            </select>
          </label>

          <div class="acoes">
            <button class="btn-outline" type="button" (click)="fechar.emit()">Cancelar</button>
            <button class="btn-primary" type="button" [disabled]="!podeConfirmar()" (click)="confirmar()">
              Adicionar
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      z-index: 60;
    }
    .modal {
      width: min(420px, 100%);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.25rem;
    }
    .modal__title {
      margin: 0 0 0.25rem;
      font-size: 1.2rem;
      font-weight: 700;
    }
    .modal__hint {
      margin: 0 0 1rem;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .campo {
      display: block;
      margin-bottom: 0.875rem;
    }
    .campo > span {
      display: block;
      margin-bottom: 0.375rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
    }
    .acoes {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
  `,
})
export class ExcecaoModal {
  readonly open = input(false);
  readonly confirmar_ = output<CriarExcecaoPayload>({ alias: 'confirmar' });
  readonly fechar = output<void>();

  protected readonly data = signal('');
  protected readonly motivo = signal('');
  protected readonly escopo = signal<EscopoExcecao>('GLOBAL');

  protected podeConfirmar(): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(this.data()) && this.motivo().trim().length > 0;
  }

  protected confirmar(): void {
    if (!this.podeConfirmar()) {
      return;
    }
    this.confirmar_.emit({
      data: this.data(),
      motivo: this.motivo().trim(),
      escopo: this.escopo(),
    });
  }
}
