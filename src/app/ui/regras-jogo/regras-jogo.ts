import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RegrasJogo } from '../../core/regras-jogo.data';

/**
 * Regras + Tabela de Recompensas de um jogo. Burro: recebe a entrada do
 * `regras-jogo.data.ts` e desenha. Serve o modal do professor, o Manual de
 * Guerra do aluno e as landings — a promessa de XP é a mesma nos três.
 */
@Component({
  selector: 'app-regras-jogo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (mostrarResumo()) {
      <p class="resumo">{{ regras().resumo }}</p>
    }

    @if (mostrarComo()) {
      @for (bloco of regras().como; track bloco.titulo) {
        <section class="bloco">
          <h3>{{ bloco.titulo }}</h3>
          <ul>
            @for (item of bloco.itens; track item) { <li>{{ item }}</li> }
          </ul>
        </section>
      }
    }

    <section class="bloco">
      <h3>Tabela de Recompensas</h3>
      <ul class="tabela">
        @for (r of regras().recompensas; track r.acao) {
          <li class="linha">
            <span class="linha__acao">
              {{ r.acao }}
              @if (r.detalhe) { <small>{{ r.detalhe }}</small> }
            </span>
            <span class="linha__valor">{{ r.valor }}</span>
          </li>
        }
      </ul>
      <p class="unidade">Valores em <b>{{ regras().unidade }}</b>.</p>
      <p class="conversao">{{ regras().conversao }}</p>
    </section>
  `,
  styles: `
    :host { display: block; }
    .resumo { margin: 0 0 1rem; color: var(--text-muted); }
    .bloco { margin-bottom: 1.25rem; }
    .bloco h3 {
      margin: 0 0 0.5rem;
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }
    .bloco ul { margin: 0; padding-left: 1.1rem; display: flex; flex-direction: column; gap: 0.3rem; }
    .bloco li { color: var(--text); font-size: 0.92rem; line-height: 1.45; }
    .tabela { list-style: none; padding: 0; gap: 0; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    .linha {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.7rem 0.85rem;
      background: var(--surface);
    }
    .linha + .linha { border-top: 1px solid var(--border); }
    .linha__acao { display: flex; flex-direction: column; gap: 0.1rem; font-weight: 600; }
    .linha__acao small { color: var(--text-muted); font-weight: 500; font-size: 0.78rem; }
    .linha__valor {
      flex: 0 0 auto;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      color: var(--primary);
      white-space: nowrap;
    }
    .unidade, .conversao { margin: 0.6rem 0 0; font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; }
    .unidade b { color: var(--text); }
  `,
})
export class RegrasJogoView {
  readonly regras = input.required<RegrasJogo>();
  /** Nas landings o resumo já é o hero — dá para escondê-lo aqui. */
  readonly mostrarResumo = input(true);
  /** As landings mostram só a tabela; o manual e o modal mostram as regras completas. */
  readonly mostrarComo = input(true);
}
