import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { planoAtendeMinimo } from '../../core/plano.util';
import { ProfileService } from '../../core/profile.service';
import { REGRAS_JOGO } from '../../core/regras-jogo.data';
import { Icon } from '../../ui/icon/icon';
import { Modal } from '../../ui/modal/modal';
import { RegrasJogoView } from '../../ui/regras-jogo/regras-jogo';

/**
 * Landing interna do Tichr Isolateus: apresenta a dinâmica ao professor antes do
 * setup. É o ponto de entrada só no primeiro uso — assim que a primeira
 * investigação é criada, a home passa direto para a lista.
 * Descoberta aberta a todos; o CTA converte: PhD abre o setup, senão faz upsell.
 */
@Component({
  selector: 'app-isolateus-landing-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Modal, RegrasJogoView],
  template: `
    <a class="voltar" routerLink="/jogos">‹ Jogos</a>

    <header class="hero">
      <span class="hero__ic"><app-icon name="alien" [size]="40" /></span>
      <h1>Tichr Isolateus</h1>
      <p class="hero__sub">
        A vila está isolada no extremo norte e algo caiu na floresta. Um
        infiltrado anda entre os seus alunos — e só a lógica os salva.
      </p>
    </header>

    <section class="dossie">
      <h2 class="dossie__tit">ARQUIVO: ISOLATEUS</h2>
      <p>
        Moradores começaram a desaparecer no meio da noite. A ameaça já está
        dentro da vila, caminhando disfarçada entre os habitantes. Para
        sobreviver, a turma precisa <strong>defender os setores respondendo
        às questões da sua aula</strong> e, no debate, descobrir quem é a Ameaça
        antes que a população inteira seja levada.
      </p>
    </section>

    <section class="como">
      <article class="passo">
        <span class="passo__ic"><app-icon name="users" [size]="24" /></span>
        <h2>A Vila e a Névoa</h2>
        <p>
          Cada aluno entra com um nome de personagem. Um deles é sorteado como a
          Ameaça. Em turmas pequenas, habitantes virtuais preenchem a vila para o
          infiltrado ter onde se esconder.
        </p>
      </article>
      <article class="passo">
        <span class="passo__ic"><app-icon name="shield" [size]="24" /></span>
        <h2>A Defesa Pedagógica</h2>
        <p>
          A cada noite um setor é sabotado ou um morador é abduzido. A turma
          responde a uma questão da sua matéria para conter o ataque — errar
          derruba a Barra de Esperança.
        </p>
      </article>
      <article class="passo">
        <span class="passo__ic"><app-icon name="radio" [size]="24" /></span>
        <h2>A Guerra de Frequências</h2>
        <p>
          O infiltrado conhece a resposta certa e transmite argumentos falsos sob
          nome alheio. Quem foi abduzido continua jogando e pode mandar sinais
          anônimos para salvar a vila.
        </p>
      </article>
    </section>

    <section class="ia">
      <span class="ia__ic"><app-icon name="sparkles" [size]="22" /></span>
      <div>
        <h2>As 10 questões saem da sua aula</h2>
        <p>
          Escreva as questões ou deixe a IA gerá-las a partir do tópico da aula.
          O jogo é o embrulho; o conteúdo cobrado é o seu.
        </p>
      </div>
    </section>

    <section class="recompensas">
      <h2 class="recompensas__tit">Tabela de Recompensas (XP)</h2>
      <p class="recompensas__sub">
        Quanto vale cada jogada — a turma joga sabendo exatamente o que está em
        disputa. Até o infiltrado pontua, se conseguir enganar a vila.
      </p>
      <app-regras-jogo [regras]="regras" [mostrarResumo]="false" [mostrarComo]="false" />
    </section>

    <button class="btn-investigar" type="button" (click)="criar()">
      <app-icon name="alien" [size]="18" /> Criar Primeira Partida
    </button>

    <app-modal
      [open]="upsell()"
      title="Tichr Isolateus é do plano PhD"
      (close)="upsell.set(false)"
    >
      <p class="muted">
        Criar e rodar investigações ao vivo faz parte do plano
        <strong>PhD</strong>. Faça upgrade para levar a dedução e o debate para
        dentro da sua aula.
      </p>
      <div modal-actions>
        <button class="btn-outline" type="button" (click)="upsell.set(false)">Agora não</button>
        <button class="btn-primary" type="button" (click)="irParaPlanos()">Fazer upgrade</button>
      </div>
    </app-modal>
  `,
  styles: `
    :host { display: block; }
    .voltar { display: inline-block; margin-bottom: 1rem; color: var(--text-muted); text-decoration: none; font-weight: 600; }
    .voltar:hover { color: #4d7c0f; }
    .hero { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.6rem; margin-bottom: 1.75rem; }
    .hero__ic { display: inline-flex; align-items: center; justify-content: center; width: 76px; height: 76px; border-radius: 20px; color: #4d7c0f; background: color-mix(in srgb, #84cc16 18%, transparent); }
    .hero h1 { margin: 0; font-size: 2rem; font-weight: 800; letter-spacing: -0.02em; }
    .hero__sub { margin: 0; max-width: 32rem; color: var(--text-muted); font-size: 1.05rem; }
    .dossie { padding: 1.25rem; margin-bottom: 1.5rem; border: 1px solid var(--border); border-left: 4px solid #84cc16; border-radius: 14px; background: var(--surface); }
    .dossie__tit { margin: 0 0 0.5rem; font-size: 0.8rem; letter-spacing: 0.18em; color: #4d7c0f; }
    .dossie p { margin: 0; color: var(--text-muted); line-height: 1.6; }
    .como { display: grid; grid-template-columns: 1fr; gap: 1rem; margin-bottom: 1.5rem; }
    @media (min-width: 780px) { .como { grid-template-columns: repeat(3, 1fr); } }
    .passo { display: flex; flex-direction: column; gap: 0.6rem; padding: 1.25rem; border: 1px solid var(--border); border-radius: 16px; background: var(--surface); }
    .passo__ic { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 12px; color: #4d7c0f; background: color-mix(in srgb, #84cc16 18%, transparent); }
    .passo h2 { margin: 0; font-size: 1.1rem; }
    .passo p { margin: 0; color: var(--text-muted); font-size: 0.95rem; line-height: 1.55; }
    .ia { display: flex; gap: 0.9rem; align-items: flex-start; padding: 1.25rem; margin-bottom: 1.5rem; border: 1px solid var(--border); border-radius: 16px; background: var(--surface-alt); }
    .ia__ic { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; height: 44px; border-radius: 12px; color: #4d7c0f; background: color-mix(in srgb, #84cc16 18%, transparent); }
    .ia h2 { margin: 0 0 0.25rem; font-size: 1.05rem; }
    .ia p { margin: 0; color: var(--text-muted); font-size: 0.95rem; line-height: 1.55; }
    .recompensas { padding: 1.25rem; margin-bottom: 2rem; border: 1px solid var(--border); border-radius: 16px; background: var(--surface); }
    .recompensas__tit { margin: 0; font-size: 1.25rem; }
    .recompensas__sub { margin: 0.35rem 0 1rem; color: var(--text-muted); font-size: 0.95rem; }
    .btn-investigar {
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      width: 100%; padding: 1rem; border: none; border-radius: 14px; cursor: pointer;
      font: inherit; font-weight: 800; font-size: 1.1rem; color: #fff;
      background: linear-gradient(135deg, #84cc16, #4d7c0f);
      box-shadow: 0 10px 30px color-mix(in srgb, #84cc16 40%, transparent);
      transition: transform 0.15s ease;
    }
    .btn-investigar:hover { transform: translateY(-2px); }
    .btn-investigar:active { transform: translateY(0); }
    .muted { color: var(--text-muted); margin: 0; }
  `,
})
export class IsolateusLandingPage {
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);
  protected readonly upsell = signal(false);
  protected readonly regras = REGRAS_JOGO.ISOLATEUS;

  private readonly ehPhd = computed(() =>
    planoAtendeMinimo(this.profileService.profile()?.planoAtual, 'PHD'),
  );

  /** CTA: PhD abre o setup; senão dispara o upsell (descoberta aberta a todos). */
  protected criar(): void {
    if (this.ehPhd()) {
      this.router.navigate(['/jogos/isolateus/novo']);
    } else {
      this.upsell.set(true);
    }
  }

  protected irParaPlanos(): void {
    this.upsell.set(false);
    this.router.navigate(['/planos'], {
      queryParams: { recurso: 'ISOLATEUS' },
    });
  }
}
