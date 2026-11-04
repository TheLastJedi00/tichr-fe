import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LogPontuacaoJogador } from '../../core/models';
import { Modal } from '../modal/modal';

/**
 * Modal do desconto por ociosidade no fim da partida (dumb, spec 032 §3.4):
 * "zerar os pontos desta partida" ou um valor. A página chama a API.
 */
@Component({
  selector: 'app-desconto-ociosidade',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Modal],
  template: `
    <app-modal [open]="!!jogador()" title="Descontar por ociosidade" (close)="fechar.emit()">
      @if (jogador(); as j) {
        <div class="dc">
          <p>
            <strong>{{ j.nome }}</strong> ficou {{ j.faltasOciosidade ?? 0 }}
            {{ (j.faltasOciosidade ?? 0) === 1 ? 'rodada' : 'rodadas' }} sem jogar.
            Esta partida rendeu {{ j.creditoRanking }} {{ unidade() }} a ele no ranking.
          </p>
          <label class="op">
            <input type="radio" name="modo" [checked]="modo() === 'ZERAR_PARTIDA'" (change)="modo.set('ZERAR_PARTIDA')" />
            <span>Zerar os pontos desta partida (−{{ j.creditoRanking }} {{ unidade() }})</span>
          </label>
          <label class="op">
            <input type="radio" name="modo" [checked]="modo() === 'VALOR'" (change)="modo.set('VALOR')" />
            <span>Descontar outro valor</span>
          </label>
          @if (modo() === 'VALOR') {
            <input
              class="tichr-input"
              type="number"
              min="1"
              step="100"
              [ngModel]="pontos()"
              (ngModelChange)="pontos.set(+$event || 0)"
              aria-label="Pontos a descontar"
            />
          }
          <p class="hint">O desconto sai do {{ unidade() }} do aluno (nunca fica negativo) e aparece no log da partida.</p>
        </div>
      }
      <div modal-actions>
        <button type="button" class="btn-outline" (click)="fechar.emit()">Cancelar</button>
        <button
          type="button"
          class="btn-primary"
          [disabled]="ocupado() || (modo() === 'VALOR' ? pontos() < 1 : (jogador()?.creditoRanking ?? 0) < 1)"
          (click)="confirmar.emit(modo() === 'VALOR' ? { modo: 'VALOR', pontos: pontos() } : { modo: 'ZERAR_PARTIDA' })"
        >
          Descontar
        </button>
      </div>
    </app-modal>
  `,
  styles: `
    .dc { display: flex; flex-direction: column; gap: 0.6rem; }
    .dc p { margin: 0; }
    .op { display: flex; gap: 0.5rem; align-items: center; cursor: pointer; }
    .op input { accent-color: var(--primary); }
    .hint { font-size: 0.85rem; color: var(--text-muted); }
  `,
})
export class DescontoOciosidadeComponent {
  readonly jogador = input<LogPontuacaoJogador | null>(null);
  readonly unidade = input('XP');
  readonly ocupado = input(false);
  readonly confirmar = output<{ modo: 'ZERAR_PARTIDA' | 'VALOR'; pontos?: number }>();
  readonly fechar = output<void>();

  protected readonly modo = signal<'ZERAR_PARTIDA' | 'VALOR'>('ZERAR_PARTIDA');
  protected readonly pontos = signal(0);

  constructor() {
    // Cada aluno aberto começa em "zerar".
    effect(() => {
      if (this.jogador()) {
        this.modo.set('ZERAR_PARTIDA');
        this.pontos.set(0);
      }
    });
  }
}
