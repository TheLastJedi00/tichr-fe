import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * O modal da partida pausada (dumb), comum aos três jogos. Cobre a tela da
 * partida e bloqueia o fundo: enquanto o professor não retoma, nada atrás dele
 * é clicável — o servidor também recusa todo comando.
 *
 * No telão (`professor`), traz o botão "Retomar partida"; no celular do aluno,
 * só o aviso de espera.
 */
@Component({
  selector: 'app-partida-pausada',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="pausa" role="dialog" aria-modal="true" aria-labelledby="pausa-titulo">
      <div class="pausa__card">
        <span class="pausa__icone"><app-icon name="pause" [size]="28" /></span>
        <p class="pausa__jogo">{{ jogo() }}</p>
        <h2 class="pausa__titulo" id="pausa-titulo">{{ titulo() }}</h2>
        <p class="pausa__texto">Partida pausada. Aguardando o professor retomar.</p>
        @if (professor()) {
          <button
            class="btn-primary pausa__btn"
            type="button"
            [disabled]="carregando()"
            (click)="retomar.emit()"
          >
            <app-icon name="play" [size]="18" />
            {{ carregando() ? 'Retomando…' : 'Retomar partida' }}
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    .pausa {
      position: fixed;
      inset: 0;
      z-index: 200;
      display: grid;
      place-items: center;
      padding: 1rem;
      background: rgba(15, 23, 42, 0.82);
    }
    .pausa__card {
      width: min(100%, 26rem);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1.75rem 1.5rem;
      text-align: center;
      background: var(--surface);
      color: var(--text);
      border: 2px solid var(--border);
      border-radius: var(--radius);
      box-shadow: 6px 6px 0 rgba(15, 23, 42, 0.35);
    }
    .pausa__icone {
      display: grid;
      place-items: center;
      width: 3.5rem;
      height: 3.5rem;
      border-radius: 999px;
      color: var(--primary);
      background: var(--bg);
      border: 2px solid var(--primary);
    }
    .pausa__jogo {
      margin: 0.25rem 0 0;
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .pausa__titulo { margin: 0; font-size: 1.35rem; font-weight: 800; }
    .pausa__texto { margin: 0.25rem 0 0; color: var(--text-muted); }
    .pausa__btn {
      margin-top: 0.75rem;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
  `,
})
export class PartidaPausadaComponent {
  /** Nome do jogo: "Tichr Qlick", "Tichr Wor" ou "Tichr Isolateus". */
  readonly jogo = input.required<string>();
  /** Título da partida. */
  readonly titulo = input('');
  /** Telão do professor: mostra "Retomar partida". */
  readonly professor = input(false);
  readonly carregando = input(false);
  readonly retomar = output<void>();
}
