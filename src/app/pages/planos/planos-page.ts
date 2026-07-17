import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PlanoAtual } from '../../core/models';
import { NOME_PLANO } from '../../core/plano.util';
import { PLANOS } from '../../core/planos.data';
import { ProfileService } from '../../core/profile.service';
import {
  NOME_RECURSO,
  RECURSO_PLANO_MINIMO,
  Recurso,
} from '../../core/recursos';

/**
 * Painel de assinatura (smart): vitrine dos planos com destaque no plano atual.
 * Trocar de plano leva à tela de pagamento (/checkout). Acessado pelo atalho das
 * Configuracoes ou por redirecionamento quando um recurso exige upgrade (?recurso=...).
 */
@Component({
  selector: 'app-planos-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="title">Planos</h1>

    @if (avisoRecurso(); as aviso) {
      <div class="aviso" role="alert">
        <strong>{{ aviso.nome }}</strong> faz parte do plano
        <strong>{{ aviso.plano }}</strong>. Faça upgrade para desbloquear.
      </div>
    }

    <div class="grid">
      @for (p of planos; track p.plano) {
        <article class="plano" [class.plano--atual]="p.plano === planoAtual()">
          @if (p.plano === planoAtual()) {
            <span class="plano__badge">Plano atual</span>
          } @else if (p.destaque) {
            <span class="plano__badge plano__badge--pop">Mais popular</span>
          }
          <h2 class="plano__nome">{{ p.nome }}</h2>
          <p class="plano__preco">
            <strong>{{ p.preco }}</strong>{{ p.periodo }}
          </p>
          <p class="plano__limite">{{ p.limite }}</p>
          <ul class="plano__features">
            @for (f of p.features; track f) {
              <li>{{ f }}</li>
            }
          </ul>
          <button
            class="btn-primary plano__cta"
            type="button"
            [disabled]="p.plano === planoAtual()"
            (click)="mudar(p.plano)"
          >
            @if (p.plano === planoAtual()) {
              Seu plano
            } @else {
              Mudar para {{ nomePlano(p.plano) }}
            }
          </button>
        </article>
      }
    </div>
  `,
  styles: `
    .title { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 700; }
    .aviso {
      margin-bottom: 1rem;
      padding: 0.75rem 1rem;
      border: 1px solid var(--primary);
      border-radius: var(--radius);
      background: color-mix(in srgb, var(--primary) 8%, transparent);
      color: var(--text);
    }
    .ok { color: var(--success); font-weight: 600; margin: 0 0 1rem; }
    .grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    @media (min-width: 560px) {
      .grid { grid-template-columns: 1fr 1fr; }
    }
    .plano {
      position: relative;
      display: flex;
      flex-direction: column;
      padding: 1.25rem;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--surface);
    }
    .plano--atual { border-color: var(--primary); border-width: 2px; }
    .plano__badge {
      align-self: flex-start;
      margin-bottom: 0.5rem;
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      color: var(--primary-contrast);
      background: var(--primary);
    }
    .plano__badge--pop { color: var(--text); background: var(--surface-alt); }
    .plano__nome { margin: 0 0 0.35rem; font-size: 1.15rem; font-weight: 800; }
    .plano__preco { margin: 0 0 0.25rem; }
    .plano__preco strong { font-size: 1.4rem; }
    .plano__limite { margin: 0 0 0.75rem; color: var(--text-muted); font-size: 0.9rem; }
    .plano__features {
      list-style: none;
      margin: 0 0 1rem;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      font-size: 0.9rem;
    }
    .plano__features li { padding-left: 1.1rem; position: relative; }
    .plano__features li::before {
      content: '✓';
      position: absolute;
      left: 0;
      color: var(--success);
      font-weight: 700;
    }
    .plano__cta { margin-top: auto; width: 100%; }
  `,
})
export class PlanosPage {
  private readonly profileService = inject(ProfileService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly planos = PLANOS;

  protected readonly planoAtual = computed<PlanoAtual>(
    () => this.profileService.profile()?.planoAtual ?? 'ESTAGIARIO',
  );

  /** Contexto do recurso que disparou o redirecionamento (?recurso=...). */
  protected readonly avisoRecurso = computed(() => {
    const r = this.route.snapshot.queryParamMap.get('recurso') as Recurso | null;
    if (!r || !(r in RECURSO_PLANO_MINIMO)) {
      return null;
    }
    return {
      nome: NOME_RECURSO[r],
      plano: NOME_PLANO[RECURSO_PLANO_MINIMO[r]],
    };
  });

  constructor() {
    if (!this.profileService.profile()) {
      this.profileService.load().subscribe({ error: () => {} });
    }
  }

  protected nomePlano(p: PlanoAtual): string {
    return NOME_PLANO[p];
  }

  /** Leva à tela de pagamento com o plano escolhido. */
  protected mudar(plano: PlanoAtual): void {
    if (plano === this.planoAtual()) {
      return;
    }
    this.router.navigate(['/checkout'], {
      queryParams: { tipo: 'upgrade', plano },
    });
  }
}
