import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
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
            <p>Planos superiores liberam gamificação, dinâmicas, Tichr Qlick e turmas ilimitadas.</p>
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

      <p class="cobranca">
        Gestão de cobrança e notas fiscais chegam em breve. Por enquanto, as trocas de plano
        são aplicadas na hora, sem cartão.
      </p>
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
    app-card + app-card { display: block; margin-top: 1rem; }
  `,
})
export class MeuPlanoPage {
  private readonly profileService = inject(ProfileService);

  protected readonly profile = this.profileService.profile;
  protected readonly carregando = signal(true);

  protected readonly planoLabel = computed(
    () => NOME_PLANO[this.profile()?.planoAtual ?? 'ESTAGIARIO'],
  );
  protected readonly plano = computed(() => {
    const atual = this.profile()?.planoAtual ?? 'ESTAGIARIO';
    return PLANOS.find((p) => p.plano === atual);
  });
  protected readonly slots = computed(
    () => this.profile()?.slotsAdicionaisComprados ?? 0,
  );
  protected readonly isPhd = computed(
    () => this.profile()?.planoAtual === 'PHD',
  );

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
