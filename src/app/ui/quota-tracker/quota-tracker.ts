import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { QuotaService } from '../../core/quota.service';
import { ProfileService } from '../../core/profile.service';
import { NOME_PLANO } from '../../core/plano.util';

/**
 * Rodape do menu lateral: mostra o consumo de cota do plano
 * ("Turmas ativas: 2/5") com uma barrinha de uso.
 */
@Component({
  selector: 'app-quota-tracker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="quota">
      <div class="quota__top">
        <span class="quota__label">Turmas ativas</span>
        <span class="quota__plano">{{ nomePlano() }}</span>
      </div>
      @if (quota.ilimitado()) {
        <span class="quota__count">Ilimitadas</span>
      } @else {
        <span class="quota__count" [class.quota__count--full]="quota.noLimite()">
          {{ quota.ativas() }}/{{ quota.limite() }}
        </span>
        <div class="quota__bar">
          <div class="quota__fill" [style.width.%]="pct()"></div>
        </div>
      }
    </div>
  `,
  styles: `
    .quota {
      padding: 0.875rem 1rem;
      border-top: 1px solid var(--border);
    }
    .quota__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .quota__label {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .quota__plano {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--primary);
    }
    .quota__count {
      display: block;
      margin-top: 0.25rem;
      font-size: 1.25rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }
    .quota__count--full {
      color: var(--danger);
    }
    .quota__bar {
      margin-top: 0.5rem;
      height: 6px;
      border-radius: 999px;
      background: var(--surface-alt);
      overflow: hidden;
    }
    .quota__fill {
      height: 100%;
      border-radius: 999px;
      background: var(--primary);
      transition: width 0.3s ease;
    }
  `,
})
export class QuotaTracker implements OnInit {
  protected readonly quota = inject(QuotaService);
  private readonly profileService = inject(ProfileService);

  ngOnInit(): void {
    if (!this.profileService.profile()) {
      this.profileService.load().subscribe();
    }
    this.quota.refresh().subscribe();
  }

  protected nomePlano(): string {
    return NOME_PLANO[this.profileService.profile()?.planoAtual ?? 'ESTAGIARIO'];
  }

  protected pct(): number {
    const limite = this.quota.limite();
    if (!isFinite(limite) || limite === 0) {
      return 0;
    }
    return Math.min(100, (this.quota.ativas() / limite) * 100);
  }
}
