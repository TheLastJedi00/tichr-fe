import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { CriarTurmaPayload, PlanoAtual } from '../../core/models';
import { NOME_PLANO } from '../../core/plano.util';
import { ProfileService } from '../../core/profile.service';
import { TurmaApiService } from '../../core/turma-api.service';
import { UpsellCard } from '../../ui/upsell-card/upsell-card';
import { TurmaForm } from '../turma-form/turma-form';

/**
 * NovaTurmaPage: cria uma turma reusando o <app-turma-form>. Se o backend
 * barrar por cota (403 LIMIT_REACHED), oculta o formulario e mostra o
 * <app-upsell-card>; ao comprar vaga/fazer upgrade, retenta o cadastro.
 */
@Component({
  selector: 'app-nova-turma-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TurmaForm, UpsellCard, RouterLink],
  template: `
    <a class="voltar" routerLink="/turmas">‹ Minhas turmas</a>
    <h1 class="title">Nova turma</h1>

    @if (bloqueado()) {
      <app-upsell-card
        titulo="Limite de turmas atingido"
        [mensagem]="mensagemUpsell()"
        [labelUpgrade]="labelUpgrade()"
        [processando]="salvando()"
        (comprarSlot)="comprarSlot()"
        (conhecerPlano)="fazerUpgrade()"
      />
    } @else {
      <app-turma-form
        submitLabel="Criar turma"
        [submitting]="salvando()"
        (save)="criar($event)"
      />
    }
  `,
  styles: `
    .voltar { display: inline-block; margin-bottom: 0.75rem; color: var(--text-muted); text-decoration: none; font-weight: 600; }
    .title { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 700; }
  `,
})
export class NovaTurmaPage {
  private readonly api = inject(TurmaApiService);
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);

  protected readonly salvando = signal(false);
  protected readonly bloqueado = signal(false);

  /** Proximo nivel a oferecer no upsell, conforme o plano atual. */
  private readonly planoAlvo = computed<PlanoAtual>(() =>
    this.profileService.profile()?.planoAtual === 'ESTAGIARIO'
      ? 'GRADUADO'
      : 'MESTRE',
  );

  protected readonly labelUpgrade = computed(
    () => `Conhecer plano ${NOME_PLANO[this.planoAlvo()]}`,
  );

  protected readonly mensagemUpsell = computed(
    () =>
      `Seu plano ${NOME_PLANO[this.profileService.profile()?.planoAtual ?? 'ESTAGIARIO']} chegou ao limite de turmas ativas. Libere uma vaga avulsa ou suba de nível para continuar.`,
  );

  protected criar(payload: CriarTurmaPayload): void {
    this.salvando.set(true);
    this.api.criarTurma(payload).subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: (err: HttpErrorResponse) => {
        this.salvando.set(false);
        if (err.status === 403 && err.error?.code === 'LIMIT_REACHED') {
          this.bloqueado.set(true);
        }
      },
    });
  }

  /** Leva à tela de pagamento para comprar uma vaga avulsa. */
  protected comprarSlot(): void {
    this.router.navigate(['/checkout'], { queryParams: { tipo: 'slot' } });
  }

  /** Leva à tela de pagamento para subir de plano. */
  protected fazerUpgrade(): void {
    this.router.navigate(['/checkout'], {
      queryParams: { tipo: 'upgrade', plano: this.planoAlvo() },
    });
  }
}
