import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PLANOS } from '../../core/planos.data';
import { NOME_PLANO } from '../../core/plano.util';
import { ProfileService } from '../../core/profile.service';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { Spinner } from '../../ui/spinner/spinner';

/** Meu Plano: resumo da assinatura atual + upsell + atalho de gestão. */
@Component({
  selector: 'app-meu-plano-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, Spinner, Icon],
  template: `
    <a class="voltar" routerLink="/configuracoes">‹ Configurações</a>
    <h1 class="title">Meu Plano</h1>

    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else {
      @if (inadimplente()) {
        <div class="vencido" role="alert">
          <strong>Seu plano venceu.</strong>
          <p>Seus dados estão salvos — turmas, jogos e histórico continuam aqui. Renove para reativar o acesso.</p>
          <button class="btn-primary" type="button" (click)="renovar()">Renovar {{ planoLabel() }}</button>
        </div>
      }

      <app-card>
        <div class="atual">
          <div>
            <span class="atual__label">Assinatura atual</span>
            <strong class="atual__plano">{{ planoLabel() }}</strong>
            <p class="atual__limite">{{ plano()?.limite }}</p>
          </div>
          <span class="atual__preco">{{ plano()?.preco }}<small>{{ plano()?.periodo }}</small></span>
        </div>

        @if (slots() > 0) {
          <p class="slots">+ {{ slots() }} {{ slots() === 1 ? 'vaga avulsa' : 'vagas avulsas' }} de turma</p>
        }

        @if (plano()?.features?.length) {
          <ul class="features">
            @for (f of plano()!.features; track f) {
              <li>{{ f }}</li>
            }
          </ul>
        }
      </app-card>

      @if (!isPhd()) {
        <app-card>
          <div class="upsell">
            <strong>Quer desbloquear mais?</strong>
            <p>Planos superiores liberam gestão de alunos e equipes, gamificação e o ecossistema de jogos (Tichr Qlick e Wor).</p>
            <a class="btn-primary" routerLink="/planos">Ver planos e fazer upgrade</a>
          </div>
        </app-card>
      } @else {
        <app-card>
          <div class="upsell">
            <strong>Você está no topo <app-icon name="trophy" [size]="18" /></strong>
            <p>O plano PhD libera todos os recursos do Tichr. Gerencie sua assinatura quando quiser.</p>
            <a class="btn-outline" routerLink="/planos">Gerenciar assinatura</a>
          </div>
        </app-card>
      }

      <app-card>
        <div class="cupom">
          <strong>Tem um cupom?</strong>
          <p class="cupom__hint">Aplique um código para desconto ou meses grátis.</p>
          <div class="cupom__row">
            <input
              class="tichr-input"
              placeholder="CÓDIGO"
              [value]="cupom()"
              (input)="cupom.set($any($event.target).value.toUpperCase())"
            />
            <button class="btn-primary" type="button" [disabled]="aplicando() || !cupom().trim()" (click)="aplicar()">
              {{ aplicando() ? 'Aplicando…' : 'Aplicar' }}
            </button>
          </div>
          @if (cupomMsg(); as m) {
            <p class="cupom__msg" [class.err]="cupomErro()">{{ m }}</p>
          }
        </div>
      </app-card>

      @if (assinaturaAte(); as ate) {
        <p class="cobranca">Sua assinatura vale até {{ ate }}. A cobrança é mensal, via PIX ou cartão.</p>
      }
    }
  `,
  styles: `
    .voltar { display: inline-block; margin-bottom: 0.5rem; color: var(--text-muted); text-decoration: none; font-weight: 600; }
    .voltar:hover { color: var(--primary); }
    .title { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 700; }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .atual { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
    .atual__label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
    .atual__plano { font-size: 1.25rem; font-weight: 800; }
    .atual__limite { margin: 0.25rem 0 0; color: var(--text-muted); font-size: 0.9rem; }
    .atual__preco { font-size: 1.15rem; font-weight: 800; white-space: nowrap; }
    .atual__preco small { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
    .slots { margin: 0.75rem 0 0; font-weight: 600; color: var(--primary); }
    .features { margin: 0.9rem 0 0; padding-left: 1.1rem; display: grid; gap: 0.3rem; color: var(--text-muted); font-size: 0.9rem; }
    .upsell { display: flex; flex-direction: column; align-items: flex-start; gap: 0.5rem; }
    .upsell p { margin: 0; color: var(--text-muted); }
    .upsell .btn-primary, .upsell .btn-outline { text-decoration: none; margin-top: 0.25rem; }
    .cobranca { margin: 1rem 0 0; color: var(--text-muted); font-size: 0.82rem; }
    .vencido {
      margin-bottom: 1rem; padding: 1rem;
      border: 1px solid var(--danger); border-radius: var(--radius);
      background: color-mix(in srgb, var(--danger) 8%, transparent);
      display: flex; flex-direction: column; align-items: flex-start; gap: 0.5rem;
    }
    .vencido p { margin: 0; color: var(--text-muted); }
    .vencido .btn-primary { margin-top: 0.25rem; }
    app-card + app-card { display: block; margin-top: 1rem; }
    .cupom { display: flex; flex-direction: column; gap: 0.5rem; }
    .cupom__hint { margin: 0; color: var(--text-muted); font-size: 0.85rem; }
    .cupom__row { display: flex; gap: 0.5rem; }
    .cupom__row .tichr-input { flex: 1; text-transform: uppercase; letter-spacing: 0.05em; }
    .cupom__msg { margin: 0; font-size: 0.85rem; color: var(--success, #16a34a); font-weight: 600; }
    .cupom__msg.err { color: var(--danger); }
  `,
})
export class MeuPlanoPage {
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);

  protected readonly profile = this.profileService.profile;
  protected readonly carregando = signal(true);

  /** Plano contratado (o que o professor paga) — vale mesmo se estiver vencido. */
  private readonly planoContratado = computed(
    () => this.profile()?.planoContratado ?? this.profile()?.planoAtual ?? 'ESTAGIARIO',
  );

  protected readonly planoLabel = computed(() => NOME_PLANO[this.planoContratado()]);
  protected readonly plano = computed(() =>
    PLANOS.find((p) => p.plano === this.planoContratado()),
  );
  protected readonly slots = computed(
    () => this.profile()?.slotsAdicionaisComprados ?? 0,
  );
  protected readonly isPhd = computed(() => this.planoContratado() === 'PHD');

  protected readonly inadimplente = computed(
    () => this.profile()?.statusAssinatura === 'INADIMPLENTE',
  );

  /** Vencimento formatado (dd/mm/aaaa), quando há assinatura paga. */
  protected readonly assinaturaAte = computed(() => {
    const iso = this.profile()?.assinaturaAte;
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('pt-BR');
  });

  /** Renova o plano contratado (leva à tela de pagamento). */
  protected renovar(): void {
    this.router.navigate(['/checkout'], {
      queryParams: { tipo: 'upgrade', plano: this.planoContratado() },
    });
  }

  protected readonly cupom = signal('');
  protected readonly aplicando = signal(false);
  protected readonly cupomMsg = signal<string | null>(null);
  protected readonly cupomErro = signal(false);

  protected aplicar(): void {
    const codigo = this.cupom().trim();
    if (!codigo) return;
    this.aplicando.set(true);
    this.cupomMsg.set(null);
    this.profileService.aplicarCupom(codigo).subscribe({
      next: () => {
        this.aplicando.set(false);
        this.cupomErro.set(false);
        this.cupomMsg.set('Cupom aplicado com sucesso!');
        this.cupom.set('');
      },
      error: () => {
        this.aplicando.set(false);
        this.cupomErro.set(true);
        this.cupomMsg.set('Cupom inválido, inativo ou esgotado.');
      },
    });
  }

  constructor() {
    if (this.profile()) {
      this.carregando.set(false);
    } else {
      this.profileService.load().subscribe({
        next: () => this.carregando.set(false),
        error: () => this.carregando.set(false),
      });
    }
  }
}
