import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';

/**
 * Vitrine de Jogos (descoberta). Grade dos jogos do ecossistema; o Tichr Qlick
 * é o card de destaque e leva à mini landing de apresentação.
 */
@Component({
  selector: 'app-jogos-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, Icon],
  template: `
    <h1 class="title">Jogos</h1>
    <p class="lead">Dinâmicas gamificadas para engajar a sua turma em tempo real.</p>

    <div class="grid">
      <a class="jogo jogo--destaque" routerLink="/jogos/qlick">
        <span class="jogo__badge">Novo</span>
        <span class="jogo__icon"><app-icon name="game" [size]="30" /></span>
        <h2 class="jogo__nome">Tichr Qlick</h2>
        <p class="jogo__desc">
          Quiz ao vivo estilo game show: perguntas cronometradas, pódio a cada
          rodada e ranking final que vira XP.
        </p>
        <span class="jogo__cta">Conhecer →</span>
      </a>

      @for (j of emBreve; track j) {
        <app-card>
          <div class="soon">
            <span class="soon__nome">{{ j }}</span>
            <span class="soon__tag">Em breve</span>
          </div>
        </app-card>
      }
    </div>
  `,
  styles: `
    .title { margin: 0 0 0.25rem; font-size: 1.5rem; font-weight: 700; }
    .lead { margin: 0 0 1.5rem; color: var(--text-muted); }
    .grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
    @media (min-width: 640px) { .grid { grid-template-columns: 1fr 1fr; } }
    .jogo {
      position: relative; display: flex; flex-direction: column;
      padding: 1.5rem; border: 2px solid var(--primary); border-radius: 16px;
      background: var(--surface); color: var(--text);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .jogo--destaque:hover { transform: translateY(-3px); box-shadow: 0 16px 40px color-mix(in srgb, var(--primary) 22%, transparent); }
    .jogo__badge { position: absolute; top: 1rem; right: 1rem; font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; color: var(--primary-contrast); background: var(--primary); padding: 0.15rem 0.5rem; border-radius: 999px; }
    .jogo__icon { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 14px; color: var(--primary); background: color-mix(in srgb, var(--primary) 12%, transparent); }
    .jogo__nome { margin: 1rem 0 0.4rem; font-size: 1.3rem; font-weight: 800; }
    .jogo__desc { margin: 0 0 1rem; color: var(--text-muted); font-size: 0.95rem; }
    .jogo__cta { margin-top: auto; font-weight: 700; color: var(--primary); }
    .soon { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; opacity: 0.7; }
    .soon__nome { font-weight: 700; }
    .soon__tag { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); background: var(--surface-alt); padding: 0.15rem 0.5rem; border-radius: 999px; }
  `,
})
export class JogosPage {
  protected readonly emBreve = ['Tichr Duelo', 'Tichr Missão'];
}
