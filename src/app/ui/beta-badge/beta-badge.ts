import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Icon } from '../icon/icon';
import { Modal } from '../modal/modal';

/**
 * Selo "Beta" do header: sinaliza que recursos experimentais (ex.: equipes)
 * podem conter bugs e que seus dados podem ser perdidos. O "i" abre um modal
 * puramente informativo — sem opção de sair da Beta por enquanto.
 */
@Component({
  selector: 'app-beta-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Modal],
  template: `
    <button class="badge" type="button" (click)="aberto.set(true)">
      <span class="badge__txt">Beta</span>
      <span class="badge__i" aria-hidden="true"><app-icon name="info" [size]="14" /></span>
    </button>

    <app-modal
      [open]="aberto()"
      title="Recurso em Beta"
      (close)="aberto.set(false)"
    >
      <p class="aviso">
        Você está usando recursos <strong>em Beta</strong> (como a gestão de
        equipes). Eles ainda estão em desenvolvimento e <strong>podem conter
        bugs</strong> ou mudar sem aviso.
      </p>
      <p class="aviso">
        Ao encerrar a Beta, <strong>os dados criados durante a Beta podem ser
        perdidos</strong>. Evite depender deles para algo definitivo.
      </p>
      <div modal-actions>
        <button class="btn-primary" type="button" (click)="aberto.set(false)">
          Entendi
        </button>
      </div>
    </app-modal>
  `,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.25rem 0.55rem;
      font: inherit;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: var(--primary);
      background: color-mix(in srgb, var(--primary) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--primary) 45%, transparent);
      border-radius: 999px;
      cursor: pointer;
    }
    .badge__i { display: inline-flex; line-height: 0; opacity: 0.85; }
    .aviso { margin: 0 0 0.75rem; color: var(--text); }
    .aviso:last-of-type { margin-bottom: 0; }
  `,
})
export class BetaBadge {
  protected readonly aberto = signal(false);
}
