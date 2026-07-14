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
 * Landing interna do Tichr Wor: "vende" a dinâmica ao professor antes do setup.
 * Mobile-first — tudo empilhado com gap; o grid de 3 colunas só abre no desktop.
 * Descoberta aberta a todos; o CTA converte: PhD abre o setup, senão faz upsell.
 */
@Component({
  selector: 'app-wor-landing-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Modal, RegrasJogoView],
  template: `
    <a class="voltar" routerLink="/jogos">‹ Jogos</a>

    <header class="hero">
      <span class="hero__ic"><app-icon name="castle" [size]="40" /></span>
      <h1>Tichr Wor</h1>
      <p class="hero__sub">
        Transforme a revisão da matéria em uma guerra épica de sobrevivência.
      </p>
    </header>

    <section class="como">
      <article class="passo">
        <span class="passo__ic"><app-icon name="sword" [size]="24" /></span>
        <h2>A Guerra</h2>
        <p>
          Cada equipe defende um castelo. Acertar as letras da palavra secreta
          libera o ataque ao castelo rival — e a equipe vota em quem atacar.
        </p>
      </article>
      <article class="passo">
        <span class="passo__ic"><app-icon name="sparkles" [size]="24" /></span>
        <h2>As Dicas Mágicas</h2>
        <p>
          As palavras têm 3 dicas progressivas. Deixe a IA criar enigmas
          perfeitos para o seu tema.
        </p>
      </article>
      <article class="passo">
        <span class="passo__ic"><app-icon name="shield" [size]="24" /></span>
        <h2>A Horda (Sem Eliminação)</h2>
        <p>
          Castelos caem, mas os alunos continuam jogando. Equipes destruídas
          viram Usurpadores e podem roubar a liderança.
        </p>
      </article>
    </section>

    <section class="recompensas">
      <h2 class="recompensas__tit">Tabela de Recompensas (XP)</h2>
      <p class="recompensas__sub">
        Quanto vale cada jogada — a turma joga sabendo exatamente o que está em disputa.
      </p>
      <app-regras-jogo [regras]="regras" [mostrarResumo]="false" [mostrarComo]="false" />
    </section>

    <button class="btn-forjar" type="button" (click)="forjar()">
      <app-icon name="castle" [size]="18" /> Forjar Nova Batalha
    </button>

    <app-modal
      [open]="upsell()"
      title="Tichr Wor é do plano PhD"
      (close)="upsell.set(false)"
    >
      <p class="muted">
        Criar e rodar batalhas ao vivo faz parte do plano <strong>PhD</strong>.
        Faça upgrade para transformar a revisão da turma numa guerra épica.
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
    .voltar:hover { color: #b45309; }
    .hero { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.6rem; margin-bottom: 2rem; }
    .hero__ic { display: inline-flex; align-items: center; justify-content: center; width: 76px; height: 76px; border-radius: 20px; color: #b45309; background: color-mix(in srgb, #b45309 12%, transparent); }
    .hero h1 { margin: 0; font-size: 2rem; font-weight: 800; letter-spacing: -0.02em; }
    .hero__sub { margin: 0; max-width: 30rem; color: var(--text-muted); font-size: 1.05rem; }
    .como { display: grid; grid-template-columns: 1fr; gap: 1rem; margin-bottom: 2rem; }
    @media (min-width: 780px) { .como { grid-template-columns: repeat(3, 1fr); } }
    .passo { display: flex; flex-direction: column; gap: 0.6rem; padding: 1.25rem; border: 1px solid var(--border); border-radius: 16px; background: var(--surface); }
    .passo__ic { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 12px; color: #b45309; background: color-mix(in srgb, #b45309 12%, transparent); }
    .passo h2 { margin: 0; font-size: 1.1rem; }
    .passo p { margin: 0; color: var(--text-muted); font-size: 0.95rem; line-height: 1.55; }
    .btn-forjar {
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      width: 100%; padding: 1rem; border: none; border-radius: 14px; cursor: pointer;
      font: inherit; font-weight: 800; font-size: 1.1rem; color: #fff;
      background: linear-gradient(135deg, #b45309, #7c2d12);
      box-shadow: 0 10px 30px color-mix(in srgb, #b45309 40%, transparent);
      transition: transform 0.15s ease;
    }
    .btn-forjar:hover { transform: translateY(-2px); }
    .btn-forjar:active { transform: translateY(0); }
    .muted { color: var(--text-muted); margin: 0; }
    .recompensas { padding: 1.25rem; margin-bottom: 2rem; border: 1px solid var(--border); border-radius: 16px; background: var(--surface); }
    .recompensas__tit { margin: 0; font-size: 1.25rem; }
    .recompensas__sub { margin: 0.35rem 0 1rem; color: var(--text-muted); font-size: 0.95rem; }
  `,
})
export class WorLandingPage {
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);
  protected readonly upsell = signal(false);
  protected readonly regras = REGRAS_JOGO.WOR;

  private readonly ehPhd = computed(() =>
    planoAtendeMinimo(this.profileService.profile()?.planoAtual, 'PHD'),
  );

  /** CTA: PhD abre o setup; senão dispara o upsell (descoberta aberta a todos). */
  protected forjar(): void {
    if (this.ehPhd()) {
      this.router.navigate(['/jogos/wor/novo']);
    } else {
      this.upsell.set(true);
    }
  }

  protected irParaPlanos(): void {
    this.upsell.set(false);
    this.router.navigate(['/planos'], { queryParams: { recurso: 'WOR' } });
  }
}
