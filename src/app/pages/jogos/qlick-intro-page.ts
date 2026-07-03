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
import { Icon } from '../../ui/icon/icon';
import { Modal } from '../../ui/modal/modal';

/**
 * Mini landing (in-app) do Tichr Qlick: apresenta a dinâmica e converte.
 * CTA "Criar o meu Qlick": PhD abre o estúdio; senão dispara o upsell.
 */
@Component({
  selector: 'app-qlick-intro-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Modal],
  template: `
    <a class="voltar" routerLink="/jogos">← Jogos</a>

    <header class="hero">
      <span class="hero__icon"><app-icon name="game" [size]="34" /></span>
      <h1>Tichr Qlick</h1>
      <p class="hero__sub">
        O quiz ao vivo que transforma a revisão num game show. Perguntas
        cronometradas, pódio a cada rodada e um ranking final que vira XP.
      </p>
      <button class="btn-primary hero__cta" type="button" (click)="criar()">
        Criar o meu Qlick
      </button>
    </header>

    <section class="preview">
      <div class="tela">
        <span class="tela__tag">Visão do aluno</span>
        <p class="tela__q">Qual tag define um parágrafo em HTML?</p>
        <div class="tela__alts">
          <span class="alt alt--a">&lt;p&gt;</span>
          <span class="alt alt--b">&lt;div&gt;</span>
          <span class="alt alt--c">&lt;span&gt;</span>
          <span class="alt alt--d">&lt;br&gt;</span>
        </div>
        <span class="tela__timer">12s restantes</span>
      </div>
      <div class="podio">
        <span class="tela__tag">Pódio da rodada</span>
        <div class="podio__cols">
          <div class="podio__col podio__col--2"><span>2</span>Ana</div>
          <div class="podio__col podio__col--1"><span>1</span>Duda</div>
          <div class="podio__col podio__col--3"><span>3</span>Bruno</div>
        </div>
      </div>
    </section>

    <section class="benef">
      <h2>Por que usar</h2>
      <div class="benef__grid">
        @for (b of beneficios; track b.titulo) {
          <article class="benef__card">
            <span class="benef__icon"><app-icon [name]="b.icone" [size]="22" /></span>
            <h3>{{ b.titulo }}</h3>
            <p>{{ b.texto }}</p>
          </article>
        }
      </div>
    </section>

    <div class="final">
      <button class="btn-primary" type="button" (click)="criar()">
        Criar o meu Qlick
      </button>
    </div>

    <app-modal
      [open]="upsell()"
      title="Tichr Qlick é do plano PhD"
      (close)="upsell.set(false)"
    >
      <p class="muted">
        Criar e rodar dinâmicas ao vivo faz parte do plano <strong>PhD</strong>.
        Faça upgrade para engajar sua turma em tempo real.
      </p>
      <div modal-actions>
        <button class="btn-outline" type="button" (click)="upsell.set(false)">Agora não</button>
        <button class="btn-primary" type="button" (click)="irParaPlanos()">Fazer upgrade</button>
      </div>
    </app-modal>
  `,
  styles: `
    .voltar { color: var(--primary); font-weight: 600; }
    .hero { text-align: center; padding: 1.5rem 0 2rem; }
    .hero__icon { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 18px; color: var(--primary-contrast); background: var(--primary); }
    .hero h1 { margin: 0.75rem 0 0.5rem; font-size: 1.9rem; font-weight: 800; }
    .hero__sub { max-width: 34rem; margin: 0 auto 1.25rem; color: var(--text-muted); }
    .hero__cta { padding: 0.8rem 1.75rem; font-size: 1.05rem; }

    .preview { display: grid; grid-template-columns: 1fr; gap: 1rem; margin-bottom: 2.5rem; }
    @media (min-width: 640px) { .preview { grid-template-columns: 1.2fr 0.8fr; } }
    .tela, .podio { border: 1px solid var(--border); border-radius: 16px; background: var(--surface); padding: 1.25rem; }
    .tela__tag { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
    .tela__q { margin: 0.6rem 0 1rem; font-weight: 700; font-size: 1.05rem; }
    .tela__alts { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .alt { padding: 0.7rem; border-radius: 10px; font-weight: 700; color: #fff; text-align: center; }
    .alt--a { background: #ef4444; } .alt--b { background: #3b82f6; } .alt--c { background: #f59e0b; } .alt--d { background: #22c55e; }
    .tela__timer { display: inline-block; margin-top: 0.9rem; font-weight: 700; color: var(--primary); }
    .podio__cols { display: flex; align-items: flex-end; justify-content: center; gap: 0.4rem; margin-top: 1.2rem; }
    .podio__col { flex: 1; max-width: 4.5rem; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 0.3rem; padding-top: 0.4rem; border-radius: 8px 8px 0 0; font-weight: 700; font-size: 0.85rem; color: var(--text); background: var(--surface-alt); }
    .podio__col span { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 999px; color: #fff; font-size: 0.75rem; font-weight: 800; }
    .podio__col--1 { height: 92px; } .podio__col--1 span { background: #f59e0b; }
    .podio__col--2 { height: 68px; } .podio__col--2 span { background: #94a3b8; }
    .podio__col--3 { height: 52px; } .podio__col--3 span { background: #b45309; }

    .benef h2 { font-size: 1.3rem; font-weight: 800; margin: 0 0 1rem; text-align: center; }
    .benef__grid { display: grid; grid-template-columns: 1fr; gap: 0.85rem; }
    @media (min-width: 640px) { .benef__grid { grid-template-columns: 1fr 1fr; } }
    .benef__card { padding: 1.1rem 1.25rem; border: 1px solid var(--border); border-radius: 14px; background: var(--surface); }
    .benef__icon { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 12px; color: var(--primary); background: color-mix(in srgb, var(--primary) 12%, transparent); }
    .benef__card h3 { margin: 0.6rem 0 0.3rem; font-size: 1.05rem; }
    .benef__card p { margin: 0; color: var(--text-muted); font-size: 0.92rem; }

    .final { text-align: center; padding: 2.5rem 0 1rem; }
    .final .btn-primary { padding: 0.8rem 1.75rem; font-size: 1.05rem; }
    .muted { color: var(--text-muted); margin: 0; }
  `,
})
export class QlickIntroPage {
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);
  protected readonly upsell = signal(false);

  protected readonly beneficios = [
    { icone: 'alert' as const, titulo: 'Foco total', texto: 'Cronômetro e ritmo de game show prendem a atenção da turma inteira.' },
    { icone: 'users' as const, titulo: 'Todo mundo joga', texto: 'Cada aluno responde do próprio celular, sem instalar nada.' },
    { icone: 'trophy' as const, titulo: 'Feedback na hora', texto: 'A resposta certa e o pódio aparecem a cada rodada.' },
    { icone: 'book' as const, titulo: 'Conectado ao conteúdo', texto: 'Vincule o Qlick a uma disciplina e a um tópico do plano de aula.' },
  ];

  private readonly ehPhd = computed(() =>
    planoAtendeMinimo(this.profileService.profile()?.planoAtual, 'PHD'),
  );

  constructor() {
    if (!this.profileService.profile()) {
      this.profileService.load().subscribe({ error: () => {} });
    }
  }

  protected criar(): void {
    if (this.ehPhd()) {
      this.router.navigate(['/jogos/qlick/meus']);
    } else {
      this.upsell.set(true);
    }
  }

  protected irParaPlanos(): void {
    this.upsell.set(false);
    this.router.navigate(['/planos'], { queryParams: { recurso: 'QLICK' } });
  }
}
