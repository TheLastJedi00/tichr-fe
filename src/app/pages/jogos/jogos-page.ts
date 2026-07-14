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

      <a class="jogo jogo--destaque jogo--wor" routerLink="/jogos/wor">
        <span class="jogo__badge jogo__badge--pvp">PvP</span>
        <span class="jogo__icon jogo__icon--wor"><app-icon name="castle" [size]="30" /></span>
        <h2 class="jogo__nome">Tichr Wor</h2>
        <p class="jogo__desc">
          Guerra de castelos: equipes decifram palavras, atacam rivais e defendem
          o HP da sua fortaleza. Sobrevivência épica, sem eliminação.
        </p>
        <span class="jogo__cta">Conhecer →</span>
      </a>

      <a class="jogo jogo--destaque jogo--iso" routerLink="/jogos/isolateus">
        <span class="jogo__badge jogo__badge--iso">Dedução</span>
        <span class="jogo__icon jogo__icon--iso"><app-icon name="alien" [size]="30" /></span>
        <h2 class="jogo__nome">Tichr Isolateus</h2>
        <p class="jogo__desc">
          Uma vila isolada, um infiltrado disfarçado. A turma responde para
          defender os setores e debate para descobrir quem é a Ameaça.
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
    /* Tema medieval do Tichr Wor */
    .jogo--wor { border-color: #b45309; }
    .jogo--wor:hover { box-shadow: 0 16px 40px color-mix(in srgb, #b45309 24%, transparent); }
    .jogo--wor .jogo__cta { color: #b45309; }
    .jogo__icon--wor { color: #b45309; background: color-mix(in srgb, #b45309 14%, transparent); }
    .jogo__badge--pvp { background: #b45309; }
    /* Tema de quarentena do Tichr Isolateus (verde tóxico) */
    .jogo--iso { border-color: #84cc16; }
    .jogo--iso:hover { box-shadow: 0 16px 40px color-mix(in srgb, #84cc16 26%, transparent); }
    .jogo--iso .jogo__cta { color: #4d7c0f; }
    .jogo__icon--iso { color: #4d7c0f; background: color-mix(in srgb, #84cc16 18%, transparent); }
    .jogo__badge--iso { background: #4d7c0f; }
    .soon { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; opacity: 0.7; }
    .soon__nome { font-weight: 700; }
    .soon__tag { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); background: var(--surface-alt); padding: 0.15rem 0.5rem; border-radius: 999px; }
  `,
})
export class JogosPage {
  protected readonly emBreve = ['Tichr Duelo', 'Tichr Missão'];
}
