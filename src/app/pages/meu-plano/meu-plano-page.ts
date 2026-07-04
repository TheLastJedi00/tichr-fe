import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NOME_PLANO } from '../../core/plano.util';
import { ProfileService } from '../../core/profile.service';
import { Card } from '../../ui/card/card';
import { Spinner } from '../../ui/spinner/spinner';

/** Meu Plano: resumo da assinatura + atalho para a gestão do plano. */
@Component({
  selector: 'app-meu-plano-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, Spinner],
  template: `
    <a class="voltar" routerLink="/configuracoes">‹ Configurações</a>
    <h1 class="title">Meu Plano</h1>

    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else {
      <app-card title="Assinatura">
        <div class="assinatura">
          <div>
            <span class="assinatura__label">Plano atual</span>
            <strong class="assinatura__plano">{{ planoLabel() }}</strong>
          </div>
          <a class="btn-primary" routerLink="/planos">Gerenciar plano</a>
        </div>
      </app-card>
    }
  `,
  styles: `
    .voltar { display: inline-block; margin-bottom: 0.5rem; color: var(--text-muted); text-decoration: none; font-weight: 600; }
    .voltar:hover { color: var(--primary); }
    .title { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 700; }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .assinatura { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .assinatura__label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
    .assinatura__plano { font-size: 1.15rem; font-weight: 800; }
    .assinatura .btn-primary { text-decoration: none; }
  `,
})
export class MeuPlanoPage {
  private readonly profileService = inject(ProfileService);

  protected readonly profile = this.profileService.profile;
  protected readonly carregando = signal(true);

  protected readonly planoLabel = computed(
    () => NOME_PLANO[this.profile()?.planoAtual ?? 'ESTAGIARIO'],
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
