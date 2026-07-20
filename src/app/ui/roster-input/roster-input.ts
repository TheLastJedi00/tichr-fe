import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';

/**
 * Input de cadastro em massa de alunos (o mecanismo da aba "Alunos" da turma,
 * extraído para reuso — ENH-003). Digita-se vários nomes numa linha só,
 * separados por **vírgula, hífen ou quebra de linha**, e ao enviar emite a lista
 * já limpa. Componente burro: quem persiste (chama a API) é o pai.
 */
@Component({
  selector: 'app-roster-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="roster" (submit)="$event.preventDefault(); emitir()">
      <input
        class="tichr-input"
        [placeholder]="placeholder"
        [value]="texto()"
        (input)="texto.set($any($event.target).value)"
        [disabled]="salvando"
      />
      <button class="btn-primary" type="submit" [disabled]="salvando">
        {{ rotulo }}
      </button>
    </form>
  `,
  styles: `
    .roster {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .roster .tichr-input {
      flex: 1 1 12rem;
    }
  `,
})
export class RosterInput {
  @Input() salvando = false;
  @Input() placeholder =
    'Nomes separados por vírgula, hífen ou quebra de linha';
  @Input() rotulo = 'Adicionar';

  /** Nomes já separados e aparados; vazio nunca é emitido. */
  @Output() adicionar = new EventEmitter<string[]>();

  protected readonly texto = signal('');

  protected emitir(): void {
    const nomes = RosterInput.parse(this.texto());
    if (nomes.length === 0) return;
    // Limpeza otimista: o caso comum é sucesso; num erro raro o professor
    // redigita. Evita expor um método de reset só para o pai limpar.
    this.texto.set('');
    this.adicionar.emit(nomes);
  }

  /** Separa por vírgula, quebra de linha e hífen (ENH-003), aparando vazios. */
  static parse(entrada: string): string[] {
    return entrada
      .split(/[,\n-]/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
  }
}
